import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendSms } from '@/lib/sms';

// Admin-only: send an SMS broadcast to newsletter subscribers who provided a
// phone number. Requires an operator/admin token.
async function requireAdmin(req) {
  if (!adminAuth || !adminDb) return { error: 'Server not configured', status: 500 };
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(h.split('Bearer ')[1]);
    const snap = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!snap.exists || snap.data().role === 'courier') return { error: 'Forbidden', status: 403 };
    return { uid: decoded.uid };
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { message } = await req.json().catch(() => ({}));
  if (!message || !String(message).trim()) {
    return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
  }
  if (!process.env.TWILIO_FROM) {
    return NextResponse.json({ error: 'لم يتم ضبط رقم Twilio المرسل' }, { status: 503 });
  }

  // Collect unique subscriber phone numbers.
  const snap = await adminDb.collection('newsletter_subscribers').get();
  const phones = [...new Set(snap.docs.map(d => d.data().phone).filter(Boolean))];
  if (phones.length === 0) {
    return NextResponse.json({ error: 'لا يوجد مشتركون لديهم أرقام هواتف', sent: 0, total: 0 }, { status: 200 });
  }

  let sent = 0, failed = 0;
  for (const phone of phones) {
    const res = await sendSms(phone, String(message).slice(0, 600));
    if (res?.ok) sent += 1; else failed += 1;
  }

  return NextResponse.json({ success: true, sent, failed, total: phones.length });
}
