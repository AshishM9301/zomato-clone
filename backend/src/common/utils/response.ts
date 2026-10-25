import type { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ success: true, data } as ApiSuccess<T>);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function error(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const errBody: ApiErrorBody['error'] = { code, message };
  if (details !== undefined) errBody.details = details;
  return res.status(status).json({ success: false, error: errBody } as ApiErrorBody);
}