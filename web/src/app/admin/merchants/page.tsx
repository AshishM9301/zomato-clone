"use client";

// Admin merchants list with enable/disable. Disable is gated by an
// AlertDialog because the backend rejects it if the merchant has open
// orders; we want the user to confirm intent before getting the 409.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PowerOffIcon } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, truncateId } from "@/lib/format";
import { DataTable, FilterBar, PageHeader } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ApiError } from "@/lib/errors";
import { toastApiError, toastOk } from "@/lib/toast";
import type {
  AdminListResponse,
  AdminMerchantListItem,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

type MerchantStatus = "active" | "disabled";

export default function AdminMerchantsPage() {
  const [status, setStatus] = useState<"" | MerchantStatus>("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const qc = useQueryClient();
  const [disableTarget, setDisableTarget] = useState<AdminMerchantListItem | null>(
    null,
  );

  const query = useQuery({
    queryKey: ["admin", "merchants", { status, page, limit }],
    queryFn: () =>
      api.get<AdminListResponse<AdminMerchantListItem>>("/admin/merchants", {
        status: status || undefined,
        page,
        limit,
      }),
  });

  const setStatus_ = useMutation({
    mutationFn: ({ id, next }: { id: string; next: MerchantStatus }) =>
      api.patch<unknown>(`/admin/merchants/${id}/status`, { status: next }),
    onSuccess: (_, vars) => {
      toastOk(
        vars.next === "disabled" ? "Merchant disabled" : "Merchant enabled",
      );
      qc.invalidateQueries({ queryKey: ["admin", "merchants"] });
      setDisableTarget(null);
    },
    onError: (err) => toastApiError(err, "Could not change merchant status"),
  });

  const items: AdminMerchantListItem[] = query.data?.items ?? [];
  const hasMore = items.length === limit;

  return (
    <div>
      <PageHeader
        title="Merchants"
        description="All merchants on the platform. Disable to block new orders."
      />
      <FilterBar>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Status</label>
          <Select
            value={status || ALL}
            onValueChange={(v) => {
              setStatus(v === ALL ? "" : (v as MerchantStatus));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
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
          <EmptyState title="No merchants" />
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
                { key: "business", header: "Business", render: (r) => r.business_name },
                { key: "name", header: "Owner name", render: (r) => r.name },
                { key: "email", header: "Email", render: (r) => r.email ?? "—" },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => (
                    <Badge variant={r.status === "active" ? "default" : "destructive"}>
                      {r.status}
                    </Badge>
                  ),
                },
                {
                  key: "open",
                  header: "Open orders",
                  render: (r) => (
                    <span className="text-xs text-muted-foreground">
                      {r.open_orders}
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
                {
                  key: "actions",
                  header: "Actions",
                  render: (r) => (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={r.status === "active" || setStatus_.isPending}
                        onClick={() =>
                          setStatus_.mutate({ id: r.id, next: "active" })
                        }
                      >
                        Enable
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="xs"
                        disabled={r.status === "disabled" || setStatus_.isPending}
                        onClick={() => setDisableTarget(r)}
                      >
                        Disable
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

      <AlertDialog
        open={disableTarget !== null}
        onOpenChange={(o) => !o && setDisableTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PowerOffIcon className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Disable {disableTarget?.business_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The merchant will be blocked from receiving new orders. If they
              have open orders the backend will reject the disable with a
              business-rule error.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                disableTarget &&
                setStatus_.mutate({ id: disableTarget.id, next: "disabled" })
              }
              disabled={setStatus_.isPending}
            >
              {setStatus_.isPending ? "Disabling..." : "Disable merchant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}