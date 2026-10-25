import { z } from 'zod';

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

export const listRestaurantsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  near: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'near must be "lat,lng"')
    .optional(),
  include_closed: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListRestaurantsQuery = z.infer<typeof listRestaurantsQuerySchema>;

export const createRestaurantSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(500),
    lat: latSchema,
    lng: lngSchema,
    merchant_email: z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+$/),
    merchant_password: z.string().min(6).max(200),
    business_name: z.string().trim().min(1).max(200),
  })
  .strict();
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

export const updateRestaurantSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
    is_open: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
