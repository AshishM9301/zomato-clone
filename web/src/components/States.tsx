// Loading / empty / error states. Used inside every list + detail page.

import { AlertCircleIcon, InboxIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ label = "Loading..." }: { label?: string } = {}) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number } = {}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b p-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <InboxIcon className="size-8 text-muted-foreground" />
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description ? (
        <div className="max-w-sm text-xs text-muted-foreground">{description}</div>
      ) : null}
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex items-start gap-3 border-destructive/30 bg-destructive/5 p-4">
      <AlertCircleIcon className="mt-0.5 size-5 text-destructive" />
      <div className="flex-1">
        <div className="text-sm font-medium text-destructive">
          Something went wrong
        </div>
        {message ? (
          <div className="mt-1 text-xs text-muted-foreground">{message}</div>
        ) : null}
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3"
          >
            Try again
          </Button>
        ) : null}
      </div>
    </Card>
  );
}