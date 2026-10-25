import Redis, { Redis as RedisClient } from 'ioredis';
import { env } from './env';
import logger from '../common/utils/logger';

let client: RedisClient | null = null;

export function getClient(): RedisClient {
  if (client) return client;

  client = new Redis(env.REDIS_URL, {
    keyPrefix: env.REDIS_KEY_PREFIX,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
  });

  client.on('connect', () => logger.info({ url: env.REDIS_URL }, 'redis connecting'));
  client.on('ready', () => logger.info('redis ready'));
  client.on('error', (err) => logger.error({ err }, 'redis error'));
  client.on('close', () => logger.warn('redis connection closed'));

  return client;
}

export async function ping(): Promise<boolean> {
  const res = await getClient().ping();
  return res === 'PONG';
}

export async function close(): Promise<void> {
  if (!client) return;
  await client.quit();
  client = null;
}