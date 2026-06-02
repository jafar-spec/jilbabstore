import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase client config — these are safe to expose (restricted by Firestore rules)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBowyQqnhsCM855pfkjpA9_1fExWNWmVBo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "jilbab-store.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "jilbab-store",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "jilbab-store.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "784065108209",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:784065108209:web:62295f84f4e7ae2ceb3150",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-2MZ6GCKN1H"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Secondary, independent app instance = the STAFF/admin/courier session.
// Firebase persists each named app's auth separately, so staff login/logout
// never collides with the customer session (and vice versa).
const STAFF_APP_NAME = 'staff';
const staffApp = getApps().find(a => a.name === STAFF_APP_NAME) || initializeApp(firebaseConfig, STAFF_APP_NAME);

// Initialize App Check on the CLIENT only, at module load (before the first
// Firestore read fires from a component effect) so requests carry tokens.
// `firebase/app-check` references browser globals at import, so it MUST be
// dynamically imported inside the window guard — a static import would be
// evaluated during SSR/pre-render and crash (ReferenceError: localStorage).
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      for (const a of [app, staffApp]) {
        try {
          initializeAppCheck(a, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: true,
          });
        } catch (e) {
          // Already initialized for this app instance — ignore.
        }
      }
    })
    .catch((e) => console.warn('App Check init failed', e));
}

// Default app = the CUSTOMER-facing session (storefront, profile, checkout).
export const db = getFirestore(app);
export const auth = getAuth(app);
export const staffAuth = getAuth(staffApp);
export const staffDb = getFirestore(staffApp);
// Image uploads run through the staff session (admin is authenticated).
export const staffStorage = getStorage(staffApp);

// Initialize Analytics conditionally (only runs in browser)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
