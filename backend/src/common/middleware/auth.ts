import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';
import AppError from '../errors/AppError';
import { ALL_ROLES, type Role } from '../constants/roles';
import { COOKIE_NAME } from '../utils/cookie';

export interface AuthUser {
  id: string;
  role: Role;
  merchantId?: string;
  riderId?: string;
}

interface TokenClaims extends JwtPayload {
  sub: string;
  role: Role;
  merchantId?: string;
  riderId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}

/**
 * Verify a Bearer JWT and attach the decoded payload to `req.user`.
 * Throws `AppError.unauthenticated` on failure.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Header first (curl, RN, scripts), then cookie (browser web app).
  let token: string | undefined;
  const header = req.headers.authorization || '';
  const [scheme, headerToken] = header.split(' ');
  if (scheme === 'Bearer' && headerToken) {
    token = headerToken;
  } else if (req.cookies && typeof req.cookies[COOKIE_NAME] === 'string') {
    token = req.cookies[COOKIE_NAME];
  }

  if (!token) {
    return next(AppError.unauthenticated('Missing token'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenClaims;
    if (!decoded || typeof decoded !== 'object' || !decoded.sub || !decoded.role) {
      return next(AppError.unauthenticated('Malformed token payload'));
    }
    if (!ALL_ROLES.includes(decoded.role)) {
      return next(AppError.unauthenticated('Unknown role in token'));
    }
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      ...(decoded.merchantId ? { merchantId: decoded.merchantId } : {}),
      ...(decoded.riderId ? { riderId: decoded.riderId } : {}),
    };
    return next();
  } catch {
    return next(AppError.unauthenticated('Invalid or expired token'));
  }
}

/**
 * Role guard. Use after `authenticate`:
 *   router.get('/admin/x', authenticate, requireRole('admin'), handler)
 */
export function requireRole(...allowed: ReadonlyArray<Role>): RequestHandler {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(AppError.unauthenticated());
    if (allowed.length === 0 || allowed.includes(req.user.role)) return next();
    return next(AppError.forbidden(`Requires role: ${allowed.join(' or ')}`));
  };
}

export default { authenticate, requireRole };