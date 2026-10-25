import { z } from 'zod';
import { ORDER_STATUS } from '../../common/constants/orderStatus';

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

export const createOrderSchema = z
  .object({
    restaurant_id: z.string().uuid(),
    items: z
      .array(
        z.object({
          menu_item_id: z.string().uuid(),
          qty: z.number().int().positive().max(50),
        }),
      )
      .min(1, 'at least one item required')
      .max(50, 'too many items'),
    address: z.string().trim().min(1).max(500),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

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

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
