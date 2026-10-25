import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import {
  listRestaurantsQuerySchema,
  createRestaurantSchema,
  updateRestaurantSchema,
} from './restaurants.validation';
import * as service from './restaurants.service';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listRestaurantsQuerySchema.parse(req.query);
    const items = await service.list(q);
    return ok(res, { items, page: q.page, limit: q.limit });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const r = await service.getById(req.params.id!);
    return ok(res, r);
  }),
);

router.post(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const input = createRestaurantSchema.parse(req.body);
    const r = await service.create(input);
    return created(res, r);
  }),
);

router.patch(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const input = updateRestaurantSchema.parse(req.body);
    const r = await service.update(req.params.id!, input, {
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return ok(res, r);
  }),
);

export default router;
