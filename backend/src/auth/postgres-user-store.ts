import { randomUUID } from 'node:crypto';
import type { Role, User, PublicUser } from '../types';
import { pool } from '../db/client';
import { hashPassword } from './passwords';
import { toPublic, type IUserStore } from './users';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  password_hash: string;
  created_at?: string;
}

/**
 * Production user repository backed by Postgres via raw SQL.
 */
export class PostgresUserStore implements IUserStore {
  private fromRow(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role.toLowerCase() as Role,
      passwordHash: row.password_hash,
    };
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const { rows } = await pool.query<UserRow>(
      'SELECT id, username, name, role, "passwordHash" AS password_hash FROM "User" WHERE username = $1',
      [username]
    );
    if (rows.length === 0) return undefined;
    return this.fromRow(rows[0]);
  }

  async list(): Promise<PublicUser[]> {
    const { rows } = await pool.query<UserRow>(
      'SELECT id, username, name, role, "passwordHash" AS password_hash FROM "User" ORDER BY "createdAt" ASC'
    );
    return rows.map((u: UserRow) => toPublic(this.fromRow(u)));
  }

  async create(username: string, name: string, password: string, role: Role): Promise<PublicUser> {
    const { rows } = await pool.query<UserRow>(
      'INSERT INTO "User" (id, username, name, role, "passwordHash") VALUES ($1, $2, $3, $4, $5) RETURNING id, username, name, role, "passwordHash" AS password_hash',
      [randomUUID(), username, name, role.toUpperCase() as 'ADMIN' | 'VIEWER', hashPassword(password)]
    );
    return toPublic(this.fromRow(rows[0]));
  }
}