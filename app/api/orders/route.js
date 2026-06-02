import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// Authoritative order creation. The client may send item ids/sizes/quantities,
// but ALL money (prices, discount, shipping, total) is recomputed here from
// Firestore, and stock is reserved atomically. The client total is ignored.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export async function POST(req) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
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

    // Optional: resolve the customer uid from a verified token (never trust a
    // client-supplied uid).
    let uid = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ') && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
        uid = decoded.uid;
      } catch { /* treat as guest */ }
    }

    // Strip card fields if any slipped through (PCI).
    const { cardNumber, expiry, cvv, ...safeCustomerInfo } = customerInfo;

    // --- Recompute subtotal from authoritative product prices + reserve stock ---
    const orderItems = [];
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
      const lowStockHits = [];
      for (const { ref, snap, item } of reads) {
        const data = snap.data();
        const price = Number(data.price) || 0;
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const variants = [...(data.variants || [])];

        // Reserve a variant if the product has variants and a size was chosen.
        if (variants.length > 0 && item.selectedSize) {
          const idx = variants.findIndex(v => v.sku === item.sku || v.size === item.selectedSize);
          if (idx === -1) throw new Error(`Variant unavailable for ${data.title}`);
          const stock = Number(variants[idx].stock) || 0;
          const reserved = Number(variants[idx].reserved) || 0;
          const available = stock - reserved;
          if (available < qty) {
            throw new Error(`Out of stock: ${data.title} (${item.selectedSize}). Available: ${available}`);
          }
          variants[idx] = { ...variants[idx], reserved: reserved + qty };
          tx.update(ref, { variants });
          if (stock - (reserved + qty) <= (Number(data.lowStockThreshold) || 5)) {
            lowStockHits.push({ title: data.title, size: variants[idx].size, available: stock - (reserved + qty) });
          }
        }

        subtotal += price * qty;
        orderItems.push({
          id: item.id,
          title: data.title,
          price,
          quantity: qty,
          selectedSize: item.selectedSize || 'عام',
          sku: (variants.find(v => v.sku === item.sku || v.size === item.selectedSize) || {}).sku || null,
          image: data.images?.[0] || item.image || null
        });
      }
      return { subtotal: round2(subtotal), lowStockHits };
    });

    let { subtotal } = result;

    // --- Promo (re-validated server-side) ---
    let discount = 0;
    let appliedPromo = null;
    if (promoCode && typeof promoCode === 'string') {
      const snap = await adminDb.collection('promocodes')
        .where('code', '==', promoCode.toUpperCase().trim()).limit(1).get();
      if (!snap.empty) {
        const promo = snap.docs[0].data();
        const expired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
        if (promo.active !== false && !expired) {
          const value = Number(promo.discountValue ?? promo.value ?? 0);
          const type = (promo.type === 'percentage' ? 'percent' : promo.type) || 'fixed';
          discount = type === 'percent' ? subtotal * (value / 100) : value;
          discount = round2(Math.min(discount, subtotal));
          appliedPromo = promo.code;
        }
      }
    }

    // --- Shipping (from store settings) ---
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
      subtotal,
      discount,
      promoCode: appliedPromo,
      shipping,
      total,
      paymentMethod,
      status: orderStatus,
      stockState: 'reserved',
      createdAt: new Date().toISOString()
    };

    const orderRef = await adminDb.collection('orders').add(orderDoc);

    // Audit: one movement per reserved variant.
    for (const it of orderItems) {
      if (!it.sku) continue;
      adminDb.collection('stock_movements').add({
        productId: it.id, sku: it.sku, size: it.selectedSize, title: it.title,
        delta: 0, reservedDelta: it.quantity, reason: 'reserve', orderId: orderRef.id,
        by: uid || 'guest', at: new Date().toISOString()
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      subtotal, discount, shipping, total,
      promoCode: appliedPromo
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 400 });
  }
}
