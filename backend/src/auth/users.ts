import type { PublicUser, User } from '../types';
import { hashPassword } from './passwords';

/**
 * In-memory user store with seeded default users.
 * Intentionally simple for the MVP — swap for a real database later.
 */
export class UserStore {
  private readonly users = new Map<string, User>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const defaults: Array<Omit<User, 'passwordHash'> & { password: string }> = [
      { id: 'u-1', username: 'admin', name: 'Admin User', role: 'admin', password: 'admin123' },
      { id: 'u-2', username: 'viewer', name: 'Viewer User', role: 'viewer', password: 'viewer123' },
    ];
    for (const { password, ...user } of defaults) {
      this.users.set(user.username, { ...user, passwordHash: hashPassword(password) });
    }
  }

  findByUsername(username: string): User | undefined {
    return this.users.get(username);
  }

  list(): PublicUser[] {
    return [...this.users.values()].map((u) => UserStore.toPublic(u));
  }

  static toPublic(user: User): PublicUser {
    return { id: user.id, username: user.username, name: user.name, role: user.role };
  }
}