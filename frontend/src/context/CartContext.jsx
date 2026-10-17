import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'pokevinted_cart_v2';

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage quota or private mode protection
    }
  }, [cartItems]);

  const addToCart = useCallback((listing) => {
    if (!listing || !listing.id) return { success: false };

    setCartItems((prev) => {
      const exists = prev.some((item) => item.id === listing.id);
      if (exists) {
        return prev;
      }
      return [...prev, listing];
    });

    setIsCartOpen(true);
    return { success: true, item: listing };
  }, []);

  const removeFromCart = useCallback((listingId) => {
    if (!listingId) return;
    setCartItems((prev) => prev.filter((item) => item.id !== listingId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const isInCart = useCallback((listingId) => {
    if (!listingId || cartItems.length === 0) return false;
    return cartItems.some((item) => item.id === listingId);
  }, [cartItems]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // Compute live total price and count
  const totalPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  }, [cartItems]);

  const itemCount = cartItems.length;

  // Update cart item status if any listing gets sold on marketplace
  const syncWithListings = useCallback((listings) => {
    if (!Array.isArray(listings) || cartItems.length === 0) return;
    setCartItems((prev) =>
      prev.map((cartItem) => {
        const match = listings.find((l) => l.id === cartItem.id);
        if (match && match.status === 'SOLD' && cartItem.status !== 'SOLD') {
          return { ...cartItem, status: 'SOLD' };
        }
        return cartItem;
      })
    );
  }, [cartItems.length]);

  const value = {
    cartItems,
    cartItem: cartItems[0] || null, // Backward compatibility alias
    itemCount,
    totalPrice,
    isCartOpen,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
    openCart,
    closeCart,
    syncWithListings,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
