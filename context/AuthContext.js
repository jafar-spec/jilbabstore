"use client";

import { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Check for legacy courier123 session first
    if (typeof window !== 'undefined' && sessionStorage.getItem('store_auth_role') === 'courier') {
      setUser({ uid: 'legacy_courier', isLegacy: true });
      setRole('courier');
      setLoading(false);
      // Still set up the listener so logout works, but don't let it override
      const unsubscribe = onAuthStateChanged(auth, () => {});
      return unsubscribe;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Enforce Email Verification for Email/Password users
        if (user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
          await signOut(auth);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        setUser(user);
        try {
          const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          // First, check by UID (Standard admins)
          const docRef = doc(db, 'admins', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setRole(docSnap.data().role || 'operator');
          } else if (user.phoneNumber) {
            // Second, check by phone number (Couriers added via Admin Panel)
            const q = query(collection(db, 'admins'), where('phone', '==', user.phoneNumber));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              setRole(querySnapshot.docs[0].data().role || 'courier');
            } else {
              setRole(null);
            }
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching role", error);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    // Clear legacy courier session if present
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('store_auth_role');
    }
    setUser(null);
    setRole(null);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
