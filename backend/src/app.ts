import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { PrismaUserStore } from './auth/prisma-user-store';
import { type IUserStore } from './auth/users';
import { loadConfig, type AppConfig } from './config';
import { AppError } from './errors';
import { makeAuthenticate, requireRole } from './plugins/guards';
import { registerAdminRoutes } from './routes/admin';
import { registerAuthRoutes } from './routes/auth';
import { registerLogRoutes } from './routes/logs';
import { createStorageProvider } from './storage';

/**
 * Builds a configured Fastify instance. Exported separately from the server
 * entrypoint so tests can use `app.inject()` without opening a socket.
 */
export async function buildApp(
  overrides: Partial<AppConfig> = {},
  userStore?: IUserStore,
): Promise<FastifyInstance> {
  const config = loadConfig(overrides);

  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    trustProxy: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // JSON API — CSP is the frontend's concern
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow CORS-enabled downloads
  });
  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const storage = await createStorageProvider(config);
  const store = userStore ?? new PrismaUserStore();
  const authenticate = makeAuthenticate(config.jwtSecret);
  const requireAdmin = requireRole('admin');

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode =
      error instanceof AppError ? error.statusCode : (error.statusCode ?? 500);
    if (statusCode >= 500) {
      request.log.error(error);
    }
    void reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(error.code && statusCode < 500 ? { code: error.code } : {}),
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({ error: 'Not found' });
  });

  registerAuthRoutes(app, {
    userStore: store,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    authenticate,
  });
  registerLogRoutes(app, {
    storage,
    authenticate,
    presignDefaultExpiresIn: config.presignDefaultExpiresIn,
    presignMaxExpiresIn: config.presignMaxExpiresIn,
  });
  registerAdminRoutes(app, { userStore: store, authenticate, requireAdmin });

  return app;
}