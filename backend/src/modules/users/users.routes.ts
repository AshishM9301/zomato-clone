import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/response';
import { authenticate } from '../../common/middleware/auth';
import { updateMeSchema } from './users.validation';
import * as service from './users.service';

const router = Router();

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await service.getMe(req.user!.id);
    return ok(res, user);
  }),
);

router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const input = updateMeSchema.parse(req.body);
    const updated = await service.updateMe(req.user!.id, input);
    return ok(res, updated);
  }),
);

export default router;
