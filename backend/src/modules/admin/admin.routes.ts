import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import {
  listMerchantsQuerySchema,
  listOrdersQuerySchema,
  listRidersQuerySchema,
  listUsersQuerySchema,
  setMerchantStatusSchema,
  setRiderStatusSchema,
} from './admin.validation';
import * as service from './admin.service';

const router = Router();

router.use(authenticate, requireRole(ROLES.ADMIN));

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const q = listOrdersQuerySchema.parse(req.query);
    const result = await service.listOrders(q);
    return ok(res, result);
  }),
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = listUsersQuerySchema.parse(req.query);
    const result = await service.listUsers(q);
    return ok(res, result);
  }),
);

router.get(
  '/riders',
  asyncHandler(async (req, res) => {
    const q = listRidersQuerySchema.parse(req.query);
    const result = await service.listRiders(q);
    return ok(res, result);
  }),
);

router.get(
  '/merchants',
  asyncHandler(async (req, res) => {
    const q = listMerchantsQuerySchema.parse(req.query);
    const result = await service.listMerchants(q);
    return ok(res, result);
  }),
);

router.patch(
  '/merchants/:id/status',
  asyncHandler(async (req, res) => {
    const input = setMerchantStatusSchema.parse(req.body);
    const result = await service.setMerchantStatus(req.params.id!, input);
    return ok(res, result);
  }),
);

router.patch(
  '/riders/:id/status',
  asyncHandler(async (req, res) => {
    const input = setRiderStatusSchema.parse(req.body);
    const result = await service.setRiderStatus(req.params.id!, input);
    return ok(res, result);
  }),
);

router.post(
  '/orders/:id/refund',
  asyncHandler(async (req, res) => {
    const result = await service.refundOrder(req.params.id!);
    return created(res, result);
  }),
);

export default router;
