import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBowyQqnhsCM855pfkjpA9_1fExWNWmVBo",
  authDomain: "jilbab-store.firebaseapp.com",
  projectId: "jilbab-store",
  storageBucket: "jilbab-store.firebasestorage.app",
  messagingSenderId: "784065108209",
  appId: "1:784065108209:web:62295f84f4e7ae2ceb3150",
  measurementId: "G-2MZ6GCKN1H"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics conditionally (only runs in browser)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
