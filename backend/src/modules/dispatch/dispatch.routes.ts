import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import AppError from '../../common/errors/AppError';
import { ROLES } from '../../common/constants/roles';
import * as service from './dispatch.service';

const router = Router();

router.get(
  '/available',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const items = await service.listAvailable(req.user!.merchantId);
    return ok(res, { items });
  }),
);

router.post(
  '/auto-assign/:orderId',
  authenticate,
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await service.autoAssign(req.params.orderId!);
    return created(res, result);
  }),
);

router.post(
  '/accept/:orderId',
  authenticate,
  requireRole(ROLES.RIDER),
  asyncHandler(async (req, res) => {
    if (!req.user!.riderId) throw AppError.forbidden('Rider identity missing');
    const result = await service.riderAccept(req.params.orderId!, req.user!.riderId);
    return created(res, result);
  }),
);

router.post(
  '/reject/:assignmentId',
  authenticate,
  requireRole(ROLES.RIDER),
  asyncHandler(async (req, res) => {
    if (!req.user!.riderId) throw AppError.forbidden('Rider identity missing');
    const result = await service.riderReject(req.params.assignmentId!, req.user!.riderId);
    return ok(res, result);
  }),
);

export default router;
