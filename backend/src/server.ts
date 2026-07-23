import { buildApp } from './app';
import { loadConfig } from './config';
import { pool } from './db/client';
import { seedDefaultUsers } from './auth/seed';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp();

  // Connect to Postgres and seed default users
  await pool.connect();
  await seedDefaultUsers(config);

  const shutdown = (signal: string): void => {
    app.log.info({ signal }, 'shutting down');
    void pool.end();
    void app.close().then(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      { provider: config.storageProvider, port: config.port },
      'cloud-log-access backend listening',
    );
  } catch (err) {
    app.log.error(err);
    await pool.end();
    process.exit(1);
  }
}

void main();