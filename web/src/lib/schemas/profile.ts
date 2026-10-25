import { z } from "zod";

export const profileSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .max(200, "Business name is too long"),
});

export type ProfileValues = z.infer<typeof profileSchema>;