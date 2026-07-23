import type { PublicUser, Role, User } from '../types';

/**
 * Async user repository interface.
 * Swap implementations: PrismaUserStore (production) or FakeUserStore (tests).
 */
export interface IUserStore {
  findByUsername(username: string): Promise<User | undefined>;
  list(): Promise<PublicUser[]>;
  create(username: string, name: string, password: string, role: Role): Promise<PublicUser>;
}

/** Converts a full User to a PublicUser (omits passwordHash). */
export function toPublic(user: User): PublicUser {
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}