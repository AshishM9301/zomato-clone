// Shared constants used across the web app.
// Mirror the backend's enums and order lifecycle where relevant.

export const ROLES = ["admin", "merchant", "rider", "customer"] as const;
export type Role = (typeof ROLES)[number];

// Staff roles this app surfaces (login + dashboards).
export const STAFF_ROLES = ["admin", "merchant", "rider"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// Order lifecycle statuses — must match backend/src/common/constants/orderStatus.ts.
export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "picked_up",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const NON_TERMINAL_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "picked_up",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

// Maps a role to its post-login landing route.
export const ROLE_HOME: Record<StaffRole, string> = {
  admin: "/admin/orders",
  merchant: "/merchant/orders",
  rider: "/rider/orders",
};