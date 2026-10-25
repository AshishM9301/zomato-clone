"use client";

// Admin riders list with online/offline control. The status update endpoint
// accepts online/offline/busy; the UI exposes online/offline (busy is set
// automatically when a rider picks up an order).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateTime, truncateId } from "@/lib/format";
import { DataTable, FilterBar, PageHeader } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ApiError } from "@/lib/errors";
import { toastApiError, toastOk } from "@/lib/toast";
import type { AdminListResponse, Rider, RiderStatus } from "@/lib/types";
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

const RIDER_STATUSES: RiderStatus[] = ["online", "offline", "busy"];

export default function AdminRidersPage() {
  const [status, setStatus] = useState<"" | RiderStatus>("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "riders", { status, page, limit }],
    queryFn: () =>
      api.get<AdminListResponse<Rider>>("/admin/riders", {
        status: status || undefined,
        page,
        limit,
      }),
  });

  const setStatus_ = useMutation({
    mutationFn: ({ id, next }: { id: string; next: RiderStatus }) =>
      api.patch<Rider>(`/admin/riders/${id}/status`, { status: next }),
    onSuccess: (_, vars) => {
      toastOk(`Rider set to ${vars.next}`);
      qc.invalidateQueries({ queryKey: ["admin", "riders"] });
    },
    onError: (err) => toastApiError(err, "Could not change rider status"),
  });

  const items: Rider[] = query.data?.items ?? [];
  const hasMore = items.length === limit;

  return (
    <div>
      <PageHeader
        title="Riders"
        description="All riders. Set online/offline; busy is set automatically when a rider has an active assignment."
      />
      <FilterBar>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Status</label>
          <Select
            value={status || ALL}
            onValueChange={(v) => {
              setStatus(v === ALL ? "" : (v as RiderStatus));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {RIDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
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
          <EmptyState title="No riders" />
        ) : (
          <>
            <DataTable
              rowKey={(r) => r.id}
              rows={items}
              columns={[
                {
                  key: "id",
                  header: "ID",
                  render: (r) => (
                    <span className="font-mono text-xs">{truncateId(r.id)}</span>
                  ),
                },
                { key: "name", header: "Name", render: (r) => r.name },
                { key: "email", header: "Email", render: (r) => r.email },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => (
                    <Badge variant="secondary" className="capitalize">
                      {r.status}
                    </Badge>
                  ),
                },
                {
                  key: "active",
                  header: "Active",
                  render: (r) => (
                    <span className="text-xs text-muted-foreground">
                      {r.active_assignments ?? 0}
                    </span>
                  ),
                },
                {
                  key: "updated",
                  header: "Updated",
                  render: (r) => (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(r.updated_at)}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (r) => (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={r.status === "online" || setStatus_.isPending}
                        onClick={() =>
                          setStatus_.mutate({ id: r.id, next: "online" })
                        }
                      >
                        Online
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={r.status === "offline" || setStatus_.isPending}
                        onClick={() =>
                          setStatus_.mutate({ id: r.id, next: "offline" })
                        }
                      >
                        Offline
                      </Button>
                    </div>
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