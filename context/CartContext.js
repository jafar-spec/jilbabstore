"use client";

import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { track, productItem } from '@/lib/analytics';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { saveCartSnapshot, clearCartSnapshot } from '@/lib/db';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  // State (not a ref) so the save effect re-runs once hydration is done and is
  // skipped before then — prevents the empty default from overwriting a saved
  // cart, including under React StrictMode's double-mount.
  const [isHydrated, setIsHydrated] = useState(false);
  const customerRef = useRef(null); // default-app (customer) session

  // Load from localStorage on mount.
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
    setIsHydrated(true);
  }, []);

  // Track the customer session so we can mirror their cart for recovery emails.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { customerRef.current = u; });
    return () => unsub();
  }, []);

  // Save to localStorage when cart changes (only after hydration completes).
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart, isHydrated]);

  // Mirror a logged-in customer's cart to Firestore (debounced) so the
  // abandoned-cart cron can nudge them. Cleared on checkout / empty cart.
  useEffect(() => {
    if (!isHydrated) return;
    const u = customerRef.current;
    if (!u) return;
    const total = cart.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const id = setTimeout(() => {
      saveCartSnapshot(u.uid, { items: cart, total, email: u.email, name: u.displayName || '', phone: u.phoneNumber || '' }).catch(() => {});
    }, 3000);
    return () => clearTimeout(id);
  }, [cart, isHydrated]);

  const addToCart = (product) => {
    let exceededStock = false;
    let maxStock = 0;
    
    setCart((prev) => {
      const sameLine = (item) => item.id === product.id
        && item.selectedSize === product.selectedSize
        && (item.selectedColor || '') === (product.selectedColor || '');
      const existing = prev.find(sameLine);
      // Match the exact variant by SKU when available, else colour+size.
      const requestedVariant = product.variants
        ? product.variants.find(v => (product.sku && v.sku === product.sku) || (v.size === product.selectedSize && (v.color || '') === (product.selectedColor || '')))
        : null;
      maxStock = requestedVariant ? requestedVariant.stock : Infinity;

      if (existing) {
        const newQty = existing.quantity + (product.quantity || 1);
        if (newQty > maxStock) {
          exceededStock = true;
          return prev;
        }
        return prev.map((item) =>
          sameLine(item) ? { ...item, quantity: newQty } : item
        );
      }
      
      if ((product.quantity || 1) > maxStock) {
        exceededStock = true;
        return prev;
      }
      
      return [...prev, { ...product, quantity: product.quantity || 1 }];
    });

    if (exceededStock) {
      setTimeout(() => alert(`الكمية المطلوبة تتجاوز المخزون المتاح (${maxStock})`), 0);
    } else {
      track('add_to_cart', { currency: 'ILS', value: (Number(product.price) || 0) * (product.quantity || 1), items: [productItem(product, product.quantity || 1)] });
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (id, size, newQty, stock, color = '') => {
    if (newQty > stock) {
      alert(`الكمية المطلوبة تتجاوز المخزون المتاح (${stock})`);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && item.selectedSize === size && (item.selectedColor || '') === (color || '')
          ? { ...item, quantity: Math.max(1, newQty) }
          : item
      )
    );
  };

  const removeFromCart = (id, size, color = '') => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.selectedSize === size && (item.selectedColor || '') === (color || ''))));
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);
  const closeCart = () => setIsCartOpen(false);

  const clearCart = () => {
    setCart([]);
    const u = customerRef.current;
    if (u) clearCartSnapshot(u.uid).catch(() => {});
  };

  const cartCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, isCartOpen, toggleCart, closeCart, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
