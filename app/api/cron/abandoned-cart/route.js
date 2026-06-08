import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail, abandonedCartHtml } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Nudges logged-in shoppers who left items in their cart. A cart snapshot is
// written by CartContext and DELETED on checkout, so any lingering snapshot is
// an unconverted cart. We remind once, for carts idle 2h–3d.
function authorized(req) {
  if (!process.env.CRON_SECRET) return true;
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://jilbab.store';
const HOUR = 3600 * 1000;

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminDb) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  const now = Date.now();
  const snap = await adminDb.collection('abandoned_carts').where('reminded', '==', false).limit(200).get();
  let reminded = 0, tooFresh = 0, tooOld = 0;

  for (const docSnap of snap.docs) {
    const c = docSnap.data();
    try {
      const age = now - new Date(c.updatedAt || 0).getTime();
      if (age < 2 * HOUR) { tooFresh++; continue; }      // give them time to finish
      if (age > 72 * HOUR) { tooOld++; await docSnap.ref.update({ reminded: true, skipped: 'stale' }).catch(() => {}); continue; }
      if (!c.items || c.items.length === 0) { await docSnap.ref.delete().catch(() => {}); continue; }

      const url = `${SITE}/checkout`;
      if (c.email) {
        await sendEmail({ to: c.email, subject: 'سلتك بانتظارك في متجر جلباب 🛍️', html: abandonedCartHtml({ name: c.name, items: c.items, total: c.total, url }) }).catch(() => {});
      }
      if (c.phone) {
        await sendSms(c.phone, `سلتك ما زالت بانتظارك في متجر جلباب 🛍️ أكملي طلبك: ${url}`).catch(() => {});
      }
      await docSnap.ref.update({ reminded: true, remindedAt: new Date().toISOString() }).catch(() => {});
      reminded++;
    } catch (e) {
      console.error('abandoned-cart cron item failed:', e?.message);
    }
  }

  return NextResponse.json({ ok: true, scanned: snap.size, reminded, tooFresh, tooOld });
}
