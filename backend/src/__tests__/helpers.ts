import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';

export interface TestContext {
  app: FastifyInstance;
  dataDir: string;
  cleanup: () => Promise<void>;
}

/** Spins up an app instance backed by a temp mock-storage dir (no sockets, uses inject). */
export async function createTestApp(): Promise<TestContext> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cla-test-'));
  const app = await buildApp({
    storageProvider: 'mock',
    jwtSecret: 'test-secret',
    mock: { dataDir },
    publicUrl: 'http://localhost:3001',
  });
  // Silence logs during tests.
  app.log.level = 'silent';
  return {
    app,
    dataDir,
    cleanup: async () => {
      await app.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export async function loginAs(
  app: FastifyInstance,
  username: string,
  password: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login failed (${res.statusCode}): ${res.body}`);
  }
  return (res.json() as { token: string }).token;
}

export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}