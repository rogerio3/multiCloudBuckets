import type { PublicUser, Role, User } from '../types';
import { hashPassword } from './passwords';
import { toPublic, type IUserStore } from './users';

/**
 * In-memory fake user store for tests.
 * Implements the same IUserStore interface as PrismaUserStore.
 */
export class FakeUserStore implements IUserStore {
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

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.get(username);
  }

  async list(): Promise<PublicUser[]> {
    return [...this.users.values()].map((u) => toPublic(u));
  }

  async create(username: string, name: string, password: string, role: Role): Promise<PublicUser> {
    if (this.users.has(username)) {
      throw new Error('Username already exists');
    }
    const id = `u-${this.users.size + 1}`;
    const user: User = { id, username, name, role, passwordHash: hashPassword(password) };
    this.users.set(username, user);
    return toPublic(user);
  }
}