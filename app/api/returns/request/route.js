import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

// Guest / phone-only return request from the order-tracking page. Ownership is
// verified by matching the phone on the order (no login needed). Created via the
// Admin SDK so it lands in the same admin "طلبات الإرجاع" queue.
const digits = (s) => String(s || '').replace(/\D/g, '');
const last9 = (s) => digits(s).slice(-9);

export async function POST(req) {
  try {
    const rl = rateLimit(`return:${clientIp(req)}`, { limit: 8, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'محاولات كثيرة، حاول لاحقاً' }, { status: 429 });
    if (!adminDb) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    const { orderId, phone, reason } = await req.json().catch(() => ({}));
    if (!orderId || !phone) return NextResponse.json({ error: 'رقم الطلب ورقم الهاتف مطلوبان' }, { status: 400 });

    const snap = await adminDb.collection('orders').doc(String(orderId).trim()).get();
    if (!snap.exists) return NextResponse.json({ error: 'لم يتم العثور على الطلب' }, { status: 404 });
    const o = snap.data();

    // Verify the phone matches the order (tolerant of 0 / +972 formatting).
    const orderPhones = [o.customerInfo?.phone, o.customerInfo?.phone1, o.shipping?.phone, o.shipping?.phone1].filter(Boolean);
    const ok = orderPhones.some(p => last9(p) && last9(p) === last9(phone));
    if (!ok) return NextResponse.json({ error: 'رقم الهاتف لا يطابق هذا الطلب' }, { status: 403 });

    // Only delivered orders can be returned.
    if (o.status !== 'تم التوصيل') {
      return NextResponse.json({ error: 'يمكن طلب الإرجاع بعد توصيل الطلب فقط' }, { status: 400 });
    }

    // Prevent duplicate requests for the same order.
    const existing = await adminDb.collection('return_requests').where('orderId', '==', String(orderId).trim()).limit(1).get();
    if (!existing.empty) return NextResponse.json({ error: 'يوجد طلب إرجاع مسجّل لهذا الطلب بالفعل' }, { status: 409 });

    await adminDb.collection('return_requests').add({
      orderId: String(orderId).trim(),
      uid: o.uid || null,
      reason: String(reason || '').slice(0, 1000),
      items: (o.items || []).map(i => ({ title: i.title, quantity: i.quantity, sku: i.sku || null, selectedSize: i.selectedSize || '' })),
      status: 'pending',
      via: 'tracking',
      phone: String(phone).slice(0, 30),
      createdAt: new Date().toISOString(),
    });

    // Notify the owner.
    const settingsSnap = await adminDb.collection('store_settings').doc('main_settings').get();
    const owner = settingsSnap.exists ? (settingsSnap.data().alertEmail || settingsSnap.data().contactEmail) : null;
    if (owner) {
      sendEmail({
        to: owner,
        subject: `↩️ طلب إرجاع — #${String(orderId).slice(0, 8).toUpperCase()}`,
        html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;padding:16px;">
          <h2>طلب إرجاع جديد (من صفحة التتبع)</h2>
          <p><strong>الطلب:</strong> #${String(orderId).slice(0, 8).toUpperCase()} — ${o.customerInfo?.fullName || ''}</p>
          <p><strong>الهاتف:</strong> ${phone}</p>
          ${reason ? `<p><strong>السبب:</strong> ${String(reason).slice(0, 1000)}</p>` : ''}
        </div>`
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('guest return request failed:', e?.message);
    return NextResponse.json({ error: 'تعذّر إرسال الطلب' }, { status: 400 });
  }
}
