import { z } from 'zod';

export const testNotificationSchema = z
  .object({
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type TestNotificationInput = z.infer<typeof testNotificationSchema>;

export const listNotificationsQuerySchema = z.object({
  unread_only: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
