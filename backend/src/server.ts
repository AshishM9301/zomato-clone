import type { Server } from 'http';
import { env } from './config/env';
import logger from './common/utils/logger';
import { createApp } from './app';
import * as db from './config/db';
import * as redis from './config/redis';

async function main(): Promise<void> {
  const app = createApp();

  const server: Server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'http server listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutdown signal received');
    server.close(async (err) => {
      if (err) logger.error({ err }, 'server close error');
      try {
        await db.close();
      } catch (e) {
        logger.warn({ err: e }, 'db close error');
      }
      try {
        await redis.close();
      } catch (e) {
        logger.warn({ err: e }, 'redis close error');
      }
      process.exit(err ? 1 : 0);
    });
    setTimeout(() => {
      logger.warn('forcing exit after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'fatal during boot');
  process.exit(1);
});