import 'dotenv/config';
import { z } from 'zod';

// Environment schema — fail fast if anything critical is missing.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SERVICE_NAME: z.string().min(1).default('zomato-clone-backend'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PGDATABASE: z.string().default('zomato_clone'),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),
  PG_POOL_IDLE_MS: z.coerce.number().int().nonnegative().default(30000),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_KEY_PREFIX: z.string().default('zclone:'),

  CORS_ORIGINS: z.string().default(''),

  // Optional dev-only seed/admin password overrides.
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[env] invalid environment configuration:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = parseEnv();

export const corsOrigins: string[] = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];