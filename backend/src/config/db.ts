import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import logger from '../common/utils/logger';

/**
 * PostgreSQL connection pool.
 *
 * Lazy-initialised so that booting the app in an environment without DB
 * access (e.g. docs generation, CI lint) doesn't immediately throw.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    max: env.PG_POOL_MAX,
    idleTimeoutMillis: env.PG_POOL_IDLE_MS,
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'unexpected pg pool error');
  });

  logger.info(
    { host: env.PGHOST, port: env.PGPORT, db: env.PGDATABASE },
    'pg pool initialised',
  );

  return pool;
}

export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>,
): Promise<QueryResult<R>> {
  return getPool().query<R>(text, params as unknown[] | undefined);
}

export async function ping(): Promise<boolean> {
  const res = await getPool().query<{ ok: number }>('SELECT 1 AS ok');
  return res.rows[0]?.ok === 1;
}

export async function close(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export type { PoolClient };