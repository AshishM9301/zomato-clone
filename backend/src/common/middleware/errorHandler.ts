import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import AppError from '../errors/AppError';
import logger from '../utils/logger';
import type { ApiErrorBody } from '../utils/response';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Final error formatter. Anything reaching here becomes the standard
 * error envelope. Unknown errors are logged with full stack and
 * surfaced as a generic 500 to the client.
 */
export function errorHandler(
  err: ErrorWithStatus | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, requestId }, 'app error (server)');
    } else {
      logger.warn(
        { err: { code: err.code, message: err.message }, requestId },
        'app error',
      );
    }
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      requestId,
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      requestId,
    };
    res.status(400).json(body);
    return;
  }

  logger.error({ err, requestId }, 'unhandled error');
  const body: ApiErrorBody = {
    success: false,
    error: { code: 'INTERNAL', message: 'Internal server error' },
    requestId,
  };
  res.status(500).json(body);
}

export default errorHandler;