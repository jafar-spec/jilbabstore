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
    // Legacy courier123 session
    if (typeof window !== 'undefined' && sessionStorage.getItem('store_auth_role') === 'courier') {
      setUser({ uid: 'legacy_courier', isLegacy: true });
      setRole('courier');
      setLoading(false);
      const unsubscribe = onAuthStateChanged(auth, () => {});
      return unsubscribe;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const docRef = doc(db, 'admins', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setRole(docSnap.data().role || 'operator');
          } else {
            setRole('customer');
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
