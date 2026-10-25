// Shared types for the customer app. Mirrors backend repository rows exactly
// (snake_case). Source of truth: backend/src/modules/*/repository.ts.

import type { OrderStatus, Role } from './constants';

export type User = {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string;
  merchant_id?: string;
  rider_id?: string;
};

export type LoginResponse = { token: string; user: User };
export type MeResponse = { user: User };

export type Restaurant = {
  id: string;
  merchant_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_open: boolean;
  business_name: string;
  created_at: string;
  updated_at: string;
};

export type RestaurantListResponse = {
  items: Restaurant[];
  page: number;
  limit: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  // NOTE: backend does NOT return a `category` field. The web type includes
  // it, but it's not in the backend's MenuItemRow. Don't rely on it.
};

export type MenuListResponse = {
  restaurantId: string;
  items: MenuItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  qty: number;
  unit_price_cents: number;
};

export type Order = {
  id: string;
  customer_id: string;
  restaurant_id: string;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderDetailResponse = { order: Order; items: OrderItem[] };

export type OrderListResponse = {
  items: Order[];
  page: number;
  limit: number;
};

export type CreateOrderInput = {
  restaurant_id: string;
  items: { menu_item_id: string; qty: number }[];
  address: string;
  lat?: number;
  lng?: number;
  notes?: string;
};

export type CartLine = {
  menu_item_id: string;
  restaurant_id: string;
  name_snapshot: string;
  unit_price_cents: number;
  qty: number;
};
