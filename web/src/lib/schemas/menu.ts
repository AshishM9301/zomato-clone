import { z } from "zod";

/**
 * Form schema for a menu item. The UI collects price in rupees; the submit
 * handler converts to paise (integer minor units) before hitting the API.
 */
export const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  priceRupees: z
    .coerce
    .number({ message: "Price must be a number" })
    .positive("Price must be greater than 0")
    .max(100000, "Price is unreasonably large"),
  is_available: z.boolean(),
});

export type MenuItemValues = z.infer<typeof menuItemSchema>;

/** Convert a rupee value to paise (integer minor units). */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert a paise value back to rupees for the form (rounded to 2dp). */
export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}