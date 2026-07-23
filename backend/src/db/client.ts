import { Pool } from 'pg';

/**
 * Singleton PostgreSQL connection pool for the application.
 */
const globalForPool = globalThis as unknown as { pool?: Pool };

// SSL is disabled for local development and Docker Compose
// Enable SSL only when explicitly requested via environment variable
const sslEnabled = process.env.PGSSLMODE === 'require' || process.env.PGSSLMODE === 'verify-full';

export const pool: Pool =
  globalForPool.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPool.pool = pool;
}