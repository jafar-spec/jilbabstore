import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/*
 * Payment gateway webhook — STUB.
 *
 * Wire your gateway's webhook here to confirm payments out-of-band (the reliable
 * source of truth). To go live:
 *   1. VERIFY THE SIGNATURE using the provider's signing secret (critical — do
 *      not trust unverified webhook bodies).
 *   2. On a successful payment event, mark the matching order paid:
 *        orders/{orderId} -> { paymentStatus: 'paid', chargeId, paidAt }
 *   3. Register this URL in your gateway dashboard.
 */
export async function POST(req) {
  if (!process.env.PAYMENT_PROVIDER || !process.env.PAYMENT_WEBHOOK_SECRET) {
    return NextResponse.json({ received: true, configured: false }, { status: 200 });
  }
  try {
    const event = await req.json();

    // TODO: verify signature, e.g. for Stripe:
    //   const sig = req.headers.get('stripe-signature');
    //   const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.PAYMENT_WEBHOOK_SECRET);

    const orderId = event?.data?.metadata?.orderId || event?.orderId;
    const paid = event?.type === 'payment_intent.succeeded' || event?.status === 'paid';
    if (orderId && paid && adminDb) {
      await adminDb.collection('orders').doc(orderId).set(
        { paymentStatus: 'paid', chargeId: event?.data?.id || event?.chargeId || null, paidAt: new Date().toISOString() },
        { merge: true }
      );
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
