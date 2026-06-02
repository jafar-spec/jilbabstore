import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// Verified-purchase reviews: only a signed-in customer who has actually ordered
// the product may review it. Written server-side via the Admin SDK.
export async function POST(req) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const rl = rateLimit(`reviews:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لكتابة تقييم' }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    const { productId, rating, text, name } = await req.json();
    const r = Math.round(Number(rating));
    if (!productId || !text || !(r >= 1 && r <= 5)) {
      return NextResponse.json({ error: 'بيانات التقييم غير مكتملة' }, { status: 400 });
    }

    // Must have an order containing this product.
    const orders = await adminDb.collection('orders').where('uid', '==', decoded.uid).get();
    const purchased = orders.docs.some(d => (d.data().items || []).some(it => it.id === productId));
    if (!purchased) {
      return NextResponse.json({ error: 'يمكن تقييم المنتجات التي اشتريتِها فقط' }, { status: 403 });
    }

    // One review per customer per product.
    const existing = await adminDb.collection('reviews')
      .where('productId', '==', productId).where('uid', '==', decoded.uid).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'لقد قمتِ بتقييم هذا المنتج من قبل' }, { status: 409 });
    }

    const review = {
      productId,
      uid: decoded.uid,
      name: (name || decoded.name || decoded.email?.split('@')[0] || 'عميل').slice(0, 60),
      text: String(text).slice(0, 1000),
      rating: r,
      verified: true,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    const ref = await adminDb.collection('reviews').add(review);
    return NextResponse.json({ success: true, id: ref.id, review });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'تعذّر حفظ التقييم' }, { status: 500 });
  }
}
