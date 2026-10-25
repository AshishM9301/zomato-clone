// API client. Thin fetch wrapper around the backend's `/api/v1/*` endpoints.
//
// Responsibilities:
// - Prepend API base URL (`NEXT_PUBLIC_API_BASE_URL`).
// - Send credentials so the backend's httpOnly auth cookie is included on
//   cross-origin requests (`credentials: "include"`).
// - Decode the standard response envelope `{ success, data | error }`.
// - Normalize errors into `ApiError` so callers can `instanceof ApiError`.
// - Dispatch `auth:unauthorized` on `UNAUTHENTICATED` so the auth provider
//   can clear local state and route back to /login.

import { ApiError } from "./errors";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  // Custom signal for cancellation.
  signal?: AbortSignal;
};

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${cleanPath}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, signal } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      // Browser sends the backend's httpOnly auth cookie along with this
      // request. CORS on the backend already has `credentials: true`.
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    // Network / CORS / aborted.
    if ((err as { name?: string })?.name === "AbortError") {
      throw err;
    }
    throw new ApiError({
      code: "NETWORK_ERROR",
      message:
        err instanceof Error
          ? err.message
          : "Unable to reach the API. Is the backend running?",
      status: 0,
    });
  }

  // Try to parse JSON; tolerate empty bodies.
  let payload: ApiEnvelope<T> | null = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      throw new ApiError({
        code: "INVALID_RESPONSE",
        message: "Backend returned non-JSON.",
        status: res.status,
      });
    }
  }

  if (!res.ok || !payload || payload.success === false) {
    const err =
      payload && payload.success === false
        ? payload.error
        : {
            code: "INTERNAL",
            message: `Request failed with status ${res.status}`,
          };
    if (err.code === "UNAUTHENTICATED") {
      // Cookie is missing/expired. Tell the auth provider to clear state.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }
    throw new ApiError({
      code: err.code,
      message: err.message,
      details: err.details,
      status: res.status,
    });
  }

  return payload.data;
}

// Convenience wrappers.
export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], opts?: Omit<RequestOptions, "method" | "query" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET", query }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};