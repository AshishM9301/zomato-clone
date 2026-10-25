// API error type. Mirrors web/src/lib/errors.ts.

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
  }
}
