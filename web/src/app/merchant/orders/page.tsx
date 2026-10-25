"use client";

// Merchant orders queue. Polls every 5s for status changes; the merchant
// list is scoped server-side via the JWT, so we just hit /orders.

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { formatDateTime, formatMoney, truncateId } from "@/lib/format";
import { DataTable, FilterBar, PageHeader } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ApiError } from "@/lib/errors";
import type { OrderListResponse, OrderRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export default function MerchantOrdersPage() {
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const query = useQuery({
    queryKey: ["merchant", "orders", { status, page, limit }],
    queryFn: () =>
      api.get<OrderListResponse>("/orders", {
        status: status || undefined,
        page,
        limit,
      }),
    refetchInterval: 5_000,
  });

  const items: OrderRow[] = query.data?.items ?? [];
  const hasMore = items.length === limit;

  return (
    <div>
      <PageHeader
        title="Live orders"
        description="Auto-refreshes every 5s. Click an order to update its status."
        actions={
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            ● Live
          </Badge>
        }
      />
      <FilterBar>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Status</label>
          <Select
            value={status || ALL}
            onValueChange={(v) => {
              setStatus(v === ALL ? "" : (v as OrderStatus));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : undefined}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess ? (
        items.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="When customers place orders, they'll show up here."
          />
        ) : (
          <>
            <DataTable
              rowKey={(r) => r.id}
              rows={items}
              columns={[
                {
                  key: "id",
                  header: "Order",
                  render: (r) => (
                    <Link
                      href={`/merchant/orders/${r.id}`}
                      className="font-mono text-xs text-foreground underline-offset-2 hover:underline"
                    >
                      {truncateId(r.id)}
                    </Link>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "total",
                  header: "Total",
                  render: (r) => formatMoney(r.total_cents),
                },
                {
                  key: "customer",
                  header: "Customer",
                  render: (r) => (
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateId(r.customer_id)}
                    </span>
                  ),
                },
                {
                  key: "address",
                  header: "Address",
                  render: (r) => (
                    <span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">
                      {r.address}
                    </span>
                  ),
                },
                {
                  key: "created",
                  header: "Created",
                  render: (r) => (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(r.created_at)}
                    </span>
                  ),
                },
              ]}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Page {query.data?.page ?? page} · {items.length} on this page
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}