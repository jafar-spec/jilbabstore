import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';

/*
 * Card charge — PROVIDER-AGNOSTIC STUB.
 *
 * The entire front end + order pipeline is ready; this is the one place to wire
 * a real gateway. It receives ONLY non-sensitive data (amount, currency, and a
 * gateway *token* once you tokenize the card client-side). It must NEVER receive
 * or store a raw card number.
 *
 * To go live:
 *   1. Set PAYMENT_PROVIDER (e.g. "stripe" | "creditguard") + provider keys in env.
 *   2. In CardForm, tokenize the card with the provider's SDK/hosted fields and
 *      pass the token here.
 *   3. Implement chargeWithProvider() below (create + confirm a payment), and
 *      verify completion via /api/payments/webhook.
 */

async function chargeWithProvider({ amount, currency, token }) {
  // TODO: implement with your gateway SDK. Example (Stripe):
  //   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  //   const intent = await stripe.paymentIntents.create({
  //     amount: Math.round(amount * 100), currency: currency.toLowerCase(),
  //     payment_method: token, confirm: true, automatic_payment_methods: { enabled: true },
  //   });
  //   return { ok: intent.status === 'succeeded', chargeId: intent.id, status: intent.status };
  throw new Error('not_implemented');
}

export async function POST(req) {
  const rl = rateLimit(`charge:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

  const { amount, currency = 'ILS', token } = await req.json().catch(() => ({}));

  if (!process.env.PAYMENT_PROVIDER) {
    // Front end is ready; backend pipeline not yet wired.
    return NextResponse.json(
      { success: false, configured: false, error: 'بوابة الدفع بالبطاقة قيد التفعيل' },
      { status: 503 }
    );
  }

  if (!(Number(amount) > 0)) {
    return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
  }

  try {
    const result = await chargeWithProvider({ amount: Number(amount), currency, token });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: 'Payment declined', status: result.status }, { status: 402 });
    }
    return NextResponse.json({ success: true, chargeId: result.chargeId });
  } catch (e) {
    console.error('Charge failed:', e);
    return NextResponse.json({ success: false, error: 'Payment processing error' }, { status: 500 });
  }
}
