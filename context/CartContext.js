"use client";

import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { track, productItem } from '@/lib/analytics';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const hydrated = useRef(false);

  // Load from localStorage on mount (mocking persistence for now)
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
    hydrated.current = true;
  }, []);

  // Save to localStorage when cart changes (skip until initial load completes
  // so the empty default state can't overwrite a saved cart)
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

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
