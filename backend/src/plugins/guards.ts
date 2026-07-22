import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '../auth/jwt';
import { AuthError } from '../errors';
import type { JwtPayload, Role } from '../types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/** Builds the `authenticate` preHandler: validates the Bearer JWT and attaches `request.user`. */
export function makeAuthenticate(secret: string) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AuthError('Authentication required', 401, 'Unauthorized');
    }
    const token = header.slice('Bearer '.length).trim();
    request.user = verifyToken(token, secret);
  };
}

/** Builds a role guard preHandler. Must run after `authenticate`. */
export function requireRole(role: Role) {
  return async function guard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (request.user?.role !== role) {
      throw new AuthError('Insufficient permissions', 403, 'Forbidden');
    }
  };
}