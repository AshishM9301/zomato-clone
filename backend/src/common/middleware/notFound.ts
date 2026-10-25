import type { Request, Response } from 'express';
import type { ApiErrorBody } from '../utils/response';

/**
 * 404 handler for unknown routes.
 */
export function notFound(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `No route matched ${req.method} ${req.originalUrl}`,
    },
  };
  res.status(404).json(body);
}

export default notFound;