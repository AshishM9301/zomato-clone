import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/response';
import { authenticate, requireRole } from '../../common/middleware/auth';
import { ROLES } from '../../common/constants/roles';
import {
  listNotificationsQuerySchema,
  testNotificationSchema,
} from './notifications.validation';
import * as service from './notifications.service';

const router = Router();

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const q = listNotificationsQuerySchema.parse(req.query);
    const result = await service.listForUser(req.user!.id, q);
    return ok(res, result);
  }),
);

router.post(
  '/me/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await service.markAllRead(req.user!.id);
    return ok(res, result);
  }),
);

router.post(
  '/test',
  authenticate,
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const input = testNotificationSchema.parse(req.body);
    const created1 = await service.createTest(req.user!.id, input);
    return created(res, { queued: true, id: created1.id });
  }),
);

export default router;
