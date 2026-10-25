import pino, { Logger } from 'pino';
import { env } from '../../config/env';

const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: env.SERVICE_NAME, env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;