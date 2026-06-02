export type CartProductInput = {
  id: string;
  name: string;
  price: number | null;
  image: string | null;
  tagline: string;
};

export type CartItem = CartProductInput & {
  qty: number;
};

export const CART_STORAGE_KEY = 'africaphone_cart';
export const CART_UPDATED_EVENT = 'africaphone-cart-updated';

const isBrowser = () => typeof window !== 'undefined';

const emitCartUpdated = () => {
  if (!isBrowser()) {
    return;
  }
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

export const getCart = (): CartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is CartItem => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.qty === 'number'
        );
      })
      .map(item => ({
        id: item.id,
        name: item.name,
        price: typeof item.price === 'number' ? item.price : null,
        image: typeof item.image === 'string' ? item.image : null,
        tagline: typeof item.tagline === 'string' ? item.tagline : '',
        qty: Math.max(1, Math.floor(item.qty)),
      }));
  } catch {
    return [];
  }
};

export const saveCart = (items: CartItem[]) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartUpdated();
};

export const getCartCount = () => getCart().reduce((sum, item) => sum + item.qty, 0);

export const addCartItem = (product: CartProductInput, qty = 1) => {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...product, qty: Math.max(1, qty) });
  }

  saveCart(cart);
};

export const updateCartItemQty = (productId: string, qty: number) => {
  const nextQty = Math.floor(qty);
  const cart =
    nextQty <= 0
      ? getCart().filter(item => item.id !== productId)
      : getCart().map(item => (item.id === productId ? { ...item, qty: nextQty } : item));

  saveCart(cart);
};

export const removeCartItem = (productId: string) => {
  saveCart(getCart().filter(item => item.id !== productId));
};

export const clearCart = () => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(CART_STORAGE_KEY);
  emitCartUpdated();
};

export const subscribeToCart = (listener: (items: CartItem[]) => void) => {
  if (!isBrowser()) {
    return () => undefined;
  }

  const notify = () => listener(getCart());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      notify();
    }
  };

  window.addEventListener(CART_UPDATED_EVENT, notify);
  window.addEventListener('storage', handleStorage);
  notify();

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, notify);
    window.removeEventListener('storage', handleStorage);
  };
};
