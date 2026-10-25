"use client";

// Merchant menu management.
//
// The backend doesn't expose a "list my restaurants" endpoint, so we
// fetch all restaurants and filter by merchantId from the JWT. For MVP
// seed data each merchant has a single restaurant; the UI gracefully
// handles multiple by letting the merchant pick from a dropdown.

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, TrashIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toastApiError, toastOk } from "@/lib/toast";
import { ApiError } from "@/lib/errors";
import { PageHeader } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { formatMoney } from "@/lib/format";
import { menuItemSchema, toPaise, type MenuItemValues } from "@/lib/schemas/menu";
import type { MenuItem, MenuListResponse, Restaurant } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

type SheetMode = { kind: "closed" } | { kind: "edit"; item: MenuItem } | { kind: "add" };

export default function MerchantMenuPage() {
  const { merchantId } = useAuth();
  const qc = useQueryClient();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetMode>({ kind: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  // 1. Fetch all restaurants and filter to ones owned by this merchant.
  const restaurantsQuery = useQuery({
    queryKey: ["restaurants", "all"],
    queryFn: () =>
      api.get<{ items: Restaurant[]; page: number; limit: number }>(
        "/restaurants",
        { limit: 100, include_closed: true },
      ),
  });

  const myRestaurants: Restaurant[] = useMemo(() => {
    const all = restaurantsQuery.data?.items ?? [];
    return all.filter((r) => r.merchant_id === merchantId);
  }, [restaurantsQuery.data, merchantId]);

  // Default the selected restaurant once the list arrives.
  useEffect(() => {
    if (!selectedRestaurantId && myRestaurants.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedRestaurantId(myRestaurants[0]!.id);
    }
  }, [myRestaurants, selectedRestaurantId]);

  // 2. Menu items for the selected restaurant.
  const menuQuery = useQuery({
    queryKey: ["menu", selectedRestaurantId],
    queryFn: () =>
      api.get<MenuListResponse>(
        `/restaurants/${selectedRestaurantId}/menu`,
        { include_unavailable: true },
      ),
    enabled: Boolean(selectedRestaurantId),
  });

  const items: MenuItem[] = menuQuery.data?.items ?? [];

  // 3. Mutations.
  const save = useMutation({
    mutationFn: async (values: MenuItemValues) => {
      if (!selectedRestaurantId) throw new Error("No restaurant selected");
      const body = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        category: values.category?.trim() || null,
        price_cents: toPaise(values.priceRupees),
        is_available: values.is_available,
      };
      if (sheet.kind === "edit") {
        return api.patch<MenuItem>(`/menu/items/${sheet.item.id}`, body);
      }
      return api.post<MenuItem>(
        `/restaurants/${selectedRestaurantId}/menu/items`,
        body,
      );
    },
    onSuccess: () => {
      toastOk(sheet.kind === "edit" ? "Item updated" : "Item added");
      setSheet({ kind: "closed" });
      qc.invalidateQueries({ queryKey: ["menu", selectedRestaurantId] });
    },
    onError: (err) => toastApiError(err, "Could not save item"),
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => api.del<{ id: string }>(`/menu/items/${itemId}`),
    onSuccess: () => {
      toastOk("Item removed");
      qc.invalidateQueries({ queryKey: ["menu", selectedRestaurantId] });
      setDeleteTarget(null);
    },
    onError: (err) => toastApiError(err, "Could not remove item"),
  });

  return (
    <div>
      <PageHeader
        title="Menu management"
        description="Add, edit, and remove items for your restaurant."
        actions={
          selectedRestaurantId ? (
            <Button
              size="sm"
              onClick={() => setSheet({ kind: "add" })}
              disabled={restaurantsQuery.isLoading}
            >
              <PlusIcon />
              Add item
            </Button>
          ) : null
        }
      />

      {/* Restaurant picker */}
      <Card className="mb-4">
        <CardContent className="py-3">
          {restaurantsQuery.isLoading ? (
            <LoadingState label="Loading restaurants..." />
          ) : myRestaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any restaurants yet. Ask an admin to onboard
              your business.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <Label className="text-xs">Restaurant:</Label>
              <Select
                value={selectedRestaurantId ?? ""}
                onValueChange={(v) => {
                  setSelectedRestaurantId(v || null);
                  setSheet({ kind: "closed" });
                }}
              >
                <SelectTrigger size="sm" className="min-w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {myRestaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.is_open ? "" : " (closed)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRestaurantId ? (
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            {menuQuery.isLoading ? <LoadingState /> : null}
            {menuQuery.isError ? (
              <ErrorState
                message={
                  menuQuery.error instanceof ApiError
                    ? menuQuery.error.message
                    : undefined
                }
                onRetry={() => menuQuery.refetch()}
              />
            ) : null}
            {menuQuery.isSuccess && items.length === 0 ? (
              <EmptyState
                title="No items yet"
                description="Add your first item using the button above."
              />
            ) : null}
            {menuQuery.isSuccess && items.length > 0 ? (
              <ul className="divide-y">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {it.name}
                        {!it.is_available ? (
                          <Badge variant="secondary">Unavailable</Badge>
                        ) : null}
                      </div>
                      {it.category ? (
                        <div className="text-xs text-muted-foreground">{it.category}</div>
                      ) : null}
                      {it.description ? (
                        <div className="text-xs text-muted-foreground">{it.description}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-sm font-medium">{formatMoney(it.price_cents)}</div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setSheet({ kind: "edit", item: it })}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="xs"
                          onClick={() => setDeleteTarget(it)}
                          disabled={remove.isPending}
                        >
                          <TrashIcon />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Add / Edit sheet */}
      <ItemSheet
        mode={sheet}
        onClose={() => setSheet({ kind: "closed" })}
        onSubmit={(values) => save.mutate(values)}
        isPending={save.isPending}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TrashIcon className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item from your menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            >
              {remove.isPending ? "Deleting..." : "Delete item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ItemSheet({
  mode,
  onClose,
  onSubmit,
  isPending,
}: {
  mode: SheetMode;
  onClose: () => void;
  onSubmit: (values: MenuItemValues) => void;
  isPending: boolean;
}) {
  const open = mode.kind !== "closed";
  const editing = mode.kind === "edit" ? mode.item : null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MenuItemValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      priceRupees: 0,
      is_available: true,
    },
  });

  const isAvailable = watch("is_available");

  // Reset the form when the sheet opens (add vs edit).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        name: editing.name,
        description: editing.description ?? "",
        category: editing.category ?? "",
        priceRupees: editing.price_cents / 100,
        is_available: editing.is_available,
      });
    } else {
      reset({
        name: "",
        description: "",
        category: "",
        priceRupees: 0,
        is_available: true,
      });
    }
  }, [open, editing, reset]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit item" : "Add item"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the item details below."
              : "Create a new item on your menu."}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...register("category")} />
            {errors.category ? (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priceRupees">Price (₹)</Label>
            <Input
              id="priceRupees"
              type="number"
              step="0.01"
              min="0"
              {...register("priceRupees")}
            />
            {errors.priceRupees ? (
              <p className="text-xs text-destructive">{errors.priceRupees.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="is_available"
              checked={isAvailable}
              onCheckedChange={(c) => setValue("is_available", Boolean(c))}
            />
            <Label htmlFor="is_available" className="cursor-pointer">
              Available for ordering
            </Label>
          </div>
        </form>
        <SheetFooter className="border-t bg-background">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? "Saving..." : editing ? "Save" : "Add"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}