# Implementation Tasks

## Phase 1: Foundation

1. Add `prisma` and `@prisma/client` dependencies to `backend/package.json`
2. Create `backend/prisma/schema.prisma` with User model (id, username unique, name, role enum ADMIN/VIEWER, passwordHash, createdAt, updatedAt)
3. Add `DATABASE_URL` to `backend/src/config.ts` (AppConfig.databaseUrl) and `.env.example`
4. Add Postgres service (`db`) to `docker-compose.yml` (postgres:16-alpine, volume, healthcheck)
5. Update `backend/Dockerfile` to copy prisma/ directory, run `prisma generate` in build, and `prisma migrate deploy` in entrypoint

## Phase 2: Core Implementation

6. Create `backend/src/db/client.ts` — singleton PrismaClient export
7. Refactor `backend/src/auth/users.ts`:
   - Extract `IUserStore` interface (findByUsername, list, create — all async)
   - Keep `UserStore.toPublic()` as a static helper
   - Create `PrismaUserStore` class implementing `IUserStore` with Prisma
   - Create `FakeUserStore` class (in-memory, async) for tests
8. Add seed logic: on first boot, upsert default admin and viewer users (passwords via env vars `ADMIN_PASSWORD`, `VIEWER_PASSWORD` with defaults)
9. Add `POST /api/admin/users` route in `backend/src/routes/admin.ts` (admin-only, body: username, name, password, role) → 201 | 400 | 409 | 403
10. Update `backend/src/app.ts` to instantiate PrismaUserStore and inject into routes; add Prisma connect/disconnect lifecycle in `server.ts`

## Phase 3: Integration

11. Add `listUsers` and `createUser` functions to `frontend/src/lib/api.ts`
12. Create `frontend/src/app/admin/users/page.tsx` — user creation form + list table, guarded by admin role
13. Update `frontend/src/components/Navbar.tsx` — add "Users" link visible only to admin users

## Phase 4: Quality & Documentation

14. Update existing auth tests (`backend/src/__tests__/auth.test.ts`) to use `FakeUserStore` — all existing tests must pass
15. Add tests for `POST /api/admin/users` (201, 400, 403, 409 scenarios)
16. Update `README.md` with new environment variables and setup instructions
17. Update spec files: merge deltas into `spec/specs/authentication/spec.md` and `spec/specs/frontend/spec.md`

## Phase 5: Validation

18. Run `docker compose up --build` and verify: Postgres starts, Prisma migration runs, seed creates default users, login works, admin can create users via API and frontend
19. Run `npm test` in backend — all tests pass

---

**Notes**:
- Each task is independently completable
- Test tasks are included for each major component
- Tasks are ordered by dependencies (database before API, API before frontend)
- All tasks are concrete and verifiable