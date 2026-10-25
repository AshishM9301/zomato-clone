/**
 * Migrations runner. Reads every `.sql` file in `db/migrations/` in lexical
 * order, applies pending files inside a transaction, and records the filename
 * in `schema_migrations`. Idempotent — safe to re-run.
 *
 * Usage: `npm run migrate`
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import * as db from '../src/config/db';
import logger from '../src/common/utils/logger';

// scripts/migrate.ts → backend/ → <root>
const backendRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(backendRoot, 'db', 'migrations');

async function ensureMigrationsTable(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function loadMigrationFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(migrationsDir);
    return entries
      .filter((name) => name.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function loadAppliedMigrations(client: import('pg').PoolClient): Promise<Set<string>> {
  const res = await client.query<{ id: string }>('SELECT id FROM schema_migrations');
  return new Set(res.rows.map((r) => r.id));
}

async function applyMigration(client: import('pg').PoolClient, filename: string): Promise<void> {
  const filePath = path.join(migrationsDir, filename);
  const sql = await fs.readFile(filePath, 'utf8');

  logger.info({ migration: filename }, 'applying migration');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    logger.info({ migration: filename }, 'migration applied');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

async function main(): Promise<void> {
  logger.info({ migrationsDir }, 'migrate: starting');

  // Touch the pool so we fail fast with a clear log if Postgres is unreachable.
  await db.ping();

  const files = await loadMigrationFiles();
  if (files.length === 0) {
    logger.warn('migrate: no migration files found');
    return;
  }

  const client = await db.getPool().connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await loadAppliedMigrations(client);
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      logger.info({ count: files.length }, 'migrate: nothing to apply');
      return;
    }

    for (const filename of pending) {
      await applyMigration(client, filename);
    }

    logger.info(
      { applied: pending.length, total: files.length },
      'migrate: complete',
    );
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    logger.error({ err }, 'migrate: failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close().catch(() => undefined);
  });
