import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// Staff-only order status transitions with atomic stock lifecycle.
//   reserved  → (delivered)  fulfill : stock -= qty, reserved -= qty
//   reserved  → (cancelled)  release : reserved -= qty
//   fulfilled → (cancelled)  return  : stock += qty
// Couriers may trigger transitions but cannot write product docs directly, so
// this runs with the Admin SDK after verifying the caller is staff.

const COURIER_ALLOWED = ['جاري التوصيل', 'تم التوصيل'];

async function requireStaff(req) {
  if (!adminAuth || !adminDb) return { error: 'Server not configured', status: 500 };
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const snap = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!snap.exists) return { error: 'Forbidden', status: 403 };
    const role = snap.data().role || 'operator';
    return { uid: decoded.uid, role };
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

const movement = (extra) => ({ at: new Date().toISOString(), by: 'staff', ...extra });

export async function POST(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { orderId, status } = await req.json();
  if (!orderId || !status) return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });

  // Couriers can only move orders along the delivery path.
  if (auth.role === 'courier' && !COURIER_ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'Forbidden status for courier' }, { status: 403 });
  }

  const orderRef = adminDb.collection('orders').doc(orderId);
  const movements = [];

  try {
    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) throw new Error('Order not found');
      const order = orderSnap.data();
      const items = (order.items || []).filter(it => it.id);
      const state = order.stockState || 'reserved';

      const fulfilling = status === 'تم التوصيل' && state === 'reserved';
      const cancelling = status === 'ملغي' && state !== 'released' && state !== 'returned';

      let productWrites = [];
      if (fulfilling || cancelling) {
        // Read all products first (transaction rule: reads before writes).
        const reads = [];
        for (const item of items) {
          const ref = adminDb.collection('products').doc(item.id);
          reads.push({ ref, snap: await tx.get(ref), item });
        }
        for (const { ref, snap, item } of reads) {
          if (!snap.exists) continue;
          const data = snap.data();
          const variants = [...(data.variants || [])];
          const idx = variants.findIndex(v => v.sku === item.sku || v.size === item.selectedSize);
          if (idx === -1) continue;
          const qty = Number(item.quantity) || 0;
          const stock = Number(variants[idx].stock) || 0;
          const reserved = Number(variants[idx].reserved) || 0;

          if (fulfilling) {
            variants[idx] = { ...variants[idx], stock: Math.max(0, stock - qty), reserved: Math.max(0, reserved - qty) };
            movements.push(movement({ productId: item.id, sku: variants[idx].sku, size: variants[idx].size, title: data.title, delta: -qty, reservedDelta: -qty, newStock: variants[idx].stock, reason: 'sale', orderId }));
          } else if (cancelling && state === 'reserved') {
            variants[idx] = { ...variants[idx], reserved: Math.max(0, reserved - qty) };
            movements.push(movement({ productId: item.id, sku: variants[idx].sku, size: variants[idx].size, title: data.title, delta: 0, reservedDelta: -qty, newStock: variants[idx].stock, reason: 'release', orderId }));
          } else if (cancelling && state === 'fulfilled') {
            variants[idx] = { ...variants[idx], stock: stock + qty };
            movements.push(movement({ productId: item.id, sku: variants[idx].sku, size: variants[idx].size, title: data.title, delta: qty, reservedDelta: 0, newStock: variants[idx].stock, reason: 'return', orderId }));
          }
          productWrites.push({ ref, variants });
        }
      }

      for (const w of productWrites) tx.update(w.ref, { variants: w.variants });

      const orderUpdate = { status };
      if (fulfilling) orderUpdate.stockState = 'fulfilled';
      if (cancelling) orderUpdate.stockState = state === 'fulfilled' ? 'returned' : 'released';
      tx.update(orderRef, orderUpdate);
    });

    // Audit log (best-effort, outside the transaction).
    for (const m of movements) {
      adminDb.collection('stock_movements').add(m).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order transition error:', error);
    return NextResponse.json({ error: error.message || 'Transition failed' }, { status: 400 });
  }
}
