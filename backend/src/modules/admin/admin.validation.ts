import { z } from 'zod';
import { ORDER_STATUS } from '../../common/constants/orderStatus';
import { ROLES } from '../../common/constants/roles';

export const listOrdersQuerySchema = z.object({
  status: z
    .enum([
      ORDER_STATUS.PLACED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY_FOR_PICKUP,
      ORDER_STATUS.ASSIGNED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CANCELLED,
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const listUsersQuerySchema = z.object({
  role: z.enum([ROLES.CUSTOMER, ROLES.MERCHANT, ROLES.RIDER, ROLES.ADMIN]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const setMerchantStatusSchema = z
  .object({
    status: z.enum(['active', 'disabled']),
  })
  .strict();
export type SetMerchantStatusInput = z.infer<typeof setMerchantStatusSchema>;

export const setRiderStatusSchema = z
  .object({
    status: z.enum(['online', 'offline', 'busy']),
  })
  .strict();
export type SetRiderStatusInput = z.infer<typeof setRiderStatusSchema>;

export const listRidersQuerySchema = z.object({
  status: z.enum(['online', 'offline', 'busy']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListRidersQuery = z.infer<typeof listRidersQuerySchema>;

export const listMerchantsQuerySchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListMerchantsQuery = z.infer<typeof listMerchantsQuerySchema>;
