import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const requiredEnvVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) throw new Error(`Missing required environment variable: ${envVar}`);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
export * from './schema';
