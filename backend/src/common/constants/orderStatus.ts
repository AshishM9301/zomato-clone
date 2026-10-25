export const ORDER_STATUS = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
]);

const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, ReadonlySet<OrderStatus>>> = {
  [ORDER_STATUS.PLACED]: new Set([ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.CONFIRMED]: new Set([ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.PREPARING]: new Set([
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.CANCELLED,
  ]),
  [ORDER_STATUS.READY_FOR_PICKUP]: new Set([ORDER_STATUS.ASSIGNED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.ASSIGNED]: new Set([ORDER_STATUS.PICKED_UP, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.PICKED_UP]: new Set([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.DELIVERED]: new Set(),
  [ORDER_STATUS.CANCELLED]: new Set(),
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.has(to));
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export { ALLOWED_TRANSITIONS, TERMINAL_STATUSES };