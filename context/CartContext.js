"use client";

import { createContext, useState, useContext, useEffect, useRef } from 'react';

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
      const existing = prev.find((item) => item.id === product.id && item.selectedSize === product.selectedSize);
      const requestedVariant = product.variants ? product.variants.find(v => v.size === product.selectedSize) : null;
      maxStock = requestedVariant ? requestedVariant.stock : Infinity;
      
      if (existing) {
        const newQty = existing.quantity + (product.quantity || 1);
        if (newQty > maxStock) {
          exceededStock = true;
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id && item.selectedSize === product.selectedSize 
            ? { ...item, quantity: newQty } 
            : item
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
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (id, size, newQty, stock) => {
    if (newQty > stock) {
      alert(`الكمية المطلوبة تتجاوز المخزون المتاح (${stock})`);
      return;
    }
    setCart((prev) => 
      prev.map((item) => 
        item.id === id && item.selectedSize === size
          ? { ...item, quantity: Math.max(1, newQty) }
          : item
      )
    );
  };

  const removeFromCart = (id, size) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.selectedSize === size)));
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
