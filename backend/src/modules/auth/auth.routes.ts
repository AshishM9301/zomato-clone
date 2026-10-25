import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/response';
import AppError from '../../common/errors/AppError';
import { authenticate } from '../../common/middleware/auth';
import { COOKIE_NAME, cookieOptions } from '../../common/utils/cookie';
import {
  requestOtpSchema,
  verifyOtpSchema,
  passwordLoginSchema,
} from './auth.validation';
import * as service from './auth.service';
import * as repo from './auth.repository';

const router = Router();

/** Parse + run; throws ZodError on invalid input (handled by errorHandler). */
function parse<T>(schema: { parse: (v: unknown) => T }, v: unknown): T {
  return schema.parse(v);
}

/**
 * Set the auth cookie on the response. Browsers will store it; non-browser
 * clients ignore the Set-Cookie header and continue to read `token` from
 * the response body.
 */
function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

router.post(
  '/customer/request-otp',
  asyncHandler(async (req: Request, res: Response) => {
    const { phone } = parse(requestOtpSchema, req.body);
    const result = await service.requestOtp(phone);
    return ok(res, result);
  }),
);

router.post(
  '/customer/verify-otp',
  asyncHandler(async (req: Request, res: Response) => {
    const input = parse(verifyOtpSchema, req.body);
    const result = await service.verifyOtp(input);
    setAuthCookie(res, result.token);
    return created(res, result);
  }),
);

router.post(
  '/admin/login',
  asyncHandler(async (req: Request, res: Response) => {
    const input = parse(passwordLoginSchema, req.body);
    const result = await service.loginAdmin(input);
    setAuthCookie(res, result.token);
    return ok(res, result);
  }),
);

router.post(
  '/merchant/login',
  asyncHandler(async (req: Request, res: Response) => {
    const input = parse(passwordLoginSchema, req.body);
    const result = await service.loginMerchant(input);
    setAuthCookie(res, result.token);
    return ok(res, result);
  }),
);

router.post(
  '/rider/login',
  asyncHandler(async (req: Request, res: Response) => {
    const input = parse(passwordLoginSchema, req.body);
    const result = await service.loginRider(input);
    setAuthCookie(res, result.token);
    return ok(res, result);
  }),
);

// Idempotent — clears the cookie even if the caller wasn't authenticated.
// Lets a stale UI log out without first having to refresh an expired session.
router.post(
  '/logout',
  asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return ok(res, { loggedOut: true });
  }),
);

// Session probe. Returns the current PublicUser; 401 if the cookie/header
// is missing or expired. Used by the web app on mount to bootstrap auth
// state without storing the JWT in localStorage.
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthenticated();
    const row = await repo.findUserById(req.user.id);
    if (!row) throw AppError.unauthenticated('User no longer exists');
    const extras: { merchantId?: string; riderId?: string } = {};
    if (req.user.merchantId) extras.merchantId = req.user.merchantId;
    if (req.user.riderId) extras.riderId = req.user.riderId;
    return ok(res, { user: service.toPublicUser(row, extras) });
  }),
);

// Reachable only via programmer error — should never be hit in practice.
router.use(() => {
  throw AppError.notFound('Auth route not found');
});

export default router;