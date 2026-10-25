"use client";

// Merchant profile: read-only contact info + editable business name.
// Backed by GET/PATCH /merchants/me.
//
// Note: the backend currently exposes only `business_name` as editable on
// this endpoint. Name/email/phone updates would need a separate users endpoint.

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toastApiError, toastOk } from "@/lib/toast";
import { ApiError } from "@/lib/errors";
import { PageHeader } from "@/components/DataTable";
import { ErrorState, LoadingState } from "@/components/States";
import { profileSchema, type ProfileValues } from "@/lib/schemas/profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type MerchantMeResponse = {
  merchant: {
    id: string;
    user_id: string;
    business_name: string;
    status: "active" | "disabled";
    created_at: string;
    updated_at: string;
  };
  user: {
    id: string;
    role: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  restaurants: Array<{
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    is_open: boolean;
  }>;
};

export default function MerchantProfilePage() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => api.get<MerchantMeResponse>("/merchants/me"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { business_name: "" },
  });

  useEffect(() => {
    if (query.data) reset({ business_name: query.data.merchant.business_name });
  }, [query.data, reset]);

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      api.patch<MerchantMeResponse["merchant"]>("/merchants/me", {
        business_name: values.business_name,
      }),
    onSuccess: () => {
      toastOk("Profile updated");
      qc.invalidateQueries({ queryKey: ["merchant", "me"] });
    },
    onError: (err) => toastApiError(err, "Could not save profile"),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError)
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    );
  if (!query.data) return null;

  const { merchant, user, restaurants } = query.data;

  return (
    <div>
      <PageHeader title="Profile" description="Your business and account details." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((values) => save.mutate(values))}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name</Label>
                <Input
                  id="business_name"
                  className="max-w-md"
                  {...register("business_name")}
                />
                {errors.business_name ? (
                  <p className="text-xs text-destructive">
                    {errors.business_name.message}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Status:{" "}
                <Badge
                  variant={merchant.status === "active" ? "default" : "destructive"}
                >
                  {merchant.status}
                </Badge>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!isDirty || save.isPending}
              >
                {save.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Row k="Owner" v={user.name} />
            <Row k="Email" v={user.email ?? "—"} />
            <Row k="Phone" v={user.phone ?? "—"} />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Owner contact details are managed by the admin.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            {restaurants.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No restaurants on file. Ask an admin to onboard your business.
              </p>
            ) : (
              <ul className="divide-y">
                {restaurants.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.address}</div>
                    </div>
                    <Badge
                      variant={r.is_open ? "default" : "secondary"}
                      className={
                        r.is_open
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : ""
                      }
                    >
                      {r.is_open ? "Open" : "Closed"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
