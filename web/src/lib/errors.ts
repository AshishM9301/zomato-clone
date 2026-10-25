// Domain error type for the API client.

export type ApiErrorOptions = {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(opts: ApiErrorOptions) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status ?? 0;
    this.details = opts.details;
  }
}