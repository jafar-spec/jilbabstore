import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { orderId } = await request.json();

    if (!orderId || typeof orderId !== 'string' || orderId.length < 5 || orderId.length > 40) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const docSnap = await adminDb.collection('orders').doc(orderId.trim()).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const data = docSnap.data();

    // Return ONLY safe, non-sensitive tracking info — no full address, no phone
    return NextResponse.json({
      id: docSnap.id,
      status: data.status || 'قيد المعالجة',
      total: data.total,
      date: data.date,
      trackingId: data.trackingId || null,
      customerName: data.customerInfo?.fullName || data.shipping?.fullName || '',
      city: data.customerInfo?.city || data.shipping?.city || '',
      items: (data.items || []).map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        image: item.images?.[0] || item.image || ''
      }))
    });

  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
