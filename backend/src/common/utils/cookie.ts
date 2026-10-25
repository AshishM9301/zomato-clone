// Cookie config for the auth token.
//
// The browser web app stores the JWT in an httpOnly cookie so JS (XSS) can't
// read it. Non-browser clients (RN, curl, scripts) keep using the
// `Authorization: Bearer …` header; the JWT middleware in
// `common/middleware/auth.ts` accepts both.

import { env } from '../../config/env';

export const COOKIE_NAME = 'zc_token';

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Parse a JWT_EXPIRES_IN string (`'7d'`, `'24h'`, `'30m'`, or seconds) into ms.
 * Falls back to a 7-day default on anything we can't parse — better than
 * rejecting the cookie config.
 */
export function parseExpiryMs(value: string | undefined): number {
  if (!value) return DEFAULT_MAX_AGE_MS;
  const match = value.trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return DEFAULT_MAX_AGE_MS;
  const n = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const mult =
    unit === 'd' ? 24 * 60 * 60 * 1000 :
    unit === 'h' ? 60 * 60 * 1000 :
    unit === 'm' ? 60 * 1000 :
    1000;
  return n * mult;
}

/**
 * Options used by `res.cookie(...)` when setting/clearing the auth token.
 *
 * - `httpOnly: true` — JS can't read the cookie, defeats XSS exfiltration.
 * - `sameSite: 'lax'` — blocks the cookie on cross-site POSTs, the only
 *   CSRF vector for this app. Same-site top-level GETs still carry it, so
 *   a logged-in user following a link from another origin lands authenticated.
 * - `secure: NODE_ENV === 'production'` — requires HTTPS in prod; off in dev
 *   so http://localhost flows work.
 * - `path: '/'` — needed so the cookie is sent to `/api/v1/*` routes.
 * - `maxAge` — matches JWT_EXPIRES_IN so the cookie expires alongside the token.
 */
export function cookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: parseExpiryMs(env.JWT_EXPIRES_IN),
  };
}