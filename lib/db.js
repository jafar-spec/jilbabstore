import { db, staffDb } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';

// NOTE on database instances:
//   db      → default app = CUSTOMER session. Used for public reads (products,
//             sections, settings) and a customer reading their own data.
//   staffDb → staff app = ADMIN/COURIER session. Used for every operation that
//             Firestore rules gate behind isAdmin()/isCourier(), so the request
//             carries the staff identity rather than the customer one.

export const PRODUCTS_COLLECTION = 'products';
export const ORDERS_COLLECTION = 'orders';
export const SECTIONS_COLLECTION = 'sections';
export const NEWSLETTER_COLLECTION = 'newsletter_subscribers';
export const REVIEWS_COLLECTION = 'reviews';
export const PROMOCODES_COLLECTION = 'promocodes';
export const SETTINGS_COLLECTION = 'store_settings';
export const MOVEMENTS_COLLECTION = 'stock_movements';
export const PURCHASE_ORDERS_COLLECTION = 'purchase_orders';

// --- Sections API ---

export const getSections = async () => {
  const snapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
  const sections = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  // Sort by order field
  return sections.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const createSection = async (sectionData) => {
  const docRef = doc(collection(staffDb, SECTIONS_COLLECTION));
  await setDoc(docRef, sectionData);
  return docRef.id;
};

export const deleteSectionDoc = async (id) => {
  const docRef = doc(staffDb, SECTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

// --- Products API ---

export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

// Shared product search matcher. Uses the precomputed `searchText` blob when
// present, and falls back to individual fields for products created before it
// existed. `q` must already be lowercased/trimmed.
export const matchesProduct = (p, q) => {
  if (!q) return true;
  if (p.searchText) return p.searchText.includes(q);
  const haystack = [
    p.title, p.description, p.category,
    ...((p.variants || []).map(v => v.sku))
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
};

export const getProductById = async (id) => {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...docSnap.data(), id: docSnap.id };
  }
  return null;
};

export const createProduct = async (productData) => {
  const docRef = doc(collection(staffDb, PRODUCTS_COLLECTION));
  await setDoc(docRef, productData);
  return docRef.id;
};

export const updateProduct = async (id, data) => {
  const docRef = doc(staffDb, PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteProductDoc = async (id) => {
  const docRef = doc(staffDb, PRODUCTS_COLLECTION, id);
  await deleteDoc(docRef);
};

// --- Orders API ---
// Customer order creation is handled server-side (POST /api/orders) so totals,
// promo discounts and stock decrements are computed/enforced authoritatively.

export const getAllOrders = async () => {
  const snapshot = await getDocs(collection(staffDb, ORDERS_COLLECTION));
  const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  return orders.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
};

export const updateOrderDoc = async (id, data) => {
  const docRef = doc(staffDb, ORDERS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteOrderDoc = async (id) => {
  const docRef = doc(staffDb, ORDERS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getOrderById = async (id) => {
  try {
    const docRef = doc(staffDb, ORDERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
};

export const getCustomerOrders = async (uid) => {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), where("uid", "==", uid));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return orders.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }
};

// --- Newsletter API ---

export const subscribeToNewsletter = async (email) => {
  const docRef = doc(db, NEWSLETTER_COLLECTION, email); // Use email as ID to prevent duplicates
  await setDoc(docRef, { email, subscribedAt: new Date().toISOString() }, { merge: true });
};

export const getNewsletterSubscribers = async () => {
  const snapshot = await getDocs(collection(staffDb, NEWSLETTER_COLLECTION));
  const subs = snapshot.docs.map(doc => doc.data());
  return subs.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
};

// --- Reviews API ---
export const addReview = async (productId, reviewData) => {
  const docRef = doc(collection(db, REVIEWS_COLLECTION));
  await setDoc(docRef, {
    ...reviewData,
    productId,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

export const getReviews = async (productId) => {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("productId", "==", productId)
  );
  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// --- Promo Codes API ---
export const getPromoCode = async (codeStr) => {
  try {
    const q = query(
      collection(db, PROMOCODES_COLLECTION),
      where("code", "==", codeStr.toUpperCase())
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error("Error fetching promo code", error);
    return null;
  }
};

export const getAllPromoCodes = async () => {
  const snapshot = await getDocs(collection(db, PROMOCODES_COLLECTION));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const addPromoCode = async (promoData) => {
  const docRef = doc(collection(staffDb, PROMOCODES_COLLECTION));
  await setDoc(docRef, { ...promoData, code: promoData.code.toUpperCase() });
  return docRef.id;
};

export const deletePromoCode = async (id) => {
  await deleteDoc(doc(staffDb, PROMOCODES_COLLECTION, id));
};

// --- Store Settings API ---

export const getStoreSettings = async () => {
  const docRef = doc(db, SETTINGS_COLLECTION, 'main_settings');
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data();
  } else {
    // Default fallback if not configured yet
    return {
      storeName: 'Jilbabstore',
      heroTitle: 'Discover Modest Elegance',
      heroSubtitle: 'Explore our latest collection of premium Jilbabs and Abayas designed for comfort, modesty, and modern style.',
      logoUrl: '/assets/logo.png',
      heroImgLeft: '/assets/beige_jilbab_1779926569451.png',
      heroImgRight: '/assets/hero_jilbab_store_1779926544481.png'
    };
  }
};

export const updateStoreSettings = async (data) => {
  const docRef = doc(staffDb, SETTINGS_COLLECTION, 'main_settings');
  // Use setDoc with merge to create it if it doesn't exist
  await setDoc(docRef, data, { merge: true });
};

// --- Support Tickets API ---
export const TICKETS_COLLECTION = 'support_tickets';

export const createSupportTicket = async (ticketData) => {
  const tokenChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = (n) => Array.from({length: n}, () => tokenChars[Math.floor(Math.random() * tokenChars.length)]).join('');
  const date = new Date();
  const token = `CS-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${rand(4)}`;

  const docRef = doc(collection(db, TICKETS_COLLECTION));
  await setDoc(docRef, {
    ...ticketData,
    token,
    status: 'open',
    createdAt: date.toISOString(),
    adminNote: ''
  });
  return { id: docRef.id, token };
};

export const getAllTickets = async () => {
  const snapshot = await getDocs(collection(staffDb, TICKETS_COLLECTION));
  const tickets = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const updateTicket = async (id, data) => {
  await updateDoc(doc(staffDb, TICKETS_COLLECTION, id), data);
};

export const deleteTicket = async (id) => {
  await deleteDoc(doc(staffDb, TICKETS_COLLECTION, id));
};

// --- Subsections API ---
export const updateSectionSubsections = async (sectionId, subsections) => {
  await updateDoc(doc(staffDb, SECTIONS_COLLECTION, sectionId), { subsections });
};

// --- Admin Reviews API ---
export const getAllReviews = async () => {
  const snapshot = await getDocs(collection(staffDb, REVIEWS_COLLECTION));
  const reviews = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const updateReview = async (id, data) => {
  await updateDoc(doc(staffDb, REVIEWS_COLLECTION, id), data);
};

export const deleteReview = async (id) => {
  await deleteDoc(doc(staffDb, REVIEWS_COLLECTION, id));
};

// --- Courier Routing API ---
export const updateOrderRouteSequence = async (routeUpdates) => {
  // routeUpdates is an array of { id, routeOrder }
  await Promise.all(routeUpdates.map(async (update) => {
    await updateDoc(doc(staffDb, ORDERS_COLLECTION, update.id), { routeOrder: update.routeOrder });
  }));
};

// =====================================================================
// STOCK MANAGEMENT API (enterprise-grade)
// Stock lives in product.variants: [{ size, sku, stock, reserved }].
//   available = stock - reserved
// Every mutation runs in a transaction and writes a stock_movements record
// for a full audit trail.
// =====================================================================

// Build a deterministic, unique SKU for a variant.
export const buildSku = (productId, size) =>
  `${String(productId).slice(0, 6).toUpperCase()}-${String(size).toUpperCase().replace(/\s+/g, '')}`;

// Write an audit record. Best-effort; never blocks the main mutation.
const recordMovement = async (movement) => {
  try {
    await addDoc(collection(staffDb, MOVEMENTS_COLLECTION), {
      ...movement,
      at: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error('Failed to write stock movement', e);
  }
};

// Set a variant's absolute stock level (transactional). reason: 'manual' etc.
export const setVariantStock = async (productId, sku, newStock, meta = {}) => {
  if (newStock < 0) throw new Error('Stock cannot be negative');
  const ref = doc(staffDb, PRODUCTS_COLLECTION, productId);
  const result = await runTransaction(staffDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Product not found');
    const data = snap.data();
    const variants = [...(data.variants || [])];
    const idx = variants.findIndex(v => v.sku === sku);
    if (idx === -1) throw new Error('Variant not found');
    const prev = Number(variants[idx].stock) || 0;
    variants[idx] = { ...variants[idx], stock: newStock };
    tx.update(ref, { variants });
    return { delta: newStock - prev, size: variants[idx].size, title: data.title };
  });
  await recordMovement({
    productId, sku, size: result.size, title: result.title,
    delta: result.delta, newStock, reason: meta.reason || 'manual', by: meta.by || 'admin'
  });
  return result;
};

// Adjust a variant's stock by a delta (transactional). Prevents negatives.
export const adjustVariantStock = async (productId, sku, delta, meta = {}) => {
  const ref = doc(staffDb, PRODUCTS_COLLECTION, productId);
  const result = await runTransaction(staffDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Product not found');
    const data = snap.data();
    const variants = [...(data.variants || [])];
    const idx = variants.findIndex(v => v.sku === sku);
    if (idx === -1) throw new Error('Variant not found');
    const prev = Number(variants[idx].stock) || 0;
    const next = prev + delta;
    if (next < 0) throw new Error('Insufficient stock');
    variants[idx] = { ...variants[idx], stock: next };
    tx.update(ref, { variants });
    return { newStock: next, size: variants[idx].size, title: data.title };
  });
  await recordMovement({
    productId, sku, size: result.size, title: result.title,
    delta, newStock: result.newStock, reason: meta.reason || 'adjustment', by: meta.by || 'admin', orderId: meta.orderId || null
  });
  return result;
};

// Order stock-state transitions (fulfill on delivery, release/return on cancel)
// run server-side in /api/orders/transition because couriers may trigger them
// but are not allowed to write product docs directly.

export const getStockMovements = async (max = 200) => {
  try {
    const q = query(collection(staffDb, MOVEMENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error) {
    // Fallback if the composite index/order field is missing.
    const snapshot = await getDocs(collection(staffDb, MOVEMENTS_COLLECTION));
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }))
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, max);
  }
};

// --- Purchase Orders (inbound restock workflow) ---
export const getPurchaseOrders = async () => {
  const snapshot = await getDocs(collection(staffDb, PURCHASE_ORDERS_COLLECTION));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const createPurchaseOrder = async (poData) => {
  const docRef = doc(collection(staffDb, PURCHASE_ORDERS_COLLECTION));
  await setDoc(docRef, {
    ...poData,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// Mark a PO received → apply each line as a 'restock' movement, atomically.
export const receivePurchaseOrder = async (poId) => {
  const poRef = doc(staffDb, PURCHASE_ORDERS_COLLECTION, poId);
  const snap = await getDoc(poRef);
  if (!snap.exists()) throw new Error('Purchase order not found');
  const po = snap.data();
  if (po.status === 'received') return; // idempotent
  for (const line of (po.lines || [])) {
    if (!line.productId || !line.sku || !line.qty) continue;
    await adjustVariantStock(line.productId, line.sku, Number(line.qty), { reason: 'restock', by: 'admin' });
  }
  await updateDoc(poRef, { status: 'received', receivedAt: new Date().toISOString() });
};

export const deletePurchaseOrder = async (id) => {
  await deleteDoc(doc(staffDb, PURCHASE_ORDERS_COLLECTION, id));
};

// --- Courier Management API (legacy direct-Firestore; UI uses /api/admin/couriers) ---
export const getAllCouriers = async () => {
  const snapshot = await getDocs(collection(staffDb, 'admins'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id })).filter(user => user.role === 'courier');
};

export const deleteCourier = async (id) => {
  await deleteDoc(doc(staffDb, 'admins', id));
};
