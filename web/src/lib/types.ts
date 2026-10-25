// Shared domain types. Aligned with backend response shapes.
//
// The backend returns raw rows (snake_case) from `pg`, so we mirror that
// shape for collections and let UI components format as needed.

import type { OrderStatus, Role } from "./constants";

export type Money = number; // integer in minor units (paise), per backend contracts

// ----- auth / user -----

export type User = {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string;
  merchantId?: string;
  riderId?: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

// Returned by `GET /auth/me` — used to bootstrap auth state on mount.
export type MeResponse = {
  user: User;
};

// ----- merchants -----

export type Merchant = {
  id: string;
  user_id: string;
  business_name: string;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
};

// ----- riders -----

export type RiderStatus = "online" | "offline" | "busy";

export type Rider = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: RiderStatus;
  active_assignments?: number;
  created_at: string;
  updated_at: string;
};

// ----- restaurants -----

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

// ----- menu items -----

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: Money;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuListResponse = {
  restaurantId: string;
  items: MenuItem[];
};

// ----- orders -----

// List response from `GET /orders` (merchant scope) and `GET /admin/orders`.
export type OrderRow = {
  id: string;
  customer_id: string;
  restaurant_id: string;
  status: OrderStatus;
  subtotal_cents: Money;
  delivery_fee_cents: Money;
  total_cents: Money;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  cancellation_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderListResponse = {
  items: OrderRow[];
  page: number;
  limit: number;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  qty: number;
  unit_price_cents: Money;
};

export type OrderDetailResponse = {
  order: OrderRow;
  items: OrderItemRow[];
};

// ----- admin listings -----

export type AdminUsersListItem = {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string;
  created_at: string;
};

export type AdminListResponse<T> = {
  items: T[];
  page: number;
  limit: number;
};

export type AdminMerchantListItem = {
  id: string;
  user_id: string;
  business_name: string;
  status: "active" | "disabled";
  name: string;
  email: string | null;
  phone: string | null;
  open_orders: number;
  created_at: string;
  updated_at: string;
};