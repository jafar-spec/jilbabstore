import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';

// Staff-only return processing — closes the loop the request flow left open:
//   approve   → mark the request approved (awaiting the goods back)
//   reject    → decline the request
//   complete  → restock the returned items (idempotent), record the refund on
//               both the return and the order, and flip the order to مرتجع.
// Runs via the Admin SDK after verifying the caller is staff. The monetary
// refund is *recorded* here; for card/PayPal a gateway refund is wired later
// (cash/COD refunds are handled out-of-band), so this is the source of truth
// for "what was returned and how much was refunded".

async function requireStaff(req) {
  if (!adminAuth || !adminDb) return { error: 'Server not configured', status: 500 };
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(h.split('Bearer ')[1]);
    const snap = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!snap.exists) return { error: 'Forbidden', status: 403 };
    const role = snap.data().role || 'operator';
    if (role === 'courier') return { error: 'Forbidden', status: 403 };
    return { uid: decoded.uid, role };
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

export async function POST(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { returnId, action, refundAmount } = await req.json().catch(() => ({}));
  if (!returnId || !['approve', 'reject', 'complete'].includes(action)) {
    return NextResponse.json({ error: 'returnId and a valid action required' }, { status: 400 });
  }

  const retRef = adminDb.collection('return_requests').doc(String(returnId));
  const now = new Date().toISOString();

  try {
    const retSnap = await retRef.get();
    if (!retSnap.exists) return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    const ret = retSnap.data();

    if (action === 'reject') {
      await retRef.update({ status: 'rejected', processedAt: now, processedBy: auth.uid });
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    if (action === 'approve') {
      await retRef.update({ status: 'approved', processedAt: now, processedBy: auth.uid });
      // Best-effort heads-up to the customer that the return was approved.
      const orderSnap = await adminDb.collection('orders').doc(String(ret.orderId)).get().catch(() => null);
      const email = orderSnap?.exists ? orderSnap.data().customerInfo?.email : null;
      if (email) {
        sendEmail({
          to: email,
          subject: `تمت الموافقة على طلب الإرجاع — #${String(ret.orderId).slice(0, 8).toUpperCase()}`,
          html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;padding:16px;">
            <h2>تمت الموافقة على إرجاع طلبك</h2>
            <p>يرجى إعادة المنتجات وسنتولّى إتمام عملية الاسترداد فور استلامها.</p></div>`,
        }).catch(() => {});
      }
      return NextResponse.json({ success: true, status: 'approved' });
    }

    // action === 'complete' → restock + refund, atomically and idempotently.
    const orderRef = adminDb.collection('orders').doc(String(ret.orderId));
    const movements = [];
    let computedRefund = 0;

    const result = await adminDb.runTransaction(async (tx) => {
      const oSnap = await tx.get(orderRef);
      if (!oSnap.exists) throw Object.assign(new Error('الطلب غير موجود'), { code: 404 });
      const order = oSnap.data();
      const items = (order.items || []).filter(it => it.id);
      // Default to the full order total; allow an explicit partial override.
      computedRefund = refundAmount != null && refundAmount !== ''
        ? Math.max(0, Number(refundAmount) || 0)
        : Number(order.total) || 0;

      // Idempotent: only put stock back once.
      const alreadyReturned = order.stockState === 'returned' || ret.restocked === true;
      if (!alreadyReturned) {
        const reads = [];
        for (const item of items) {
          const ref = adminDb.collection('products').doc(item.id);
          reads.push({ ref, snap: await tx.get(ref), item });
        }
        const writes = [];
        for (const { ref, snap, item } of reads) {
          if (!snap.exists) continue;
          const data = snap.data();
          const variants = [...(data.variants || [])];
          const idx = variants.findIndex(v => v.sku === item.sku || v.size === item.selectedSize);
          if (idx === -1) continue;
          const qty = Number(item.quantity) || 0;
          const stock = Number(variants[idx].stock) || 0;
          variants[idx] = { ...variants[idx], stock: stock + qty };
          writes.push({ ref, variants });
          movements.push({
            productId: item.id, sku: variants[idx].sku, size: variants[idx].size, title: data.title,
            delta: qty, reservedDelta: 0, newStock: variants[idx].stock,
            reason: 'return', orderId: ret.orderId, by: 'staff', at: now,
          });
        }
        for (const w of writes) tx.update(w.ref, { variants: w.variants });
      }

      tx.update(orderRef, {
        status: 'مرتجع',
        stockState: 'returned',
        refund: { amount: computedRefund, status: 'refunded', method: order.paymentMethod || '', at: now, by: auth.uid },
      });
      return { order };
    });

    for (const m of movements) adminDb.collection('stock_movements').add(m).catch(() => {});

    await retRef.update({
      status: 'done', restocked: true, refundAmount: computedRefund,
      processedAt: now, processedBy: auth.uid,
    });

    // Notify the customer their refund was issued.
    const email = result.order.customerInfo?.email;
    if (email) {
      sendEmail({
        to: email,
        subject: `تم استرداد مبلغ طلبك #${String(ret.orderId).slice(0, 8).toUpperCase()} — Jilbab Store`,
        html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;padding:16px;">
          <h2>تمّ الاسترداد</h2>
          <p>تمت معالجة إرجاع طلبك رقم <strong>#${String(ret.orderId).slice(0, 8).toUpperCase()}</strong>.</p>
          <p><strong>مبلغ الاسترداد:</strong> ₪${computedRefund.toFixed(2)}</p>
          <p>قد يستغرق ظهور المبلغ في حسابك بضعة أيام عمل حسب وسيلة الدفع.</p></div>`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, status: 'done', refundAmount: computedRefund });
  } catch (error) {
    const status = error.code === 404 ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to process return' }, { status });
  }
}
