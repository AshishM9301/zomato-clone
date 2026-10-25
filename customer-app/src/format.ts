// Format helpers. Intl.NumberFormat works on Hermes (RN 0.86 with Intl
// enabled) — confirmed by the Hermes intl support that landed in 0.74+.

import { format as dateFnsFormat } from 'date-fns';
import type { OrderStatus } from './constants';

export function formatMoney(cents: number): string {
  // Indian rupee formatting. Fallback to a hand-rolled string if Intl fails.
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `Rs. ${(cents / 100).toFixed(2)}`;
  }
}

export function formatDateTime(iso: string): string {
  return dateFnsFormat(new Date(iso), 'd MMM, h:mm a');
}

export function formatDate(iso: string): string {
  return dateFnsFormat(new Date(iso), 'd MMM yyyy');
}

export function truncateId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  assigned: 'Rider assigned',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function statusLabel(s: OrderStatus): string {
  return STATUS_LABELS[s] ?? s;
}

// Compact pill color. One fg/bg pair per status, mirrors web's StatusBadge.
export function statusColors(s: OrderStatus): { bg: string; fg: string } {
  switch (s) {
    case 'placed':
    case 'confirmed':
      return { bg: '#dbeafe', fg: '#1d4ed8' };
    case 'preparing':
      return { bg: '#fef3c7', fg: '#b45309' };
    case 'ready_for_pickup':
    case 'assigned':
      return { bg: '#ede9fe', fg: '#6d28d9' };
    case 'picked_up':
      return { bg: '#ccfbf1', fg: '#0f766e' };
    case 'delivered':
      return { bg: '#dcfce7', fg: '#15803d' };
    case 'cancelled':
      return { bg: '#fee2e2', fg: '#b91c1c' };
    default:
      return { bg: '#e5e7eb', fg: '#374151' };
  }
}
