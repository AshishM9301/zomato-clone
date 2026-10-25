import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import { updateMerchantSchema } from './merchants.validation';
import * as service from './merchants.service';

const router = Router();

router.get(
  '/me',
  authenticate,
  requireRole(ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const result = await service.getMeForUser(req.user!.id);
    return ok(res, result);
  }),
);

router.patch(
  '/me',
  authenticate,
  requireRole(ROLES.MERCHANT),
  asyncHandler(async (req, res) => {
    const input = updateMerchantSchema.parse(req.body);
    const updated = await service.updateMe(req.user!.id, input);
    return ok(res, updated);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await service.getPublicById(req.params.id!);
    return ok(res, result);
  }),
);

export default router;
