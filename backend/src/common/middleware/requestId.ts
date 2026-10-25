import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attach a stable request id to every request, surfaced both on
 * `req.requestId` and as the `X-Request-Id` response header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

export default requestId;