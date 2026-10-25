import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '../constants/roles';

export interface JwtClaims {
  sub: string;
  role: Role;
  merchantId?: string;
  riderId?: string;
}

/** Sign a JWT for a user. `merchantId` / `riderId` are only set for the matching role. */
export function signToken(claims: JwtClaims): string {
  const payload: Record<string, unknown> = { sub: claims.sub, role: claims.role };
  if (claims.merchantId) payload.merchantId = claims.merchantId;
  if (claims.riderId) payload.riderId = claims.riderId;

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}
