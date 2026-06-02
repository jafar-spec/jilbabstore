"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from './ToastContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { showToast } = useToast();
  const hydrated = useRef(false);

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

  // Save to localStorage whenever wishlist changes (skip until initial load
  // completes so the empty default can't overwrite a saved wishlist)
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem('jilbab_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error("Could not save wishlist", e);
    }
  }, [wishlist]);

  const addToWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) return;
    setWishlist(prev => [...prev, product]);
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
