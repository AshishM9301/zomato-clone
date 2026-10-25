import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
} from './menus.validation';
import * as service from './menus.service';

const router = Router();

const listQuerySchema = z.object({
  include_unavailable: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});

router.get(
  '/restaurants/:id/menu',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const items = await service.listForRestaurant(req.params.id!, q.include_unavailable ?? false);
    return ok(res, { restaurantId: req.params.id, items });
  }),
);

router.post(
  '/restaurants/:id/menu/items',
  authenticate,
  requireRole(ROLES.MERCHANT, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const input = createMenuItemSchema.parse(req.body);
    const item = await service.create(req.params.id!, input, {
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return created(res, item);
  }),
);

router.patch(
  '/menu/items/:itemId',
  authenticate,
  requireRole(ROLES.MERCHANT, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateMenuItemSchema.parse(req.body);
    const item = await service.update(req.params.itemId!, input, {
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return ok(res, item);
  }),
);

router.delete(
  '/menu/items/:itemId',
  authenticate,
  requireRole(ROLES.MERCHANT, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await service.remove(req.params.itemId!, {
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return ok(res, result);
  }),
);

export default router;
