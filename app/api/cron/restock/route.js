import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail, backInStockHtml } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Notifies shoppers when a sold-out variant they asked about is available again.
// Triggered by Vercel Cron (which sends Authorization: Bearer $CRON_SECRET).
function authorized(req) {
  if (!process.env.CRON_SECRET) return true; // allow until a secret is configured
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://jilbab.store';

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminDb) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  const snap = await adminDb.collection('restock_requests').where('notified', '==', false).limit(200).get();
  const productCache = new Map();
  let notified = 0, stillOut = 0;

  for (const docSnap of snap.docs) {
    const r = docSnap.data();
    try {
      let product = productCache.get(r.productId);
      if (!product) {
        const p = await adminDb.collection('products').doc(r.productId).get();
        product = p.exists ? p.data() : null;
        productCache.set(r.productId, product);
      }
      if (!product) { await docSnap.ref.update({ notified: true, reason: 'product_gone' }).catch(() => {}); continue; }

      const variants = product.variants || [];
      const match = variants.filter(v => {
        if (r.sku) return v.sku === r.sku;
        if (r.size) return v.size === r.size && (!r.color || (v.color || '') === r.color);
        return true;
      });
      const available = (match.length ? match : variants)
        .some(v => (Number(v.stock) || 0) - (Number(v.reserved) || 0) > 0);

      if (!available) { stillOut++; continue; }

      const url = `${SITE}/product/${r.productId}`;
      if (r.email) {
        await sendEmail({ to: r.email, subject: `عاد المنتج للتوفّر — ${product.title || ''}`, html: backInStockHtml({ productTitle: product.title, size: r.size, color: r.color, url }) }).catch(() => {});
      }
      if (r.phone) {
        await sendSms(r.phone, `${product.title || 'المنتج'} عاد للتوفّر الآن! اطلبيه قبل النفاد: ${url}`).catch(() => {});
      }
      await docSnap.ref.update({ notified: true, notifiedAt: new Date().toISOString() }).catch(() => {});
      notified++;
    } catch (e) {
      console.error('restock cron item failed:', e?.message);
    }
  }

  return NextResponse.json({ ok: true, scanned: snap.size, notified, stillOut });
}
