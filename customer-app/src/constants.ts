// Mirrors web/src/lib/constants.ts. Each surface owns its own copy
// (separate repos per surface, per docs/00-project-overview.md).

export const ROLES = ['admin', 'merchant', 'rider', 'customer'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'assigned',
  'picked_up',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAFF_ROLES: ReadonlySet<Role> = new Set([
  'admin',
  'merchant',
  'rider',
]);
