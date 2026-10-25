// Reusable table + filter bar + page header. Public API is unchanged from the
// hand-rolled version, so consumers don't need to be touched. Internals are
// shadcn primitives so the visual is consistent with the rest of the app.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { InboxIcon } from "lucide-react";

type Column<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    if (empty) return <>{empty}</>;
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <InboxIcon className="size-6 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">No records to display.</div>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("px-4", c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn("px-4 align-top", c.className)}
                >
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="mb-4 flex flex-wrap items-end gap-3 p-3">
      {children}
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}