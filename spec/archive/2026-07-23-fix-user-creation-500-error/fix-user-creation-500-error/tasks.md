# Implementation Tasks

1. Generate UUID for `id` in `PostgresUserStore.create()` using `randomUUID()` from `node:crypto`
2. Add `id` to the INSERT statement and parameter array in `create()`
3. Add `DEFAULT gen_random_uuid()` to the `"id"` column in `backend/migrations/001_init/migration.sql`
4. Add `DEFAULT gen_random_uuid()` to the `"id"` column in root `init-db.sql`
5. Add `DEFAULT gen_random_uuid()` to the `"id"` column in `backend/init-db.sql`
6. Add integration test that calls `PostgresUserStore.create()` against a real Postgres database
7. Run the full test suite to verify no regressions
8. Verify the fix manually by starting the app and creating a user via the API
