# Proposal: Fix 500 Error on Admin User Creation

**Change ID**: `fix-user-creation-500-error`
**Status**: Draft
**Scope**: Backend — `PostgresUserStore.create()` and database migration

---

## Why

When an admin user creates a new user via `POST /api/admin/users`, the system
returns **HTTP 500 Internal Server Error** instead of the expected HTTP 201.

### Root Cause

The `PostgresUserStore.create()` method in
`backend/src/auth/postgres-user-store.ts` executes a raw SQL `INSERT` that does
**not** include the `id` column:

```sql
INSERT INTO "User" (username, name, role, "passwordHash")
VALUES ($1, $2, $3, $4)
RETURNING id, username, name, role, "passwordHash" AS password_hash
```

The database schema declares `id String @id @default(cuid())`, but
`@default(cuid())` is a **client-side** default — the application generates the
value before sending the query. Since `PostgresUserStore` uses the `pg` driver
with raw SQL (without a client-side default), no `id` is generated.

The database table (created by both `init-db.sql` and the migration
`001_init/migration.sql`) defines `"id" TEXT NOT NULL` with **no `DEFAULT`
clause**. The result is a PostgreSQL `NOT NULL` constraint violation
(error code `23502`), which the Fastify error handler maps to HTTP 500 because
it is not an `AppError`.

### Why Tests Don't Catch It

The test suite uses `FakeUserStore` (in-memory), which generates its own
`id` (`u-${size + 1}`). The `seedDefaultUsers()` function also works because
it explicitly provides `randomUUID()` as the `id`.

---

## What Changes

1. **`backend/src/auth/postgres-user-store.ts`** — Generate a UUID
   (`randomUUID()`) for the `id` column in `create()`, matching the pattern
   already used by `seed.ts`.

2. **`backend/migrations/001_init/migration.sql`** — Add
   `DEFAULT gen_random_uuid()` to the `"id"` column as defense-in-depth so
   future raw-SQL inserts are protected.

3. **`init-db.sql`** (root and `backend/`) — Add `DEFAULT gen_random_uuid()`
   to the `"id"` column for consistency with the migration.

4. **`backend/src/__tests__/admin.test.ts`** — Add a test that exercises
   `PostgresUserStore.create()` directly (or via an integration test) to
   prevent regression.

---

## Impact

| Area | Impact |
|------|--------|
| **API** | `POST /api/admin/users` returns 201 instead of 500 |
| **Database** | Migration adds a `DEFAULT` to `id` — no data migration needed |
| **Tests** | New test covers the `PostgresUserStore` code path |
| **Users** | Admins can create users without errors |
| **Breaking** | None |
