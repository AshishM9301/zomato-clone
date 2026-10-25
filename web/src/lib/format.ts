// Formatting helpers shared across the UI.

import { format } from "date-fns";
import type { OrderStatus } from "./constants";
import type { Money } from "./types";

// INR currency, integer minor units (paise) -> "₹120.50".
export function formatMoney(cents: Money): string {
  const rupees = cents / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
}

// Short, locale-agnostic date+time: "2026-06-23 14:35".
export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "yyyy-MM-dd HH:mm");
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "yyyy-MM-dd");
}

export function truncateId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail + 3) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

// Status -> human label + Tailwind color class for the badge.
export function statusColor(status: OrderStatus): string {
  switch (status) {
    case "placed":
      return "bg-blue-100 text-blue-800";
    case "confirmed":
      return "bg-indigo-100 text-indigo-800";
    case "preparing":
      return "bg-amber-100 text-amber-800";
    case "ready_for_pickup":
      return "bg-yellow-100 text-yellow-800";
    case "assigned":
      return "bg-purple-100 text-purple-800";
    case "picked_up":
      return "bg-fuchsia-100 text-fuchsia-800";
    case "delivered":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

export function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "ready_for_pickup":
      return "Ready";
    case "picked_up":
      return "Picked up";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}