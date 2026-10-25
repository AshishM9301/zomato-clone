import { z } from 'zod';

export const updateMerchantSchema = z
  .object({
    business_name: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
