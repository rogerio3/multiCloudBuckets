import type { AppConfig } from '../config';
import { pool } from '../db/client';
import { hashPassword } from './passwords';
import { randomUUID } from 'crypto';

/**
 * Idempotent seed: creates default admin and viewer users if they don't exist.
 * Called at server startup after database is ready.
 */
export async function seedDefaultUsers(config: AppConfig): Promise<void> {
  const adminHash = hashPassword(config.adminPassword);
  const viewerHash = hashPassword(config.viewerPassword);

  // Use ON CONFLICT DO NOTHING for idempotency
  // Generate UUID using Node.js crypto module
  // Explicitly set DEFAULT for timestamp columns
  await pool.query(
    'INSERT INTO "User" (id, username, name, role, "passwordHash", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, DEFAULT, DEFAULT) ON CONFLICT (username) DO NOTHING',
    [randomUUID(), 'admin', 'Admin User', 'ADMIN', adminHash]
  );

  await pool.query(
    'INSERT INTO "User" (id, username, name, role, "passwordHash", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, DEFAULT, DEFAULT) ON CONFLICT (username) DO NOTHING',
    [randomUUID(), 'viewer', 'Viewer User', 'VIEWER', viewerHash]
  );
}