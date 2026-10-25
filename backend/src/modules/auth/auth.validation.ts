import { z } from 'zod';

// E.164-style phone is loose on purpose — providers differ.
const phoneSchema = z
  .string()
  .trim()
  .min(7, 'phone too short')
  .max(20, 'phone too long')
  .regex(/^\+?[0-9]+$/, 'phone must be digits, optional leading +');

const otpSchema = z.string().regex(/^[0-9]{6}$/, 'otp must be 6 digits');

// Local-dev friendly: allow `name@host` with no TLD (e.g. `merchant1@local`).
// For production, swap in a stricter validator behind the same field.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+$/, 'invalid email');
const passwordSchema = z.string().min(6, 'password must be at least 6 chars').max(200);

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const passwordLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
