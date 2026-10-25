import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(200);
const priceSchema = z.number().int().nonnegative().max(1_000_000_00);

export const createMenuItemSchema = z
  .object({
    name: nameSchema,
    description: z.string().trim().max(1000).optional(),
    price_cents: priceSchema,
    is_available: z.boolean().optional(),
  })
  .strict();
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = z
  .object({
    name: nameSchema.optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    price_cents: priceSchema.optional(),
    is_available: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
