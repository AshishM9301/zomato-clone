/**
 * Domain error type. Throw anywhere in services / controllers; the
 * `errorHandler` middleware translates these into JSON responses.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }

  static badRequest(msg: string, details?: unknown): AppError {
    return new AppError(400, 'VALIDATION_ERROR', msg, details);
  }
  static unauthenticated(msg = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', msg);
  }
  static forbidden(msg = 'Forbidden'): AppError {
    return new AppError(403, 'FORBIDDEN', msg);
  }
  static notFound(msg = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', msg);
  }
  static conflict(msg: string, details?: unknown): AppError {
    return new AppError(409, 'CONFLICT', msg, details);
  }
  static businessRule(msg: string, details?: unknown): AppError {
    return new AppError(422, 'BUSINESS_RULE', msg, details);
  }
  static internal(msg = 'Internal server error'): AppError {
    return new AppError(500, 'INTERNAL', msg);
  }
}

export default AppError;