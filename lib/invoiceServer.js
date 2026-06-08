import { adminDb } from '@/lib/firebaseAdmin';
import { invoiceHtml } from '@/lib/invoice';
import { sendEmail } from '@/lib/email';

// Atomically allocate the next gap-less sequential invoice number to an order
// (idempotent — re-issuing returns the existing number). Israeli bookkeeping
// requires sequential, non-repeating numbering, so this runs in a transaction
// against a single counter document.
export async function allocateInvoiceNumber(orderId) {
  return adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error('order not found');
    const o = orderSnap.data();
    if (o.invoiceNumber) {
      return { number: o.invoiceNumber, issuedAt: o.invoiceIssuedAt, order: o, alreadyIssued: true };
    }
    const counterRef = adminDb.collection('counters').doc('invoices');
    const counterSnap = await tx.get(counterRef);
    const last = counterSnap.exists ? (Number(counterSnap.data().last) || 0) : 0;
    const next = last + 1;
    const issuedAt = new Date().toISOString();
    tx.set(counterRef, { last: next, updatedAt: issuedAt }, { merge: true });
    tx.update(orderRef, { invoiceNumber: next, invoiceIssuedAt: issuedAt });
    return { number: next, issuedAt, order: { ...o, invoiceNumber: next, invoiceIssuedAt: issuedAt }, alreadyIssued: false };
  });
}

async function getSettings() {
  const snap = await adminDb.collection('store_settings').doc('main_settings').get();
  return snap.exists ? snap.data() : {};
}

// Issue (allocate number for) an order's tax document, and optionally email the
// customer their copy (העתק) and/or the store owner their original (מקור).
// Best-effort, safe to call more than once (number allocation is idempotent).
export async function issueInvoice(orderId, { emailCopy = false, emailOwner = true } = {}) {
  if (!adminDb) return null;
  try {
    const { order, number, issuedAt, alreadyIssued } = await allocateInvoiceNumber(orderId);
    const settings = await getSettings();
    const isPatur = settings.businessType === 'osek_patur';
    const numStr = `${settings.invoicePrefix || ''}${String(number).padStart(5, '0')}`;
    const docName = isPatur ? 'קבלה' : 'חשבונית מס/קבלה';

    if (emailCopy) {
      const email = order.customerInfo?.email || order.shipping?.email;
      if (email) {
        const html = invoiceHtml({ ...order, id: orderId }, settings, { copy: 'copy' });
        await sendEmail({ to: email, subject: `${docName} ${numStr} — ${settings.storeName || 'JILBABSTORE'}`, html }).catch(() => {});
      }
    }
    // Email the original (מקור) to the store owner for their records (once).
    if (emailOwner && !alreadyIssued) {
      const owner = settings.alertEmail || settings.contactEmail;
      if (owner) {
        const html = invoiceHtml({ ...order, id: orderId }, settings, { copy: 'original' });
        await sendEmail({ to: owner, subject: `🧾 ${docName} ${numStr} — ${order.customerInfo?.fullName || 'عميل'}`, html }).catch(() => {});
      }
    }
    return { number, issuedAt };
  } catch (e) {
    console.error('issueInvoice failed:', e?.message);
    return null;
  }
}
