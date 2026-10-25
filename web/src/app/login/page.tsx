"use client";

// Staff sign-in. Three roles share one form; Tabs switch the role before submit.

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Loader2Icon, LogInIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginValues } from "@/lib/schemas/auth";
import { STAFF_ROLES, type StaffRole } from "@/lib/constants";
import { toastApiError, toastOk } from "@/lib/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState<StaffRole>("admin");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    try {
      await login(role, values.email, values.password);
      toastOk(`Signed in as ${role}`);
    } catch (err) {
      toastApiError(err, "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Staff sign in</CardTitle>
          <CardDescription>
            Zomato Clone — admin, merchant, and rider console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="email"
            render={() => <input type="hidden" {...register("email")} />}
          />
          <Controller
            control={control}
            name="password"
            render={() => <input type="hidden" {...register("password")} />}
          />

          <Tabs
            value={role}
            onValueChange={(v) => setRole(v as StaffRole)}
            className="mb-5"
          >
            <TabsList className="w-full">
              {STAFF_ROLES.map((r) => (
                <TabsTrigger key={r} value={r} className="capitalize">
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <LogInIcon />
              )}
              {submitting ? "Signing in..." : `Sign in as ${role}`}
            </Button>
          </form>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Seeded credentials: <code>admin@local</code>, <code>merchant1@local</code>,{" "}
            <code>rider1@local</code>. Password: <code>{`{role}123`}</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}