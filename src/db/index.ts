import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Validate required environment variables
const requiredEnvVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create Turso/LibSQL client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in other files
export * from './schema';

// Export types for convenience
export type {
  Country,
  NewCountry,
  State,
  NewState,
  City,
  NewCity,
  SourceGroup,
  NewSourceGroup,
  User,
  NewUser,
  Devotee,
  NewDevotee,
  DevoteePhone,
  NewDevoteePhone,
  ReviewFlag,
  NewReviewFlag,
  AuditLog,
  NewAuditLog,
  Campaign,
  NewCampaign,
  CampaignDelivery,
  NewCampaignDelivery,
} from './schema';