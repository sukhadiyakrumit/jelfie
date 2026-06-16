import { useEffect, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceUsd: number;
  image: string | null;
  qty: number;
};

export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  priceUsd: number;
  image: string | null;
};

const CART_KEY = "jelfie:cart";
const WISH_KEY = "jelfie:wishlist";

type Listener<T> = (v: T) => void;
const cartListeners = new Set<Listener<CartItem[]>>();
const wishListeners = new Set<Listener<WishlistItem[]>>();

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[], listeners: Set<Listener<T[]>>) {
  window.localStorage.setItem(key, JSON.stringify(value));
  listeners.forEach((l) => l(value));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read<CartItem>(CART_KEY));
    const l: Listener<CartItem[]> = (v) => setItems(v);
    cartListeners.add(l);
    return () => {
      cartListeners.delete(l);
    };
  }, []);

  const addItem = (item: Omit<CartItem, "qty">, qty = 1) => {
    const current = read<CartItem>(CART_KEY);
    const idx = current.findIndex((i) => i.productId === item.productId);
    if (idx >= 0) current[idx].qty += qty;
    else current.push({ ...item, qty });
    write(CART_KEY, current, cartListeners);
  };

  const removeItem = (productId: string) => {
    write(CART_KEY, read<CartItem>(CART_KEY).filter((i) => i.productId !== productId), cartListeners);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) return removeItem(productId);
    const current = read<CartItem>(CART_KEY).map((i) =>
      i.productId === productId ? { ...i, qty } : i,
    );
    write(CART_KEY, current, cartListeners);
  };

  const clear = () => write(CART_KEY, [], cartListeners);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);

  return { items, addItem, removeItem, updateQty, clear, count, subtotalUsd };
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    setItems(read<WishlistItem>(WISH_KEY));
    const l: Listener<WishlistItem[]> = (v) => setItems(v);
    wishListeners.add(l);
    return () => {
      wishListeners.delete(l);
    };
  }, []);

  const toggle = (item: WishlistItem) => {
    const current = read<WishlistItem>(WISH_KEY);
    const idx = current.findIndex((i) => i.productId === item.productId);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(item);
    write(WISH_KEY, current, wishListeners);
  };

  const remove = (productId: string) => {
    write(WISH_KEY, read<WishlistItem>(WISH_KEY).filter((i) => i.productId !== productId), wishListeners);
  };

  const has = (productId: string) => items.some((i) => i.productId === productId);

  return { items, toggle, remove, has, count: items.length };
}
