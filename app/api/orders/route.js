import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { sendEmail, orderConfirmationHtml, lowStockAlertHtml } from '@/lib/email';

// Authoritative order creation. The client may send item ids/sizes/quantities,
// but ALL money (prices, discount, shipping, total) is recomputed here from
// Firestore, promos are re-validated (incl. usage limits), and stock is
// reserved atomically. The client total is ignored.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export async function POST(req) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Rate limit: max 10 order attempts / minute / IP.
    const rl = rateLimit(`orders:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: 'محاولات كثيرة، حاول بعد قليل' }, { status: 429 });
    }

    const body = await req.json();
    const { items, customerInfo = {}, promoCode, paymentMethod } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items' }, { status: 400 });
    }
    if (!['cash', 'paypal'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Resolve the customer uid from a verified token (never trust a client uid).
    let uid = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ') && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
        uid = decoded.uid;
      } catch { /* treat as guest */ }
    }

    // --- Pre-validate the promo BEFORE reserving stock (so a bad promo doesn't
    // leave stock reserved). Returns { ref, value, type } or throws a 400. ---
    let promo = null;
    if (promoCode && typeof promoCode === 'string') {
      const snap = await adminDb.collection('promocodes')
        .where('code', '==', promoCode.toUpperCase().trim()).limit(1).get();
      if (snap.empty) {
        return NextResponse.json({ error: 'كود الخصم غير صالح' }, { status: 400 });
      }
      const doc = snap.docs[0];
      const p = doc.data();
      if (p.active === false) return NextResponse.json({ error: 'كود الخصم غير مفعّل' }, { status: 400 });
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) return NextResponse.json({ error: 'كود الخصم منتهي الصلاحية' }, { status: 400 });
      if (p.usageLimit && (Number(p.usageCount) || 0) >= Number(p.usageLimit)) {
        return NextResponse.json({ error: 'تم استنفاد كود الخصم' }, { status: 400 });
      }
      // Per-customer + first-order checks (logged-in customers only).
      if (uid && (p.firstOrderOnly || p.perCustomerLimit)) {
        const prior = await adminDb.collection('orders').where('uid', '==', uid).get();
        if (p.firstOrderOnly && prior.size > 0) {
          return NextResponse.json({ error: 'هذا الكود لأول طلب فقط' }, { status: 400 });
        }
        if (p.perCustomerLimit) {
          const used = prior.docs.filter(d => (d.data().promoCode || '').toUpperCase() === p.code.toUpperCase()).length;
          if (used >= Number(p.perCustomerLimit)) {
            return NextResponse.json({ error: 'لقد استخدمت هذا الكود من قبل' }, { status: 400 });
          }
        }
      }
      promo = {
        ref: doc.ref,
        code: p.code,
        value: Number(p.discountValue ?? p.value ?? 0),
        type: (p.type === 'percentage' ? 'percent' : p.type) || 'fixed'
      };
    }

    // Strip card fields if any slipped through (PCI).
    const { cardNumber, expiry, cvv, ...safeCustomerInfo } = customerInfo;

    // --- Recompute subtotal from authoritative prices + reserve stock ---
    const orderItems = [];
    let lowStockHits = [];
    const result = await adminDb.runTransaction(async (tx) => {
      const reads = [];
      for (const item of items) {
        if (!item.id) throw new Error('Invalid item');
        const ref = adminDb.collection('products').doc(item.id);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error('Product no longer available');
        reads.push({ ref, snap, item });
      }

      let subtotal = 0;
      const hits = [];
      orderItems.length = 0;
      for (const { ref, snap, item } of reads) {
        const data = snap.data();
        const price = Number(data.price) || 0;
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const variants = [...(data.variants || [])];

        if (variants.length > 0 && item.selectedSize) {
          const idx = variants.findIndex(v => v.sku === item.sku || v.size === item.selectedSize);
          if (idx === -1) throw new Error(`Variant unavailable for ${data.title}`);
          const stock = Number(variants[idx].stock) || 0;
          const reserved = Number(variants[idx].reserved) || 0;
          if (stock - reserved < qty) {
            throw new Error(`Out of stock: ${data.title} (${item.selectedSize}). Available: ${stock - reserved}`);
          }
          variants[idx] = { ...variants[idx], reserved: reserved + qty };
          tx.update(ref, { variants });
          const remaining = stock - (reserved + qty);
          if (remaining <= (Number(data.lowStockThreshold) || 5)) {
            hits.push({ title: data.title, size: variants[idx].size, available: remaining });
          }
        }

        subtotal += price * qty;
        orderItems.push({
          id: item.id,
          title: data.title,
          price,
          quantity: qty,
          selectedSize: item.selectedSize || 'عام',
          selectedColor: item.selectedColor || '',
          sku: (variants.find(v => v.sku === item.sku || v.size === item.selectedSize) || {}).sku || null,
          image: data.images?.[0] || item.image || null
        });
      }
      return { subtotal: round2(subtotal), hits };
    });

    const subtotal = result.subtotal;
    lowStockHits = result.hits;

    // --- Discount from the pre-validated promo ---
    let discount = 0;
    let appliedPromo = null;
    if (promo) {
      discount = promo.type === 'percent' ? subtotal * (promo.value / 100) : promo.value;
      discount = round2(Math.min(discount, subtotal));
      appliedPromo = promo.code;
    }

    // --- Shipping from store settings ---
    const settingsSnap = await adminDb.collection('store_settings').doc('main_settings').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const freeShippingThreshold = Number(settings.freeShippingThreshold) || 250;
    const shippingCost = Number(settings.shippingCost) || 30;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const shipping = discountedSubtotal >= freeShippingThreshold ? 0 : shippingCost;
    const total = round2(discountedSubtotal + shipping);

    const orderStatus = paymentMethod === 'cash'
      ? 'قيد المعالجة (الدفع عند الاستلام)'
      : 'قيد المعالجة (بانتظار الدفع عبر PayPal)';

    const orderDoc = {
      date: new Date().toISOString(),
      uid,
      customerInfo: { ...safeCustomerInfo },
      items: orderItems,
      subtotal, discount, promoCode: appliedPromo, shipping, total,
      paymentMethod, status: orderStatus, stockState: 'reserved',
      createdAt: new Date().toISOString()
    };

    const orderRef = await adminDb.collection('orders').add(orderDoc);

    // Increment promo usage (atomic).
    if (promo) promo.ref.update({ usageCount: FieldValue.increment(1) }).catch(() => {});

    // Audit movements (best-effort).
    for (const it of orderItems) {
      if (!it.sku) continue;
      adminDb.collection('stock_movements').add({
        productId: it.id, sku: it.sku, size: it.selectedSize, title: it.title,
        delta: 0, reservedDelta: it.quantity, reason: 'reserve', orderId: orderRef.id,
        by: uid || 'guest', at: new Date().toISOString()
      }).catch(() => {});
    }

    // Order confirmation email to the customer (best-effort).
    const customerEmail = safeCustomerInfo.email;
    if (customerEmail) {
      sendEmail({
        to: customerEmail,
        subject: `تأكيد الطلب #${orderRef.id.slice(0, 8).toUpperCase()} — Jilbab Store`,
        html: orderConfirmationHtml(orderDoc, orderRef.id)
      }).catch(() => {});
    }

    // Low-stock alert to the operator (if an alert email is configured).
    if (lowStockHits.length && settings.alertEmail) {
      sendEmail({
        to: settings.alertEmail,
        subject: `⚠️ تنبيه مخزون منخفض (${lowStockHits.length})`,
        html: lowStockAlertHtml(lowStockHits)
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true, orderId: orderRef.id,
      subtotal, discount, shipping, total, promoCode: appliedPromo
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 400 });
  }
}
