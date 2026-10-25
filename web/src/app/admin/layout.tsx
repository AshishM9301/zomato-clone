"use client";

import { useRequireRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/States";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, isLoading } = useRequireRole("admin");
  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingState label={isLoading ? "Restoring session..." : "Redirecting..."} />
      </div>
    );
  }
  return <AppShell role="admin">{children}</AppShell>;
}