// fetch wrapper, Bearer auth, envelope decode, ApiError. Mirrors
// web/src/lib/api.ts but uses react-native-keychain for the token and
// dispatches an event (not a window event) for UNAUTHENTICATED.

import { env } from '../env';
import { getToken, clearToken } from '../auth/storage';
import { ApiError } from './errors';

export const AUTH_UNAUTHORIZED_EVENT = 'zc:auth:unauthorized';

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!query) return `${base}${cleanPath}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}${cleanPath}?${qs}` : `${base}${cleanPath}`;
}

type RequestOpts = {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
};

type Envelope<T> =
  | { success: true; data: T; meta?: unknown }
  | { success: false; error: { code: string; message: string; details?: unknown }; requestId?: string };

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    // Network failure — distinguish abort from real network error.
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: e instanceof Error ? e.message : 'Network error',
      status: 0,
    });
  }

  let envelope: Envelope<T> | null = null;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError({
      code: 'INTERNAL',
      message: `Invalid response (${res.status})`,
      status: res.status,
    });
  }

  if (envelope.success) return envelope.data;

  // Error branch.
  const err = envelope.error;
  if (err.code === 'UNAUTHENTICATED') {
    // Clear local token and notify the auth context.
    await clearToken().catch(() => undefined);
    // Use a simple custom event so RN's EventTarget-like API works in Hermes.
    emitUnauthorized();
  }
  throw new ApiError({
    code: err.code,
    message: err.message,
    status: res.status,
    details: err.details,
  });
}

function emitUnauthorized() {
  // Hermes doesn't expose EventTarget on the global, so we use a tiny registry.
  unauthorizedListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(fn: () => void): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

export const api = {
  get: <T,>(path: string, query?: RequestOpts['query']) =>
    request<T>('GET', path, { query }),
  post: <T,>(path: string, body?: unknown) =>
    request<T>('POST', path, { body }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>('PUT', path, { body }),
  del: <T,>(path: string) => request<T>('DELETE', path),
};
