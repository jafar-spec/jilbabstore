import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { allocateInvoiceNumber } from '@/lib/invoiceServer';
import { invoiceHtml } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

// Returns the rendered tax document for an order. Staff get the מקור (Original);
// the order's owner gets the העתק (Copy). Allocates a sequential invoice number
// on first issue.
export async function POST(req) {
  if (!adminAuth || !adminDb) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await req.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const orderSnap = await adminDb.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const order = orderSnap.data();

  // Authorize: staff → original; order owner → copy.
  const staffSnap = await adminDb.collection('admins').doc(uid).get();
  const isStaff = staffSnap.exists;
  const isOwner = order.uid && order.uid === uid;
  if (!isStaff && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // A customer may only obtain the document once it has actually been issued
  // (payment received / delivered) — they can't trigger early issuance of a COD
  // invoice. Staff can issue at any time (their Original record).
  const issuable = order.invoiceNumber || order.paymentStatus === 'paid' || order.status === 'تم التوصيل';
  if (!isStaff && !issuable) {
    return NextResponse.json({ error: 'NotIssued' }, { status: 409 });
  }

  // Allocate the invoice number (idempotent).
  const { order: issued } = await allocateInvoiceNumber(orderId);

  const settingsSnap = await adminDb.collection('store_settings').doc('main_settings').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};

  const html = invoiceHtml({ ...issued, id: orderId }, settings, { copy: isStaff ? 'original' : 'copy' });
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
