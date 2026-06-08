import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';

// Lets a courier/operator flag a delivery problem (couldn't deliver, customer
// not answering, wrong address, missing/damaged item, refused, …). Couriers may
// only write `status` under Firestore rules, so this runs via the Admin SDK
// after verifying the caller is staff. The issue is appended to the order and
// the store owner is notified.
async function requireStaff(req) {
  if (!adminAuth || !adminDb) return { error: 'Server not configured', status: 500 };
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(h.split('Bearer ')[1]);
    const snap = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!snap.exists) return { error: 'Forbidden', status: 403 };
    return { uid: decoded.uid, name: snap.data().name || snap.data().email || 'مندوب' };
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

export async function POST(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { orderId, reason, note } = await req.json().catch(() => ({}));
  if (!orderId || !reason) return NextResponse.json({ error: 'orderId and reason required' }, { status: 400 });

  const issue = { reason: String(reason).slice(0, 120), note: String(note || '').slice(0, 600), by: auth.name, at: new Date().toISOString() };
  const orderRef = adminDb.collection('orders').doc(orderId);

  try {
    const snap = await orderRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    await orderRef.update({ deliveryIssues: FieldValue.arrayUnion(issue), hasDeliveryIssue: true });

    // Notify the store owner so they can act.
    const settingsSnap = await adminDb.collection('store_settings').doc('main_settings').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const owner = settings.alertEmail || settings.contactEmail;
    if (owner) {
      const o = snap.data();
      const num = orderId.slice(0, 8).toUpperCase();
      sendEmail({
        to: owner,
        subject: `⚠️ مشكلة في التوصيل — طلب #${num}`,
        html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;padding:16px;">
          <h2 style="color:#c0392b;">⚠️ بلاغ من المندوب</h2>
          <p><strong>الطلب:</strong> #${num} — ${o.customerInfo?.fullName || ''}</p>
          <p><strong>المندوب:</strong> ${issue.by}</p>
          <p><strong>المشكلة:</strong> ${issue.reason}</p>
          ${issue.note ? `<p><strong>ملاحظة:</strong> ${issue.note}</p>` : ''}
          <p><strong>الهاتف:</strong> ${o.customerInfo?.phone || o.customerInfo?.phone1 || ''}</p>
        </div>`
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('report issue failed:', e?.message);
    return NextResponse.json({ error: 'Failed to report' }, { status: 400 });
  }
}
