import { db } from './firebase';
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
  runTransaction
} from 'firebase/firestore';

export const PRODUCTS_COLLECTION = 'products';
export const ORDERS_COLLECTION = 'orders';
export const SECTIONS_COLLECTION = 'sections';
export const NEWSLETTER_COLLECTION = 'newsletter_subscribers';
export const REVIEWS_COLLECTION = 'reviews';
export const PROMOCODES_COLLECTION = 'promocodes';
export const SETTINGS_COLLECTION = 'store_settings';

// --- Sections API ---

export const getSections = async () => {
  const snapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
  const sections = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  // Sort by order field
  return sections.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const createSection = async (sectionData) => {
  const docRef = doc(collection(db, SECTIONS_COLLECTION));
  await setDoc(docRef, sectionData);
  return docRef.id;
};

export const deleteSectionDoc = async (id) => {
  const docRef = doc(db, SECTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

// --- Products API ---

export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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
  const docRef = doc(collection(db, PRODUCTS_COLLECTION));
  await setDoc(docRef, productData);
  return docRef.id;
};

export const updateProduct = async (id, data) => {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteProductDoc = async (id) => {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await deleteDoc(docRef);
};

// --- Orders API ---

export const createOrder = async (orderData) => {
  // Using a transaction to ensure stock is accurately deducted
  return await runTransaction(db, async (transaction) => {
    // 1. Read all required product documents first
    const productRefs = [];
    const productSnaps = [];
    
    // We only care about items that have a baseId/id and variants
    for (const item of orderData.items) {
      if (!item.id || !item.selectedSize) continue;
      const productRef = doc(db, PRODUCTS_COLLECTION, item.id);
      productRefs.push({ ref: productRef, item });
      
      const snap = await transaction.get(productRef);
      if (!snap.exists()) {
        throw new Error(`Product ${item.id} does not exist!`);
      }
      productSnaps.push({ snap, item });
    }

    // 2. Perform updates
    for (const { snap, item } of productSnaps) {
      const productData = snap.data();
      if (!productData.variants) continue;

      const variantIndex = productData.variants.findIndex(v => v.size === item.selectedSize);
      if (variantIndex !== -1) {
        const currentStock = productData.variants[variantIndex].stock;
        if (currentStock < item.quantity) {
          throw new Error(`Out of stock for ${productData.title} (Size: ${item.selectedSize}). Available: ${currentStock}`);
        }
        
        // Deduct stock
        productData.variants[variantIndex].stock -= item.quantity;
        transaction.update(snap.ref, { variants: productData.variants });
      }
    }

    // 3. Create the order document
    const orderRef = doc(collection(db, ORDERS_COLLECTION));
    transaction.set(orderRef, orderData);
    
    return orderRef.id;
  });
};



export const getAllOrders = async () => {
  const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
  const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const updateOrderDoc = async (id, data) => {
  const docRef = doc(db, ORDERS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteOrderDoc = async (id) => {
  const docRef = doc(db, ORDERS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getOrderById = async (id) => {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, id);
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
    return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
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
  const snapshot = await getDocs(collection(db, NEWSLETTER_COLLECTION));
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
  const docRef = doc(collection(db, PROMOCODES_COLLECTION));
  await setDoc(docRef, { ...promoData, code: promoData.code.toUpperCase() });
  return docRef.id;
};

export const deletePromoCode = async (id) => {
  await deleteDoc(doc(db, PROMOCODES_COLLECTION, id));
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
  const docRef = doc(db, SETTINGS_COLLECTION, 'main_settings');
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
  const snapshot = await getDocs(collection(db, TICKETS_COLLECTION));
  const tickets = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const updateTicket = async (id, data) => {
  await updateDoc(doc(db, TICKETS_COLLECTION, id), data);
};

export const deleteTicket = async (id) => {
  await deleteDoc(doc(db, TICKETS_COLLECTION, id));
};

// --- Subsections API ---
export const updateSectionSubsections = async (sectionId, subsections) => {
  await updateDoc(doc(db, SECTIONS_COLLECTION, sectionId), { subsections });
};

// --- Admin Reviews API ---
export const getAllReviews = async () => {
  const snapshot = await getDocs(collection(db, REVIEWS_COLLECTION));
  const reviews = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const updateReview = async (id, data) => {
  await updateDoc(doc(db, REVIEWS_COLLECTION, id), data);
};

export const deleteReview = async (id) => {
  await deleteDoc(doc(db, REVIEWS_COLLECTION, id));
};

// --- Courier Routing API ---
export const updateOrderRouteSequence = async (routeUpdates) => {
  // routeUpdates is an array of { id, routeOrder }
  await Promise.all(routeUpdates.map(async (update) => {
    await updateDoc(doc(db, ORDERS_COLLECTION, update.id), { routeOrder: update.routeOrder });
  }));
};
