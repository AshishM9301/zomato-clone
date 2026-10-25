"use client";

// Merchant order detail. Role-scoped transition buttons:
//   placed      -> Confirm   (merchant)
//   confirmed   -> Preparing (merchant)
//   preparing   -> Ready     (merchant)
// Any non-terminal -> Cancel   (merchant allowed for placed|confirmed|preparing)

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, XCircleIcon } from "lucide-react";
import { api } from "@/lib/api";
import { toastApiError, toastOk } from "@/lib/toast";
import { ApiError } from "@/lib/errors";
import { PageHeader } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { formatDateTime, formatMoney, truncateId } from "@/lib/format";
import type { OrderDetailResponse, OrderItemRow, OrderRow } from "@/lib/types";
import type { OrderStatus } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Action = "confirm" | "preparing" | "ready" | "cancel";

const MERCHANT_ALLOWED_CANCEL_FROM: ReadonlySet<OrderStatus> = new Set([
  "placed",
  "confirmed",
  "preparing",
]);

export default function MerchantOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const query = useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<OrderDetailResponse>(`/orders/${id}`),
    refetchInterval: 5_000,
  });

  const transition = useMutation({
    mutationFn: (action: Action) => {
      switch (action) {
        case "confirm":
          return api.post<OrderRow>(`/orders/${id}/confirm`);
        case "preparing":
          return api.post<OrderRow>(`/orders/${id}/preparing`);
        case "ready":
          return api.post<OrderRow>(`/orders/${id}/ready`);
        case "cancel":
          return api.post<OrderRow>(`/orders/${id}/cancel`, {
            reason: cancelReason.trim(),
          });
      }
    },
    onSuccess: (_, action) => {
      toastOk(
        action === "cancel" ? "Order cancelled" : `Marked as ${action}`,
      );
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["merchant", "orders"] });
      if (action === "cancel") {
        setCancelOpen(false);
        setCancelReason("");
      }
    },
    onError: (err) => toastApiError(err, "Could not update order"),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError)
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    );
  if (!query.data) return <EmptyState title="Order not found" />;
  const { order, items } = query.data;

  const isTerminal =
    order.status === "delivered" || order.status === "cancelled";
  const canConfirm = order.status === "placed";
  const canPreparing = order.status === "confirmed";
  const canReady = order.status === "preparing";
  const canCancel = !isTerminal && MERCHANT_ALLOWED_CANCEL_FROM.has(order.status);
  const hasAnyTransition = canConfirm || canPreparing || canReady;
  const cancelDisabled = !cancelReason.trim() || transition.isPending;

  return (
    <div>
      <div className="mb-3">
        <Link
          href="/merchant/orders"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to orders
        </Link>
      </div>
      <PageHeader
        title={`Order ${truncateId(order.id)}`}
        description={`Created ${formatDateTime(order.created_at)} · Updated ${formatDateTime(order.updated_at)}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemsTable items={items} />
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-sm">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="col-span-2 text-right">
                {formatMoney(order.subtotal_cents)}
              </dd>
              <dt className="text-muted-foreground">Delivery fee</dt>
              <dd className="col-span-2 text-right">
                {formatMoney(order.delivery_fee_cents)}
              </dd>
              <dt className="font-medium">Total</dt>
              <dd className="col-span-2 text-right font-medium">
                {formatMoney(order.total_cents)}
              </dd>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Row k="Customer" v={truncateId(order.customer_id)} mono />
              <Row k="Restaurant" v={truncateId(order.restaurant_id)} mono />
              <Row k="Address" v={order.address} />
              {order.notes ? <Row k="Notes" v={order.notes} /> : null}
              {order.cancellation_reason ? (
                <Row k="Cancel reason" v={order.cancellation_reason} />
              ) : null}
            </CardContent>
          </Card>

          {!isTerminal && (hasAnyTransition || canCancel) ? (
            <Card>
              <CardHeader>
                <CardTitle>Update status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {hasAnyTransition ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" disabled={transition.isPending}>
                        Actions
                        <ChevronDownIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {canConfirm ? (
                        <DropdownMenuItem
                          onSelect={() => transition.mutate("confirm")}
                        >
                          Confirm
                        </DropdownMenuItem>
                      ) : null}
                      {canPreparing ? (
                        <DropdownMenuItem
                          onSelect={() => transition.mutate("preparing")}
                        >
                          Mark as preparing
                        </DropdownMenuItem>
                      ) : null}
                      {canReady ? (
                        <DropdownMenuItem
                          onSelect={() => transition.mutate("ready")}
                        >
                          Mark as ready
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                {canCancel ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelOpen(true)}
                    disabled={transition.isPending}
                  >
                    <XCircleIcon />
                    Cancel order
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <AlertDialog
        open={cancelOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCancelOpen(false);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <XCircleIcon className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will be notified. Cancellation is only allowed
              before the order is picked up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Required — tell the customer why"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelDisabled}
              onClick={() => transition.mutate("cancel")}
            >
              {transition.isPending ? "Cancelling..." : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ItemsTable({ items }: { items: OrderItemRow[] }) {
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">No items recorded.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => (
          <TableRow key={it.id}>
            <TableCell>{it.name_snapshot}</TableCell>
            <TableCell className="text-right">{it.qty}</TableCell>
            <TableCell className="text-right">
              {formatMoney(it.unit_price_cents)}
            </TableCell>
            <TableCell className="text-right">
              {formatMoney(it.unit_price_cents * it.qty)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{v}</span>
    </div>
  );
}
