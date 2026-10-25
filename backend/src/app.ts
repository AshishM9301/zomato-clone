import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env, corsOrigins } from './config/env';
import logger from './common/utils/logger';
import { requestId } from './common/middleware/requestId';
import { httpLogger } from './common/middleware/logger';
import { errorHandler } from './common/middleware/errorHandler';
import { notFound } from './common/middleware/notFound';
import * as db from './config/db';
import * as redis from './config/redis';

import apiRouter from './routes';

/**
 * Compose the Express app. No `listen` here — see `server.ts`.
 * Keeps the app trivially testable in-process.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // --- Core middleware ---
  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false }));

  // --- Health ---
  app.get('/healthz', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.get('/readyz', async (_req, res) => {
    const checks: { db: boolean; redis: boolean } = { db: false, redis: false };
    try {
      checks.db = await db.ping();
    } catch (err) {
      logger.warn({ err }, 'readiness: db ping failed');
    }
    try {
      checks.redis = await redis.ping();
    } catch (err) {
      logger.warn({ err }, 'readiness: redis ping failed');
    }
    const ready = checks.db && checks.redis;
    res.status(ready ? 200 : 503).json({
      success: ready,
      data: { status: ready ? 'ready' : 'degraded', checks },
    });
  });

  // --- API ---
  app.use('/api/v1', apiRouter);

  // --- Errors ---
  app.use(notFound);
  app.use(errorHandler);

  logger.info('app composed');
  return app;
}

export default { createApp };