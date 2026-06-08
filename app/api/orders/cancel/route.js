import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

// Customer self-service cancellation. Firestore rules forbid a customer writing
// an order doc directly, so this runs with the Admin SDK after verifying the
// caller's ID token actually OWNS the order (by uid, or by verified email for
// guest/pre-signup orders). Cancellation is only allowed while the order is
// still in processing and stock is merely *reserved* (not yet prepared/shipped).
// It atomically releases the reserved stock — mirroring the staff
// /api/orders/transition release path — so inventory never leaks.

const CANCELLABLE_PREFIX = 'قيد المعالجة';

export async function POST(req) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const rl = rateLimit(`cancel:${clientIp(req)}`, { limit: 12, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'محاولات كثيرة، حاول لاحقاً' }, { status: 429 });

    // Identify the caller from a verified token (never trust a client uid).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإلغاء الطلب' }, { status: 401 });
    }
    let token;
    try {
      token = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      return NextResponse.json({ error: 'انتهت الجلسة، سجّل الدخول مجدداً' }, { status: 401 });
    }

    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const orderRef = adminDb.collection('orders').doc(String(orderId).trim());
    const movements = [];

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw Object.assign(new Error('لم يتم العثور على الطلب'), { code: 404 });
      const order = snap.data();

      // Ownership: matching uid, or the caller's *verified* email matches the order.
      const ownsByUid = order.uid && order.uid === token.uid;
      const ownsByEmail = token.email_verified && token.email
        && order.customerInfo?.email && order.customerInfo.email === token.email;
      if (!ownsByUid && !ownsByEmail) {
        throw Object.assign(new Error('هذا الطلب لا يخصّ حسابك'), { code: 403 });
      }

      // Only cancellable while still processing with stock reserved.
      const state = order.stockState || 'reserved';
      const status = order.status || '';
      if (!status.startsWith(CANCELLABLE_PREFIX) || state !== 'reserved') {
        throw Object.assign(
          new Error('لا يمكن إلغاء هذا الطلب في حالته الحالية. تواصل معنا للمساعدة.'),
          { code: 409 }
        );
      }

      // Release reserved stock (reads before writes per transaction rules).
      const items = (order.items || []).filter(it => it.id);
      const reads = [];
      for (const item of items) {
        const ref = adminDb.collection('products').doc(item.id);
        reads.push({ ref, snap: await tx.get(ref), item });
      }
      const writes = [];
      for (const { ref, snap: pSnap, item } of reads) {
        if (!pSnap.exists) continue;
        const data = pSnap.data();
        const variants = [...(data.variants || [])];
        const idx = variants.findIndex(v => v.sku === item.sku || v.size === item.selectedSize);
        if (idx === -1) continue;
        const qty = Number(item.quantity) || 0;
        const reserved = Number(variants[idx].reserved) || 0;
        variants[idx] = { ...variants[idx], reserved: Math.max(0, reserved - qty) };
        writes.push({ ref, variants });
        movements.push({
          productId: item.id, sku: variants[idx].sku, size: variants[idx].size, title: data.title,
          delta: 0, reservedDelta: -qty, newStock: Number(variants[idx].stock) || 0,
          reason: 'release', orderId, by: token.uid, at: new Date().toISOString(),
        });
      }
      for (const w of writes) tx.update(w.ref, { variants: w.variants });

      tx.update(orderRef, {
        status: 'ملغي', stockState: 'released',
        cancelledAt: new Date().toISOString(), cancelledBy: 'customer',
      });

      return { order };
    });

    // Audit log (best-effort, outside the transaction).
    for (const m of movements) adminDb.collection('stock_movements').add(m).catch(() => {});

    // Notify the store owner so they stop any in-progress fulfilment.
    try {
      const settingsSnap = await adminDb.collection('store_settings').doc('main_settings').get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      const owner = settings.alertEmail || settings.contactEmail;
      const num = String(orderId).slice(0, 8).toUpperCase();
      if (owner) {
        sendEmail({
          to: owner,
          subject: `❌ إلغاء طلب من العميل — #${num}`,
          html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;padding:16px;">
            <h2 style="color:#c0392b;">تم إلغاء الطلب من قبل العميل</h2>
            <p><strong>الطلب:</strong> #${num} — ${result.order.customerInfo?.fullName || ''}</p>
            <p><strong>الإجمالي:</strong> ₪${(Number(result.order.total) || 0).toFixed(2)}</p>
            <p>تم تحرير المخزون المحجوز تلقائياً.</p>
          </div>`,
        }).catch(() => {});
      }
      // Confirmation to the customer.
      const custEmail = result.order.customerInfo?.email;
      if (custEmail) {
        sendEmail({
          to: custEmail,
          subject: `تأكيد إلغاء الطلب #${num} — Jilbab Store`,
          html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;padding:16px;">
            <h2>تم إلغاء طلبك بنجاح</h2>
            <p>طلبك رقم <strong>#${num}</strong> تم إلغاؤه. إذا كنت قد دفعت مسبقاً، سيتم رد المبلغ خلال أيام عمل قليلة.</p>
          </div>`,
        }).catch(() => {});
      }
    } catch { /* notifications are best-effort */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error.code === 404 || error.code === 403 || error.code === 409 ? error.code : 400;
    return NextResponse.json({ error: error.message || 'Cancellation failed' }, { status });
  }
}
