import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.length < 2 || code.length > 30) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const snapshot = await adminDb.collection('promocodes')
      .where('code', '==', code.toUpperCase().trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ valid: false, error: 'Promo code not found' }, { status: 404 });
    }

    const promo = snapshot.docs[0].data();

    // Check if expired
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Promo code expired' }, { status: 410 });
    }

    // Check if disabled
    if (promo.active === false) {
      return NextResponse.json({ valid: false, error: 'Promo code is inactive' }, { status: 410 });
    }

    // Normalize field names (handle old promos stored with 'value' and 'percentage')
    const discountValue = promo.discountValue || promo.value || 0;
    const type = (promo.type === 'percentage' ? 'percent' : promo.type) || 'fixed';

    console.log('Promo found:', { code: promo.code, type, discountValue, raw: promo });

    return NextResponse.json({
      valid: true,
      code: promo.code,
      type: type,
      discountValue: Number(discountValue)
    });

  } catch (error) {
    console.error('Validate promo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
