"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from './ToastContext';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { track, productItem } from '@/lib/analytics';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { showToast } = useToast();
  const hydrated = useRef(false);
  const uidRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jilbab_wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Could not load wishlist", e);
    }
    hydrated.current = true;
  }, []);

  // When a customer signs in, merge their Firestore wishlist with the local one
  // (union by id) so nothing is lost across devices/sessions.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      uidRef.current = user ? user.uid : null;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'wishlists', user.uid));
        const remote = snap.exists() ? (snap.data().items || []) : [];
        setWishlist(prev => {
          const map = new Map();
          [...remote, ...prev].forEach(it => { if (it && it.id) map.set(it.id, it); });
          return [...map.values()];
        });
      } catch (e) {
        console.error('Could not load account wishlist', e);
      }
    });
    return () => unsub();
  }, []);

  // Persist to localStorage always; mirror to Firestore for logged-in customers.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem('jilbab_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error("Could not save wishlist", e);
    }
    if (uidRef.current) {
      setDoc(doc(db, 'wishlists', uidRef.current), { items: wishlist, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(e => console.error('Could not sync wishlist', e));
    }
  }, [wishlist]);

  const addToWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) return;
    setWishlist(prev => [...prev, product]);
    track('add_to_wishlist', { currency: 'ILS', value: Number(product.price) || 0, items: [productItem(product)] });
    showToast('تمت الإضافة إلى المفضلة', 'success');
  };

  const removeFromWishlist = (productId) => {
    setWishlist(prev => prev.filter(item => item.id !== productId));
    showToast('تمت الإزالة من المفضلة', 'info');
  };

  const toggleWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
