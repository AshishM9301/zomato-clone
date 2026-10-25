"use client";

// Admin order detail. Cancel + refund actions, both gated by AlertDialog
// confirms so a stray click can't take down an order.

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanIcon, Undo2Icon } from "lucide-react";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { PageHeader } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { formatDateTime, formatMoney, truncateId } from "@/lib/format";
import { toastApiError, toastInfo, toastOk } from "@/lib/toast";
import type { OrderDetailResponse, OrderItemRow, OrderRow } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const query = useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<OrderDetailResponse>(`/orders/${id}`),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) =>
      api.post<OrderRow>(`/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      toastOk("Order cancelled");
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      setCancelOpen(false);
      setCancelReason("");
    },
    onError: (err) => toastApiError(err, "Could not cancel order"),
  });

  const refund = useMutation({
    mutationFn: () =>
      api.post<{ id: string; refunded_at: string }>(`/admin/orders/${id}/refund`),
    onSuccess: () => {
      toastOk("Order flagged as refunded");
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      setRefundOpen(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toastInfo("Already refunded", "This order was already marked as refunded.");
        setRefundOpen(false);
      } else {
        toastApiError(err, "Could not refund order");
      }
    },
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
  const isTerminal = order.status === "delivered" || order.status === "cancelled";

  return (
    <div>
      <div className="mb-3">
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href="/admin/orders">← Back to orders</Link>
        </Button>
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
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row k="Customer" v={truncateId(order.customer_id)} mono />
              <Row k="Restaurant" v={truncateId(order.restaurant_id)} mono />
              <Row
                k="Rider"
                v={
                  order.status === "placed" ||
                  order.status === "confirmed" ||
                  order.status === "preparing" ||
                  order.status === "ready_for_pickup"
                    ? "—"
                    : "assigned"
                }
              />
              <Row k="Address" v={order.address} />
              {order.notes ? <Row k="Notes" v={order.notes} /> : null}
              {order.cancellation_reason ? (
                <Row k="Cancel reason" v={order.cancellation_reason} />
              ) : null}
            </CardContent>
          </Card>

          {!isTerminal ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle>Intervene</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cancel-reason">Cancel reason</Label>
                  <Input
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Required for cancellation"
                  />
                </div>
                <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!cancelReason.trim()}
                    >
                      <BanIcon />
                      Cancel order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia>
                        <BanIcon className="text-destructive" />
                      </AlertDialogMedia>
                      <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The order will be moved to <strong>cancelled</strong> with the
                        reason you provided. This cannot be undone from the UI.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep order</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancel.mutate(cancelReason.trim())}
                        disabled={cancel.isPending}
                      >
                        {cancel.isPending ? "Cancelling..." : "Yes, cancel order"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.refunded_at ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Refunded on {formatDateTime(order.refunded_at)}.
                </p>
              ) : (
                <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      disabled={order.status !== "delivered" || refund.isPending}
                    >
                      <Undo2Icon />
                      {refund.isPending ? "Refunding..." : "Mark as refunded"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia>
                        <Undo2Icon />
                      </AlertDialogMedia>
                      <AlertDialogTitle>Mark order as refunded?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sets <code>refunded_at</code> on the order. The action is
                        idempotent — re-running returns 409 and the UI will surface
                        it as an info toast.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => refund.mutate()}
                        disabled={refund.isPending}
                      >
                        {refund.isPending ? "Refunding..." : "Mark as refunded"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {order.status !== "delivered" && !order.refunded_at ? (
                <p className="text-[11px] text-muted-foreground">
                  Refund is only available once the order is delivered.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
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
      <span
        className={
          mono
            ? "font-mono text-xs text-foreground"
            : "text-right text-foreground"
        }
      >
        {v}
      </span>
    </div>
  );
}