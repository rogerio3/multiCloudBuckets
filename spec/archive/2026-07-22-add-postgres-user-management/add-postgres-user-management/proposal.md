# Proposal: Postgres User Management with Prisma

## Why

The current `UserStore` is an in-memory Map that resets on every restart. This prevents persistent user management (admins cannot create users that survive a redeploy) and makes the application unsuitable for any multi-user environment.

**Current state**: Two hardcoded users (`admin`, `viewer`) loaded into a `Map<string, User>` at startup. No persistence, no user creation API.

**Desired state**: Users stored in Postgres via Prisma ORM. Admin can create new users through a REST endpoint and a frontend admin page. Default admin/viewer users are seeded on first boot. The in-memory store is replaced by an async repository that can be injected for testability.

## What Changes

- Add Postgres service to `docker-compose.yml`
- Add Prisma ORM (`prisma` + `@prisma/client`) to the backend
- Replace the in-memory `UserStore` with a `PrismaUserStore` implementing an async `IUserStore` interface
- Add `POST /api/admin/users` (admin-only) for creating users
- Add frontend page `/admin/users` with user creation form and list table
- Add `DATABASE_URL` configuration
- Update existing tests with a fake in-memory repository (preserving existing test behavior)
- Rename `UserStore.toPublic()` — kept but accessible via interface
- Update spec and documentation

## Impact

### Affected Specifications
- `spec/specs/authentication/spec.md` — MODIFIED User Store requirement (persistent DB); ADDED Admin User Creation requirement
- `spec/specs/frontend/spec.md` — ADDED Admin Users Page requirement

### Affected Code
- `backend/src/auth/users.ts` — refactored to interface + implementations (Prisma + Fake)
- `backend/src/routes/admin.ts` — added POST /api/admin/users
- `backend/src/app.ts` — inject async store, Prisma init
- `backend/src/config.ts` — added `databaseUrl`
- `backend/src/server.ts` — Prisma connect/disconnect lifecycle
- `backend/prisma/schema.prisma` — NEW User model + migration
- `frontend/src/lib/api.ts` — added `listUsers`, `createUser`
- `frontend/src/lib/types.ts` — added role validation helpers
- `frontend/src/app/admin/users/page.tsx` — NEW page
- `frontend/src/components/Navbar.tsx` — added "Users" link (admin only)
- `docker-compose.yml` — added `db` service
- `backend/Dockerfile` — Prisma generate + migrate step

### User Impact
- Admins can create new users via the UI
- Users persist across restarts
- Login behavior is unchanged

### API Changes
- `POST /api/admin/users` (admin-only, body: `{ username, name, password, role }`) → `201 { user }` | `400` | `409` | `403`
- `GET /api/admin/users` — unchanged response shape

### Migration Required
- [x] Database migration (Prisma migrate)
- [ ] API version bump (no breaking changes to existing endpoints)
- [ ] User communication needed (internal change only)
- [x] Documentation updates (README)

## Timeline Estimate

Medium — approximately 3-4 hours of implementation.

## Risks

- **Prisma client generation in Docker**: Must ensure `prisma generate` runs in the Docker build. Mitigated by adding it to the build stage and using `prisma migrate deploy` as the entrypoint.
- **Seed idempotency**: Must handle the case where a user already exists (container restart). Mitigated with `onConflict` / upsert logic.
- **Frontend type alignment**: The frontend uses its own type definitions (`lib/types.ts`) — must ensure role strings (`admin`|`viewer`) are consistent between API and client.