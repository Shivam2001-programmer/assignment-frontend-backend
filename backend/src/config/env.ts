import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local convenience only — in containers, configuration comes from real environment variables.
if (existsSync('.env')) process.loadEnvFile('.env');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Comma-separated list of allowed browser origins, or "*".
  CORS_ORIGIN: z.string().default('*'),
  // Meta App Secret — used to verify X-Hub-Signature-256 on webhook deliveries.
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  // Token echoed back during Meta's GET subscription handshake.
  META_VERIFY_TOKEN: z.string().min(1, 'META_VERIFY_TOKEN is required'),
  // Optional: when set, lead details missing from the webhook are fetched from the Graph API.
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().default('v21.0'),
  WEBHOOK_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    // Fail fast: a misconfigured service should never start accepting traffic.
    console.error(`Invalid environment configuration:\n${problems}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
