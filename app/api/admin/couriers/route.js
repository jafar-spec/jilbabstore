import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// Verify the caller is an authenticated staff member who is NOT a courier
// (i.e. an operator/admin). Returns { uid } on success or { error, status }.
async function requireAdmin(req) {
  if (!adminAuth || !adminDb) {
    return { error: 'Server not configured', status: 500 };
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized: missing token', status: 401 };
  }
  const token = authHeader.split('Bearer ')[1];
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return { error: 'Unauthorized: invalid token', status: 401 };
  }
  const snap = await adminDb.collection('admins').doc(decoded.uid).get();
  if (!snap.exists || snap.data().role === 'courier') {
    return { error: 'Forbidden: operator access required', status: 403 };
  }
  return { uid: decoded.uid };
}

// GET — list all couriers
export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const snap = await adminDb.collection('admins').where('role', '==', 'courier').get();
  const couriers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  return NextResponse.json({ couriers });
}

// POST — create (or promote) a courier { email, password, name }
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { email, password, name } = await req.json();
  if (!email || !password || String(password).length < 6) {
    return NextResponse.json({ error: 'البريد الإلكتروني وكلمة مرور (٦ أحرف على الأقل) مطلوبان' }, { status: 400 });
  }

  try {
    let userRecord;
    try {
      // Promote an existing account if the email is already registered.
      userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, { password, emailVerified: true });
    } catch {
      userRecord = await adminAuth.createUser({ email, password, emailVerified: true });
    }

    await adminDb.collection('admins').doc(userRecord.uid).set(
      { role: 'courier', email, name: name || '' },
      { merge: true }
    );

    return NextResponse.json({ success: true, uid: userRecord.uid, email });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل إنشاء حساب المندوب' }, { status: 500 });
  }
}

// DELETE — remove a courier { uid }
export async function DELETE(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { uid } = await req.json();
  if (!uid) return NextResponse.json({ error: 'uid مطلوب' }, { status: 400 });

  // Safety: only delete accounts that are actually couriers.
  const snap = await adminDb.collection('admins').doc(uid).get();
  if (!snap.exists || snap.data().role !== 'courier') {
    return NextResponse.json({ error: 'هذا الحساب ليس مندوباً' }, { status: 400 });
  }

  await adminDb.collection('admins').doc(uid).delete();
  try {
    await adminAuth.deleteUser(uid);
  } catch {
    // Auth user may already be gone; the admins doc removal is what revokes access.
  }

  return NextResponse.json({ success: true });
}
