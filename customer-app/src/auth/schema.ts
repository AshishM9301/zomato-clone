// Zod schemas for the customer auth forms.

import { z } from 'zod';

// Phone: optional leading +; 7–20 digits. Backend's zod is roughly
// `^\\+?[0-9]{7,20}$` per backend/src/modules/auth/auth.validation.ts.
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,20}$/, 'Enter a valid phone number (7–20 digits).');

export const phoneSchema = z.object({ phone: phoneField });
export type PhoneValues = z.infer<typeof phoneSchema>;

const otpField = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'OTP must be 6 digits.');

export const otpSchema = z.object({ otp: otpField });
export type OtpValues = z.infer<typeof otpSchema>;

export const cancelReasonSchema = z
  .string()
  .trim()
  .min(1, 'Please give a reason.')
  .max(500);
export type CancelReasonValues = z.infer<typeof cancelReasonSchema>;
