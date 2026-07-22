import jwt from 'jsonwebtoken';
import { AuthError } from '../errors';
import type { JwtPayload } from '../types';

export function signToken(
  payload: JwtPayload,
  secret: string,
  expiresIn: number,
): { token: string; expiresAt: string } {
  const token = jwt.sign(payload, secret, { expiresIn });
  return { token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

/** Verifies a token, mapping JWT errors to spec-compliant 401 responses. */
export function verifyToken(token: string, secret: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string') {
      throw new Error('Unexpected token payload');
    }
    return { sub: decoded.sub as string, username: decoded.username as string, role: decoded.role as JwtPayload['role'] };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token expired', 401, 'TokenExpired');
    }
    if (err instanceof AuthError) throw err;
    throw new AuthError('Invalid token', 401, 'InvalidToken');
  }
}