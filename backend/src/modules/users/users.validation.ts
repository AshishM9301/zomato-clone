import { z } from 'zod';

const nameSchema = z.string().trim().min(1, 'name required').max(120);

// customers cannot change email (it's null for them).
export const updateMeSchema = z
  .object({
    name: nameSchema.optional(),
  })
  .strict();
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
