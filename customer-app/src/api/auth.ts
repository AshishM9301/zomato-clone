// Auth API endpoints. The customer app uses phone+OTP; the staff app's
// email+password flow is not relevant here.

import { api } from './client';
import type { LoginResponse, MeResponse, User } from '../types';

export type RequestOtpResponse = { sent: boolean; devCode?: string };

export function requestOtp(phone: string): Promise<RequestOtpResponse> {
  return api.post<RequestOtpResponse>('/auth/customer/request-otp', { phone });
}

export function verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/customer/verify-otp', { phone, otp });
}

export function me(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return api.post<{ loggedOut: boolean }>('/auth/logout');
}

export type { User };
