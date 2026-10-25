import { z } from 'zod';

export const riderStatusEnum = z.enum(['online', 'offline', 'busy']);

export const updateStatusSchema = z
  .object({
    status: riderStatusEnum,
  })
  .strict();
export type UpdateRiderStatusInput = z.infer<typeof updateStatusSchema>;
