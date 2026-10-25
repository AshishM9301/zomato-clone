"use client";

// Root: redirect to the right landing page based on auth state.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ROLE_HOME, type StaffRole } from "@/lib/constants";
import { LoadingState } from "@/components/States";

export default function Home() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(role ? ROLE_HOME[role as StaffRole] : "/login");
  }, [role, isLoading, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <LoadingState label="Loading..." />
    </div>
  );
}