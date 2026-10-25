// Cart. One restaurant at a time — adding an item from a different
// restaurant clears the cart. Persisted to AsyncStorage so it survives
// app kills but NOT login boundaries (it's per-device).

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CartLine, MenuItem } from '../types';

const STORAGE_KEY = 'zc.cart.v1';

type CartShape = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartLine[];
};

const EMPTY: CartShape = { restaurantId: null, restaurantName: null, items: [] };

type CartContextValue = {
  items: CartLine[];
  restaurantId: string | null;
  restaurantName: string | null;
  subtotalCents: number;
  count: number;
  add: (item: MenuItem, qty?: number) => void;
  setQty: (menuItemId: string, qty: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  // If you try to add from a different restaurant, this is true so the UI
  // can show a confirm prompt before wiping the cart.
  wouldReplaceRestaurant: (item: MenuItem) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartShape>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartShape;
          setState(parsed);
        }
      } catch {
        // ignore — start empty
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on change (after hydration so we don't clobber with the empty
  // initial state).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, hydrated]);

  const add = useCallback((item: MenuItem, qty: number = 1) => {
    setState((prev) => {
      // Different restaurant — reset.
      if (prev.restaurantId && prev.restaurantId !== item.restaurant_id) {
        return {
          restaurantId: item.restaurant_id,
          restaurantName: null,
          items: [
            {
              menu_item_id: item.id,
              restaurant_id: item.restaurant_id,
              name_snapshot: item.name,
              unit_price_cents: item.price_cents,
              qty,
            },
          ],
        };
      }
      // Same restaurant — merge or append.
      const existing = prev.items.find((l) => l.menu_item_id === item.id);
      const items = existing
        ? prev.items.map((l) =>
            l.menu_item_id === item.id ? { ...l, qty: l.qty + qty } : l,
          )
        : [
            ...prev.items,
            {
              menu_item_id: item.id,
              restaurant_id: item.restaurant_id,
              name_snapshot: item.name,
              unit_price_cents: item.price_cents,
              qty,
            },
          ];
      return { ...prev, restaurantId: item.restaurant_id, items };
    });
  }, []);

  const setQty = useCallback((menuItemId: string, qty: number) => {
    setState((prev) => {
      if (qty <= 0) {
        const items = prev.items.filter((l) => l.menu_item_id !== menuItemId);
        return items.length === 0
          ? EMPTY
          : { ...prev, items };
      }
      const items = prev.items.map((l) =>
        l.menu_item_id === menuItemId ? { ...l, qty } : l,
      );
      return { ...prev, items };
    });
  }, []);

  const remove = useCallback((menuItemId: string) => {
    setState((prev) => {
      const items = prev.items.filter((l) => l.menu_item_id !== menuItemId);
      return items.length === 0 ? EMPTY : { ...prev, items };
    });
  }, []);

  const clear = useCallback(() => setState(EMPTY), []);

  const wouldReplaceRestaurant = useCallback(
    (item: MenuItem) =>
      state.restaurantId !== null && state.restaurantId !== item.restaurant_id,
    [state.restaurantId],
  );

  const subtotalCents = useMemo(
    () => state.items.reduce((s, l) => s + l.unit_price_cents * l.qty, 0),
    [state.items],
  );

  const count = useMemo(
    () => state.items.reduce((n, l) => n + l.qty, 0),
    [state.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      restaurantId: state.restaurantId,
      restaurantName: state.restaurantName,
      subtotalCents,
      count,
      add,
      setQty,
      remove,
      clear,
      wouldReplaceRestaurant,
    }),
    [state.items, state.restaurantId, state.restaurantName, subtotalCents, count, add, setQty, remove, clear, wouldReplaceRestaurant],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}