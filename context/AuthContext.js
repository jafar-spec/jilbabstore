"use client";

import { createContext, useState, useEffect, useContext } from 'react';
import { staffAuth } from '@/lib/firebase';
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
    const unsubscribe = onAuthStateChanged(staffAuth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { staffDb } = await import('@/lib/firebase');

          // Read the role through the staff session so Firestore rules see the
          // staff identity (not the customer one).
          const docRef = doc(staffDb, 'admins', user.uid);
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
    return signInWithEmailAndPassword(staffAuth, email, password);
  };

  const register = (email, password) => {
    return createUserWithEmailAndPassword(staffAuth, email, password);
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
    return signOut(staffAuth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
