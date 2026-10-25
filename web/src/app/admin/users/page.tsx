"use client";

// Admin users list.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ROLES, type Role } from "@/lib/constants";
import { formatDateTime, truncateId } from "@/lib/format";
import { DataTable, FilterBar, PageHeader } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ApiError } from "@/lib/errors";
import type { AdminListResponse, AdminUsersListItem } from "@/lib/types";
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

export default function AdminUsersPage() {
  const [role, setRole] = useState<"" | Role>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const query = useQuery({
    queryKey: ["admin", "users", { role, page, limit }],
    queryFn: () =>
      api.get<AdminListResponse<AdminUsersListItem>>("/admin/users", {
        role: role || undefined,
        page,
        limit,
      }),
  });

  const items: AdminUsersListItem[] = query.data?.items ?? [];
  const hasMore = items.length === limit;

  return (
    <div>
      <PageHeader title="Users" description="All accounts on the platform." />
      <FilterBar>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Role</label>
          <Select
            value={role || ALL}
            onValueChange={(v) => {
              setRole(v === ALL ? "" : (v as Role));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
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
          <EmptyState title="No users" />
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
                { key: "name", header: "Name", render: (r) => r.name ?? "—" },
                {
                  key: "email",
                  header: "Email",
                  render: (r) =>
                    r.email ?? <span className="text-muted-foreground">—</span>,
                },
                {
                  key: "phone",
                  header: "Phone",
                  render: (r) =>
                    r.phone ?? <span className="text-muted-foreground">—</span>,
                },
                {
                  key: "role",
                  header: "Role",
                  render: (r) => (
                    <Badge variant="secondary" className="capitalize">
                      {r.role}
                    </Badge>
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