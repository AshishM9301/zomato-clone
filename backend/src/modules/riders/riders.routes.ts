import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import { updateStatusSchema } from './riders.validation';
import * as service from './riders.service';

const router = Router();

router.get(
  '/me',
  authenticate,
  requireRole(ROLES.RIDER),
  asyncHandler(async (req, res) => {
    const result = await service.getMeForUser(req.user!.id);
    return ok(res, result);
  }),
);

router.patch(
  '/me/status',
  authenticate,
  requireRole(ROLES.RIDER),
  asyncHandler(async (req, res) => {
    const input = updateStatusSchema.parse(req.body);
    const updated = await service.updateStatus(req.user!.id, input);
    return ok(res, updated);
  }),
);

export default router;
