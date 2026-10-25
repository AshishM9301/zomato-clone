import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { OrderStatus } from "@/lib/constants";

const VARIANT_BY_STATUS: Record<OrderStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  placed: "secondary",
  confirmed: "secondary",
  preparing: "secondary",
  ready_for_pickup: "secondary",
  assigned: "secondary",
  picked_up: "secondary",
  delivered: "default",
  cancelled: "destructive",
};

// Per-status tint on top of the badge variant so the eight statuses are
// still distinguishable at a glance. Destructive variant already brings
// the red we need for cancelled.
const TINT_BY_STATUS: Record<OrderStatus, string> = {
  placed: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20",
  confirmed: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20",
  preparing: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
  ready_for_pickup: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-yellow-500/20",
  assigned: "bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-purple-500/20",
  picked_up: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/20",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  cancelled: "",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const variant = VARIANT_BY_STATUS[status];
  return (
    <Badge variant={variant} className={TINT_BY_STATUS[status]}>
      {statusLabel(status)}
    </Badge>
  );
}