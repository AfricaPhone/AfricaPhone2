import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { useProducts } from './ProductContext';

// --- Types & État Initial ---
type CartState = Record<string, number>; // productId -> qty

type Action =
  | { type: 'ADD_TO_CART'; productId: string; qty?: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'SET_QTY'; productId: string; qty: number }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {};

// --- Reducer ---
function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const qty = action.qty ?? 1;
      const current = state[action.productId] ?? 0;
      return { ...state, [action.productId]: current + qty };
    }
    case 'REMOVE_FROM_CART': {
      const next = { ...state };
      delete next[action.productId];
      return next;
    }
    case 'SET_QTY': {
      const next = { ...state };
      if (action.qty <= 0) {
        delete next[action.productId];
      } else {
        next[action.productId] = action.qty;
      }
      return next;
    }
    case 'CLEAR_CART':
      return {};
    default:
      return state;
  }
}

// --- Type du Contexte ---
type CartContextType = {
  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  total: number;
  cartItems: Array<{ productId: string; qty: number; title: string; price: number; image: string }>;
};

const CartContext = createContext<CartContextType | null>(null);

// --- Provider ---
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(reducer, initialState);
  const { getProductById } = useProducts();

  const addToCart = (productId: string, qty?: number) => dispatch({ type: 'ADD_TO_CART', productId, qty });
  const removeFromCart = (productId: string) => dispatch({ type: 'REMOVE_FROM_CART', productId });
  const setQty = (productId: string, qty: number) => dispatch({ type: 'SET_QTY', productId, qty });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const derived = useMemo(() => {
    const cartEntries = Object.entries(cart);
    const cartItems = cartEntries
      .map(([productId, qty]) => {
        const p = getProductById(productId);
        if (!p) return null;
        return { productId, qty, title: p.title, price: p.price, image: p.image };
      })
      .filter(Boolean) as Array<{ productId: string; qty: number; title: string; price: number; image: string }>;

    const cartCount = cartEntries.reduce((sum, [, q]) => sum + q, 0);
    const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    return { cartItems, cartCount, total };
  }, [cart, getProductById]);

  const value: CartContextType = {
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    ...derived,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// --- Hook ---
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
