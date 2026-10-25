import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
} from './orders.validation';
import * as service from './orders.service';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole(ROLES.CUSTOMER),
  asyncHandler(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const result = await service.create(req.user!.id, input);
    return created(res, result);
  }),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await service.getById(req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
      ...(req.user!.riderId ? { riderId: req.user!.riderId } : {}),
    });
    return ok(res, result);
  }),
);

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const q = listOrdersQuerySchema.parse(req.query);
    const result = await service.list(q, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
      ...(req.user!.riderId ? { riderId: req.user!.riderId } : {}),
    });
    return ok(res, result);
  }),
);

router.post(
  '/:id/confirm',
  authenticate,
  requireRole(ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const order = await service.confirm(req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return ok(res, order);
  }),
);

router.post(
  '/:id/preparing',
  authenticate,
  requireRole(ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const order = await service.preparing(req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return ok(res, order);
  }),
);

router.post(
  '/:id/ready',
  authenticate,
  requireRole(ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const order = await service.ready(req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
    });
    return ok(res, order);
  }),
);

router.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const input = cancelOrderSchema.parse(req.body);
    const order = await service.cancel(req.params.id!, input, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.merchantId ? { merchantId: req.user!.merchantId } : {}),
      ...(req.user!.riderId ? { riderId: req.user!.riderId } : {}),
    });
    return ok(res, order);
  }),
);

router.post(
  '/:id/delivered',
  authenticate,
  requireRole(ROLES.RIDER),
  asyncHandler(async (req, res) => {
    const order = await service.markDelivered(req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.riderId ? { riderId: req.user!.riderId } : {}),
    });
    return ok(res, order);
  }),
);

router.post(
  '/:id/picked-up',
  authenticate,
  requireRole(ROLES.RIDER),
  asyncHandler(async (req, res) => {
    const order = await service.markPickedUp(req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
      ...(req.user!.riderId ? { riderId: req.user!.riderId } : {}),
    });
    return ok(res, order);
  }),
);

export default router;
