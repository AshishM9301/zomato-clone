import { getClient } from '../../config/redis';
import { env } from '../../config/env';
import logger from '../../common/utils/logger';
import AppError from '../../common/errors/AppError';
import { signToken, type JwtClaims } from '../../common/utils/jwt';
import { verifyPassword } from '../../common/utils/password';
import { ROLES, type Role } from '../../common/constants/roles';
import * as repo from './auth.repository';
import type { PasswordLoginInput, VerifyOtpInput } from './auth.validation';

const OTP_TTL_SECONDS = 300; // 5 minutes
const otpKey = (phone: string) => `otp:${phone}`;

function generateOtp(): string {
  // 6-digit numeric OTP. crypto-free to keep the helper sync.
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export interface PublicUser {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string;
  merchantId?: string;
  riderId?: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export function toPublicUser(
  row: repo.UserRow,
  extras: { merchantId?: string; riderId?: string } = {},
): PublicUser {
  return {
    id: row.id,
    role: row.role,
    phone: row.phone,
    email: row.email,
    name: row.name,
    ...(extras.merchantId ? { merchantId: extras.merchantId } : {}),
    ...(extras.riderId ? { riderId: extras.riderId } : {}),
  };
}

function buildTokenAndUser(
  row: repo.UserRow,
  extras: { merchantId?: string; riderId?: string } = {},
): AuthResult {
  const claims: JwtClaims = {
    sub: row.id,
    role: row.role,
    ...(extras.merchantId ? { merchantId: extras.merchantId } : {}),
    ...(extras.riderId ? { riderId: extras.riderId } : {}),
  };
  return { token: signToken(claims), user: toPublicUser(row, extras) };
}

// ---------- customer OTP ----------

export interface RequestOtpResult {
  sent: true;
  /** Only present outside production. */
  devCode?: string;
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const code = generateOtp();
  const redis = getClient();
  await redis.set(otpKey(phone), code, 'EX', OTP_TTL_SECONDS);

  logger.info({ phone, ttlSeconds: OTP_TTL_SECONDS }, 'otp: issued (dev stub)');

  const result: RequestOtpResult = { sent: true };
  if (env.NODE_ENV !== 'production') {
    result.devCode = code;
  }
  return result;
}

export async function verifyOtp(input: VerifyOtpInput): Promise<AuthResult> {
  const redis = getClient();
  const stored = await redis.get(otpKey(input.phone));
  if (!stored || stored !== input.otp) {
    throw AppError.unauthenticated('Invalid or expired OTP');
  }
  // One-time use.
  await redis.del(otpKey(input.phone));

  let user = await repo.findUserByPhone(input.phone);
  if (!user) {
    user = await repo.createCustomer({ phone: input.phone });
    logger.info({ userId: user.id, phone: input.phone }, 'customer created on first otp');
  } else if (user.role !== ROLES.CUSTOMER) {
    // Phone registered under a different role — reject to prevent identity confusion.
    throw AppError.conflict('Phone is registered under a different account type');
  }

  return buildTokenAndUser(user);
}

// ---------- password login (admin/merchant/rider) ----------

async function loginWithPassword(
  input: PasswordLoginInput,
  expectedRole: Role,
): Promise<AuthResult> {
  const user = await repo.findUserByEmail(input.email);
  if (!user || user.role !== expectedRole) {
    throw AppError.unauthenticated('Invalid credentials');
  }
  if (!user.password_hash) {
    // Defensive: should never happen because the schema enforces this.
    throw AppError.internal('Account is missing a password');
  }
  const ok = await verifyPassword(input.password, user.password_hash);
  if (!ok) {
    throw AppError.unauthenticated('Invalid credentials');
  }

  let merchantId: string | undefined;
  let riderId: string | undefined;

  if (user.role === ROLES.MERCHANT) {
    const m = await repo.findMerchantByUserId(user.id);
    if (!m) throw AppError.internal('Merchant profile missing');
    if (m.status === 'disabled') throw AppError.forbidden('Merchant account is disabled');
    merchantId = m.id;
  } else if (user.role === ROLES.RIDER) {
    const r = await repo.findRiderByUserId(user.id);
    if (!r) throw AppError.internal('Rider profile missing');
    riderId = r.id;
  }

  return buildTokenAndUser(user, { merchantId, riderId });
}

export function loginAdmin(input: PasswordLoginInput): Promise<AuthResult> {
  return loginWithPassword(input, ROLES.ADMIN);
}

export function loginMerchant(input: PasswordLoginInput): Promise<AuthResult> {
  return loginWithPassword(input, ROLES.MERCHANT);
}

export function loginRider(input: PasswordLoginInput): Promise<AuthResult> {
  return loginWithPassword(input, ROLES.RIDER);
}
