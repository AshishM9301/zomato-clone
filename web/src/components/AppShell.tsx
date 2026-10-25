"use client";

// App shell: sidebar + topbar. Renders role-appropriate nav links.
// Used by /admin and /merchant layouts.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { StaffRole } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<StaffRole, NavItem[]> = {
  admin: [
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/riders", label: "Riders" },
    { href: "/admin/merchants", label: "Merchants" },
  ],
  merchant: [
    { href: "/merchant/orders", label: "Orders" },
    { href: "/merchant/menu", label: "Menu" },
    { href: "/merchant/profile", label: "Profile" },
  ],
  rider: [
    { href: "/rider/orders", label: "Orders" },
  ],
};

function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AppShell({
  role,
  children,
}: {
  role: StaffRole;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[role];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background md:flex-row">
      <aside className="w-full border-b border-border bg-card md:w-60 md:border-b-0 md:border-r">
        <div className="px-5 py-4">
          <Link href="/" className="text-sm font-semibold text-foreground">
            Zomato Clone
          </Link>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {role} dashboard
          </div>
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-2 md:pb-0">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initialsOf(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="text-sm font-medium text-foreground">
                {user?.name ?? user?.email ?? "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void logout("/login");
              }}
            >
              <LogOutIcon />
              Log out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}