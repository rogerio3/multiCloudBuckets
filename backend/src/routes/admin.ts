import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { UserStore } from '../auth/users';

interface AdminRouteOptions {
  userStore: UserStore;
  authenticate: preHandlerHookHandler;
  requireAdmin: preHandlerHookHandler;
}

/** Admin-only endpoints — demonstrate role-based authorization (viewer → 403). */
export function registerAdminRoutes(app: FastifyInstance, opts: AdminRouteOptions): void {
  app.get(
    '/api/admin/users',
    { preHandler: [opts.authenticate, opts.requireAdmin] },
    async () => ({ users: opts.userStore.list() }),
  );
}