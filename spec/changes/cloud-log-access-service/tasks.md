# Implementation Tasks: Cloud Log Access Service

**Total**: 19 tasks (including testing, docs, CI, and bonus IaC)

---

## Plan Review Amendments (2026-07-22)

The following changes were proposed after reviewing the original plan and are incorporated into the task list below:

1. **Fix `.gitignore`** — The repository `.gitignore` ignored `README.md`, `Dockerfile*`, `docker-compose*.yml`, and `.gitignore` itself. These are required deliverables and must be committable. (Folded into Task 1.)
2. **Reorder Phase 1** — The mock provider must implement the `StorageProvider` interface, so the interface is defined *before* the mock (Task 2 = interface + errors, Task 3 = mock + cloud providers).
3. **Add CI workflow task** — The header mentioned CI but no task existed. Added Task 18 (GitHub Actions: lint + test + build).
4. **Add bonus IaC task** — Added Task 19 (Terraform for an AWS S3 test bucket under `infra/terraform/`).
5. **Test stack** — Use Jest + `fastify.inject()` instead of supertest (idiomatic for Fastify; no live socket needed).
6. **Route protection approach** — Next.js edge middleware cannot read localStorage-based sessions. Route guards are implemented as a client-side `AuthGuard` component backed by the global `AuthContext`; the post-login redirect target is preserved via sessionStorage.
7. **Password hashing** — Use Node.js built-in `crypto.scrypt` with per-user salt + `timingSafeEqual` (no native dependencies, no supply-chain risk) instead of bcrypt.
8. **Object keys containing `/`** — Supported by URI-encoding keys (`encodeURIComponent`) on `:key` route params.
9. **Additional endpoints** — `GET /api/auth/me` (validate a restored session) and `GET /api/admin/users` (makes the viewer → 403 RBAC scenario demonstrable).

---

## Phase 1: Backend Foundation

- [x] **1. Scaffold backend project** — Initialize TypeScript project with Fastify, configure tsconfig, ESLint (flat config), install dependencies (fastify, @fastify/cors, @fastify/rate-limit, @fastify/helmet, jsonwebtoken, dotenv, cloud SDKs). Fix root `.gitignore` so README/Dockerfile/docker-compose are committable.
- [x] **2. Define storage abstraction** — Create `StorageProvider` interface (`listFiles`, `downloadFile`, `generatePresignedUrl`), shared domain types, and a `StorageError` (statusCode + code).
- [x] **3. Implement storage providers** — Mock filesystem provider (seeds realistic app/auth/system/error/nginx sample logs), AWS S3 provider (SDK v3 + presigner), GCP GCS provider, Azure Blob provider (SAS), and a lazy-loading provider factory.
- [x] **4. Implement authentication module** — JWT login endpoint (`POST /api/auth/login`), in-memory user store with seeded admin/viewer users, scrypt password hashing, `GET /api/auth/me`.
- [x] **5. Implement authorization middleware** — `authenticate` preHandler (JWT verification with distinct expired/invalid/missing errors) and `requireRole` guard (admin-only endpoints → 403 for viewer).
- [x] **6. Implement log endpoints** — `GET /api/logs` (list with prefix/maxKeys), `GET /api/logs/:key/download` (stream), `POST /api/logs/:key/presign` (generate presigned URL), `GET /api/health`, `GET /api/admin/users`.
- [x] **7. Add Fastify plugins and error handling** — Rate limiting, Helmet security headers, CORS configuration, structured logging with pino, global error handler mapping StorageError/validation errors to spec-compliant JSON.
- [x] **8. Write backend tests** — Jest + `fastify.inject()` tests for auth (login success/failure, token validation, expired/missing/malformed tokens), log endpoints (list, download, presign, health), authorization (role checks).

## Phase 2: Frontend (Next.js + Tailwind)

- [x] **9. Scaffold Next.js project** — TypeScript + App Router + Tailwind CSS (pinned Next 15 / React 19 / Tailwind 3.4), standalone output, flat ESLint config.
- [x] **10. Build API client layer** — Typed fetch wrapper with JWT injection, typed `ApiError` (status/message/code), 401 handling (clear session + redirect), blob download helper.
- [x] **11. Build auth context and protected routes** — React Context for session state, localStorage persistence + session restore, client-side `AuthGuard` route protection with redirect preservation.
- [x] **12. Build Login Page** — `/login` route with styled form, validation feedback, error display (invalid credentials, network errors), loading spinner, redirect to /logs on success.
- [x] **13. Build Logs Dashboard page** — `/logs` route with: file list table (desktop) / cards (mobile), search/filter by prefix, download buttons, loading skeleton states, empty state, error banner with retry.
- [x] **14. Build Presigned URL UI** — Modal to generate temporary access link, display URL with copy button, show expiry time, toast notification on copy.
- [x] **15. Polish frontend UI** — Consistent Tailwind design system, responsive layout (mobile + desktop), dark/light mode toggle, smooth transitions, toast notifications.

## Phase 3: DevOps and Documentation

- [x] **16. Create Docker configuration** — Dockerfiles for backend (multi-stage) and frontend (standalone output), Docker Compose orchestration, `.env.example` files with mock provider defaults, `.dockerignore` files.
- [x] **17. Write README and validate** — Setup instructions, architecture diagram (ASCII), user journey walkthrough, example API requests (curl) with responses, design decisions explanation.
- [x] **18. Add CI workflow (Bonus)** — GitHub Actions workflow running backend lint+test+build and frontend lint+build on push/PR.
- [x] **19. Add Terraform IaC (Bonus)** — `infra/terraform/` provisioning an AWS S3 test bucket (versioning, public access block) with variables and outputs.