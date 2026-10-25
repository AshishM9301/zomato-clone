// Thin wrapper over sonner so call sites read like the old `useToast` API.
// Handles ApiError unwrapping (message becomes the title, code becomes the
// description) so the rest of the code doesn't have to reach for the error
// class directly.

import { toast } from "sonner";
import { ApiError } from "./errors";

export function toastOk(message: string, description?: string): void {
  toast.success(message, description ? { description } : undefined);
}

export function toastInfo(message: string, description?: string): void {
  toast.info(message, description ? { description } : undefined);
}

export function toastWarn(message: string, description?: string): void {
  toast.warning(message, description ? { description } : undefined);
}

/**
 * Render an error as a destructive toast. Mirrors the old `pushError`:
 * - Uses `err.message` as the title.
 * - If `err` is an `ApiError`, appends `Code: <code>` to the description.
 * - Falls back to `fallback` as the title if the error has no message.
 */
export function toastApiError(err: unknown, fallback: string): void {
  if (err instanceof ApiError) {
    const title = err.message || fallback;
    const description = err.code && err.code !== "INTERNAL" ? `Code: ${err.code}` : undefined;
    toast.error(title, description ? { description } : undefined);
    return;
  }
  if (err instanceof Error && err.message) {
    toast.error(err.message);
    return;
  }
  toast.error(fallback);
}