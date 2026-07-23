# Cloud Log Access Service

A full-stack **Backend-for-Frontend (BFF)** exercise that provides secure, self-service
access to log files stored in cloud object storage — **AWS S3**, **GCP Cloud Storage**,
and **Azure Blob Storage** — plus a built-in **mock provider** so you can run everything
locally with **zero cloud credentials**.

- **Backend** — Node.js 22 · TypeScript · Fastify 5 · JWT auth · role-based access control
- **Frontend** — Next.js 15 (App Router) · React 19 · Tailwind CSS · React Context global state
- **DevOps** — Docker + Docker Compose · GitHub Actions CI · Terraform (bonus IaC)

---

## Table of Contents

- [Cloud Log Access Service](#cloud-log-access-service)
  - [Table of Contents](#table-of-contents)
  - [Architecture](#architecture)
  - [Quick Start (Docker Compose)](#quick-start-docker-compose)
  - [Local Development (without Docker)](#local-development-without-docker)
  - [Default Users \& Roles](#default-users--roles)
  - [User Journey (UI Walkthrough)](#user-journey-ui-walkthrough)
  - [API Reference with Examples](#api-reference-with-examples)
    - [`GET /api/health` — health check (public)](#get-apihealth--health-check-public)
    - [`POST /api/auth/login` — authenticate](#post-apiauthlogin--authenticate)
    - [`GET /api/logs` — list log files (auth required)](#get-apilogs--list-log-files-auth-required)
    - [`GET /api/logs/:key/download` — stream a file (auth required)](#get-apilogskeydownload--stream-a-file-auth-required)
    - [`POST /api/logs/:key/presign` — temporary access URL (bonus, auth required)](#post-apilogskeypresign--temporary-access-url-bonus-auth-required)
    - [`GET /api/auth/me` — current session (auth required)](#get-apiauthme--current-session-auth-required)
    - [`GET /api/admin/users` — admin-only (demonstrates RBAC)](#get-apiadminusers--admin-only-demonstrates-rbac)
  - [Switching Cloud Providers](#switching-cloud-providers)
    - [Testing the real S3 code path locally (LocalStack)](#testing-the-real-s3-code-path-locally-localstack)
  - [Testing \& Quality](#testing--quality)
  - [CI Workflow (Bonus)](#ci-workflow-bonus)
  - [Terraform IaC (Bonus)](#terraform-iac-bonus)
  - [Design Decisions](#design-decisions)
  - [Project Structure](#project-structure)
  - [Security Notes / Production Checklist](#security-notes--production-checklist)

---

## Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │                 Browser                      │
                        └───────────────┬──────────────────────────────┘
                                        │ HTTPS (JWT in Authorization header)
                                        ▼
        ┌────────────────────────────────────────────────┐
        │  Frontend — Next.js 15 (App Router) :3000      │
        │  • /login, /logs pages                         │
        │  • AuthContext (global state, localStorage)    │
        │  • AuthGuard route protection                  │
        │  • typed API client (JWT injection)            │
        └───────────────────────┬────────────────────────┘
                                │ REST /api/*
                                ▼
        ┌────────────────────────────────────────────────┐
        │  Backend (BFF) — Fastify 5 :3001               │
        │  • POST /api/auth/login   GET /api/auth/me     │
        │  • GET /api/logs  (list, prefix, maxKeys)      │
        │  • GET /api/logs/:key/download (stream)        │
        │  • POST /api/logs/:key/presign (temp URL)      │
        │  • GET /api/admin/users (admin only)           │
        │  • Helmet · CORS · rate limit · pino logs      │
        └───────┬────────────┬────────────┬──────────────┘
                │            │            │
        ┌───────▼───┐  ┌─────▼─────┐  ┌───▼──────────┐  ┌────────────────┐
        │  AWS S3   │  │  GCP GCS  │  │ Azure Blob   │  │ Mock provider  │
        │  SDK v3   │  │  SDK      │  │ SDK + SAS    │  │ (local files,  │
        │ presigner │  │ signedURL │  │              │  │ seeded sample  │
        │           │  │           │  │              │  │ log data)      │
        └───────────┘  └───────────┘  └──────────────┘  └────────────────┘
                     StorageProvider interface
        (listFiles · downloadFile · generatePresignedUrl)
```

**Request flow:** the SPA authenticates against the BFF, stores the JWT in
`localStorage` via the global `AuthContext`, and all subsequent calls inject
`Authorization: Bearer <token>`. The BFF validates the token, enforces the role,
and delegates storage operations to the configured `StorageProvider`. Files are
**streamed** through the BFF (never buffered in memory), and pre-signed URLs let
clients download **directly** from the cloud provider without proxying.

---

## Quick Start (Docker Compose)

> Prereqs: Docker with Compose v2.

```bash
git clone <this-repo> && cd log-app
git checkout exercise/cloud-log-access-service

docker compose up --build
```

Then open **http://localhost:3000** and sign in (see credentials below).
The backend runs on **http://localhost:3001** with the **mock provider** and
auto-seeded sample log files — no cloud account needed.

Stop everything with `docker compose down`.

---

## Local Development (without Docker)

> Prereqs: Node.js ≥ 20 (developed on Node 23), npm 10.

**Terminal 1 — backend:**

```bash
cd backend
cp .env.example .env          # defaults: STORAGE_PROVIDER=mock, PORT=3001
npm install
npm run dev                   # tsx watch → http://localhost:3001
```

**Terminal 2 — frontend:**

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                   # → http://localhost:3000
```

On first start the mock provider seeds ~27 realistic log files
(app / auth / system / error / nginx-access for the last 5 days, plus an
`archive/` prefix) into `backend/mock-data/` (git-ignored).

---

## Default Users & Roles

| Username | Password    | Role    | Can access                                         |
|----------|-------------|---------|----------------------------------------------------|
| `admin`  | `admin123`  | `admin` | Everything, incl. `GET /api/admin/users`           |
| `viewer` | `viewer123` | `viewer`| Log list / download / presign (403 on admin routes)|

Users live in an in-memory store (MVP) with passwords hashed using **scrypt**
(Node's built-in KDF) — swap `UserStore` for a database later.

---

## User Journey (UI Walkthrough)

1. **Login** — Visit `http://localhost:3000` → you are redirected to `/login`.
   Sign in as `admin / admin123`. On success the JWT + user profile are stored
   in `localStorage`, the global `AuthContext` updates, and you land on `/logs`.
   Invalid credentials show an inline *“Invalid username or password”* error;
   empty fields show per-field validation. *(Screenshot: `docs/screenshots/01-login.png`)*
2. **Logs dashboard** — A responsive table (cards on mobile) lists every log
   file with name, human-readable size, and relative modification time.
   The navbar shows your name, a colored role badge, a dark/light theme toggle,
   and a sign-out button. While loading, animated skeleton rows appear.
   *(Screenshot: `docs/screenshots/02-logs-dashboard.png`)*
3. **Search by prefix** — Type `archive/` or a date fragment (e.g. `2026-07-18`)
   in the search bar → the list refetches via `GET /api/logs?prefix=…`.
   An empty result renders a friendly empty state.
   *(Screenshot: `docs/screenshots/03-search.png`)*
4. **Download a log** — Click the ⬇ icon on any row. The file is fetched with
   the JWT and saved by the browser; a success toast confirms.
   *(Screenshot: `docs/screenshots/04-download-toast.png`)*
5. **Temporary access link (bonus)** — Click the 🔗 icon → a modal calls
   `POST /api/logs/:key/presign`, shows the temporary URL, its expiry time
   (choose 15 min / 1 h / 2 h), and a **Copy to clipboard** button with a toast
   confirmation. *(Screenshot: `docs/screenshots/05-presign-modal.png`)*
6. **Session persistence & guards** — Refresh the page: the session is restored
   from `localStorage` without re-login. Sign out → you are bounced to `/login`;
   visiting `/logs` unauthenticated redirects to `/login` and returns you to the
   original page after signing in. Any 401 from the API clears the session and
   redirects automatically. Dark mode: toggled from the navbar, persisted, and
   defaults to your OS preference. *(Screenshot: `docs/screenshots/06-dark-mode.png`)*

> 📸 All screenshots above were captured from the app running locally in mock
> mode and live under `docs/screenshots/`.

---

## API Reference with Examples

Base URL: `http://localhost:3001`. Errors always return
`{ "error": "<message>", "code?" }` with an appropriate status.

### `GET /api/health` — health check (public)

```bash
curl -s http://localhost:3001/api/health | jq
```
```json
{ "status": "ok", "timestamp": "2026-07-22T13:58:06.740Z", "uptime": 1.966 }
```

### `POST /api/auth/login` — authenticate

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq
```
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs…",
  "user": { "id": "u-1", "username": "admin", "name": "Admin User", "role": "admin" },
  "expiresAt": "2026-07-22T21:58:18.762Z"
}
```
- Wrong credentials → `401 { "error": "Invalid credentials" }`
- Missing fields → `400 { "error": "body must have required property 'password'" }`

```bash
# Save a token for the next examples
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)
```

### `GET /api/logs` — list log files (auth required)

Query params: `prefix` (string), `maxKeys` (1–1000, default 100).

```bash
curl -s "http://localhost:3001/api/logs?prefix=archive/&maxKeys=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```
```json
{
  "files": [
    {
      "key": "archive/2026-07-18-app.log",
      "name": "2026-07-18-app.log",
      "size": 8021,
      "lastModified": "2026-07-22T13:57:47.021Z",
      "etag": "mock-8021-1784728667021"
    }
  ],
  "isTruncated": false,
  "nextMarker": null
}
```
Missing/expired/invalid token → `401 { "error": "Authentication required" | "Token expired" | "Invalid token" }`.

### `GET /api/logs/:key/download` — stream a file (auth required)

> Keys containing `/` must be URI-encoded (`archive/x.log` → `archive%2Fx.log`).

```bash
curl -s -OJ "http://localhost:3001/api/logs/2026-07-18-app.log/download" \
  -H "Authorization: Bearer $TOKEN"
```
```
HTTP/1.1 200 OK
content-type: text/plain
content-disposition: attachment; filename="2026-07-18-app.log"

2026-07-18T00:00:00.000Z INFO  [pid=1000] request handled method=GET path=/api/orders status=200 duration_ms=42
…
```
Unknown key → `404 { "error": "File not found", "code": "NotFound" }`.

### `POST /api/logs/:key/presign` — temporary access URL (bonus, auth required)

Body: `{ "expiresIn": <60–86400, seconds; default 3600> }`.

```bash
curl -s -X POST "http://localhost:3001/api/logs/2026-07-18-app.log/presign" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"expiresIn":3600}' | jq
```
```json
{
  "url": "http://localhost:3001/api/logs/2026-07-18-app.log/download",
  "expiresAt": "2026-07-22T14:58:37.373Z",
  "key": "2026-07-18-app.log"
}
```
In **mock mode** the URL points back at the authenticated download endpoint;
with a real provider it is a genuine **S3 pre-signed URL / GCS signed URL /
Azure SAS URL** usable without credentials until expiry.

### `GET /api/auth/me` — current session (auth required)

```bash
curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN" | jq
```
```json
{ "user": { "sub": "u-1", "username": "admin", "role": "admin" } }
```

### `GET /api/admin/users` — admin-only (demonstrates RBAC)

```bash
# viewer → 403
curl -s http://localhost:3001/api/admin/users -H "Authorization: Bearer $VIEWER_TOKEN"
{ "error": "Insufficient permissions", "code": "Forbidden" }

# admin → 200
curl -s http://localhost:3001/api/admin/users -H "Authorization: Bearer $TOKEN" | jq
{ "users": [
  { "id": "u-1", "username": "admin", "name": "Admin User", "role": "admin" },
  { "id": "u-2", "username": "viewer", "name": "Viewer User", "role": "viewer" }
] }
```

---

## Switching Cloud Providers

Set `STORAGE_PROVIDER` (and matching credentials) in `backend/.env` — see
`backend/.env.example` for every variable.

| Provider | `STORAGE_PROVIDER` | Required env |
|----------|--------------------|--------------|
| Mock (default) | `mock` | none |
| AWS S3 | `aws` | `AWS_BUCKET`, `AWS_REGION` + default credential chain (or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`; `AWS_ENDPOINT` for LocalStack/MinIO) |
| GCP GCS | `gcp` | `GCP_BUCKET` + ADC (`GOOGLE_APPLICATION_CREDENTIALS` or `GCP_KEY_FILENAME`) |
| Azure Blob | `azure` | `AZURE_CONTAINER`, `AZURE_STORAGE_CONNECTION_STRING` (account key required for SAS) |

All four implement the same `StorageProvider` interface
(`listFiles` / `downloadFile` / `generatePresignedUrl`), so no route code changes
per provider. Provider SDKs are **lazy-loaded** — running with `mock` never pays
for the AWS/GCP/Azure SDK startup cost.

**Provision a test bucket with Terraform (bonus):**

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # edit bucket_name
terraform init && terraform apply
# outputs give you AWS_BUCKET + read-only credentials for backend/.env
```

### Testing the real S3 code path locally (LocalStack)

You can exercise the **actual AWS SDK code path** — `ListObjectsV2`, `GetObject`,
and genuine S3 pre-signed URLs — without a cloud account using
[LocalStack](https://localstack.cloud):

```bash
# 1. Start the emulator (compose profile)
docker compose --profile aws-emulated up -d localstack

# 2. Seed a test bucket with the sample logs (uses the real S3 SDK)
cd backend
AWS_BUCKET=cla-logs-test AWS_ENDPOINT=http://localhost:4566 npx tsx scripts/seed-s3.ts
# → seeded 27 log files into cla-logs-test

# 3. Run the backend against the emulated S3
STORAGE_PROVIDER=aws \
AWS_BUCKET=cla-logs-test \
AWS_ENDPOINT=http://localhost:4566 \
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
npm run dev
```

Verified end-to-end against this setup: login → `GET /api/logs` (real S3 etags)
→ prefix filter on nested keys (`archive/…`) → streamed `GetObject` download →
404 mapping for missing keys → **pre-signed URL that downloads the object with
no JWT at all**:

```text
7) GET via real pre-signed URL WITHOUT JWT:
   status=200 bytes=6096
2026-07-19T00:00:00.000Z INFO  [pid=1000] request handled method=GET path=/api/orders …
```

The same flow works against a real AWS account by pointing `AWS_BUCKET` at a
bucket you own and omitting `AWS_ENDPOINT` (credentials come from the standard
AWS chain — e.g. the IAM user produced by the Terraform module above).

---

## Testing & Quality

```bash
# Backend — 23 tests (Jest + fastify.inject, no sockets):
cd backend
npm test            # auth, RBAC, list/download/presign, health, error cases
npm run lint        # ESLint 9 flat config + typescript-eslint
npm run typecheck   # tsc --noEmit (strict)
npm run build       # tsc → dist/

# Frontend:
cd frontend
npm run lint        # eslint (next/core-web-vitals + next/typescript)
npm run build       # next build (type-checks + standalone output)
```

Backend tests spin up the app against a **temporary mock storage dir** and cover:
login success/failure, missing fields (400), missing/expired/malformed tokens
(401s with spec-mandated messages), viewer→403 on admin routes, listing with
prefix/maxKeys, streaming downloads with correct headers, 404s, presign with
custom expiry, and the health endpoint.

---

## CI Workflow (Bonus)

`.github/workflows/ci.yml` runs on pushes to `main`/`exercise/**` and PRs:

| Job | Steps |
|-----|-------|
| **backend** | `npm ci` → lint → **23 Jest tests** → `tsc` build |
| **frontend** | `npm ci` → lint → `next build` |
| **docker** | builds both images (after the first two pass) |

Node 22 + npm cache; each job uses the per-directory lockfile.

---

## Terraform IaC (Bonus)

`infra/terraform/` provisions a hardened S3 test bucket:

- versioning + AES256 default encryption
- **all four public-access blocks** (logs must never be public — access via BFF)
- optional least-privilege read-only IAM user (`s3:ListBucket`, `s3:GetObject`)
  whose credentials drop straight into `backend/.env`

Usage: see [Switching Cloud Providers](#switching-cloud-providers).

---

## Design Decisions

1. **BFF pattern** — the SPA never holds cloud credentials; all storage access is
   brokered by the backend, which also provides a single audit/enforcement point
   (rate limiting, auth, logging).
2. **`StorageProvider` interface** — one contract for S3/GCS/Azure/mock keeps
   routes provider-agnostic and makes the system trivially extensible. Providers
   are lazy-loaded so the default mock dev loop stays fast.
3. **Mock provider for local dev** — deterministic, realistic sample logs
   (multiple types, date-stamped keys, nested `archive/` prefix) mean reviewers
   can exercise every feature — including prefix search and nested keys — with
   zero credentials.
4. **JWT + role-based guards** — stateless auth suits a horizontally-scalable BFF.
   Distinct 401 messages (`Authentication required` / `Invalid token` /
   `Token expired`) and a 403 (`Insufficient permissions`) map 1:1 to the spec.
5. **scrypt over bcrypt** — Node's built-in `crypto.scrypt` + per-user salt +
   `timingSafeEqual` gives strong password hashing with **zero native
   dependencies** (smaller, more portable Docker images).
6. **Streaming downloads** — `reply.send(stream)` pipes object storage straight
   to the client; memory stays flat regardless of file size.
7. **Pre-signed URLs (bonus)** — the BFF stays out of the data path for
   time-limited sharing; mock mode documents the flow by pointing at the
   authenticated endpoint.
8. **React Context + localStorage for global state** — the brief asks for a
   centralized global state solution; a typed `AuthContext` keeps session logic
   in one place and syncs/persists it. Route protection uses a client-side
   `AuthGuard` because Next.js edge middleware cannot read `localStorage`;
   the post-login redirect target is preserved via `sessionStorage`.
9. **URI-encoded object keys** — `encodeURIComponent` on `:key` params supports
   real-world S3-style keys containing `/` without wildcard routing hacks.
10. **Fastify over Express** — schema validation (JSON Schema → 400s for free),
    first-class async errors, and top-tier performance; `fastify.inject()` makes
    tests fast and socket-less.
11. **Multi-stage Dockerfiles, non-root runtime** — production images ship only
    `dist/` + prod deps (backend) or the Next standalone output (frontend), and
    run as an unprivileged user.
12. **`NEXT_PUBLIC_API_URL` as a build arg** — Next inlines public env vars at
    build time; Compose passes it explicitly so the browser always reaches the
    backend on `localhost:3001`.

---

## Project Structure

```
log-app/
├── backend/                      # Fastify BFF
│   ├── src/
│   │   ├── app.ts                # buildApp(): plugins, error handler, routes
│   │   ├── server.ts             # entrypoint (listen + graceful shutdown)
│   │   ├── config.ts             # env-based config (see .env.example)
│   │   ├── types.ts              # StorageProvider interface & domain types
│   │   ├── errors.ts             # AppError / StorageError / AuthError
│   │   ├── auth/                 # scrypt passwords, user store, JWT helpers
│   │   ├── plugins/guards.ts     # authenticate + requireRole preHandlers
│   │   ├── routes/               # auth, logs, admin
│   │   ├── storage/              # mock, S3, GCS, Azure providers + factory
│   │   └── __tests__/            # 23 Jest tests (auth + logs)
│   ├── scripts/seed-s3.ts        # seeds a bucket (real AWS or LocalStack)
│   ├── Dockerfile                # multi-stage, non-root, healthcheck
│   └── .env.example
├── frontend/                     # Next.js 15 SPA
│   ├── src/
│   │   ├── app/                  # /login, /logs (+ guarded layout), root
│   │   ├── components/           # Navbar, AuthGuard, PresignModal, UI kit
│   │   ├── context/AuthContext   # global session state (+localStorage sync)
│   │   └── lib/                  # typed API client, session store, formatters
│   ├── Dockerfile                # multi-stage standalone build, non-root
│   └── .env.example
├── docker-compose.yml            # backend + frontend, mock defaults
├── .github/workflows/ci.yml      # lint → test → build → docker images
├── infra/terraform/              # bonus: hardened S3 test bucket + reader IAM
├── docs/screenshots/             # user-journey screenshots
└── spec/
    ├── specs/                    # living specs (merged requirements)
    ├── changes/                  # open change proposals (empty)
    └── archive/2026-07-22-cloud-log-access-service/  # this change (archived)
```

---

## Security Notes / Production Checklist

- [ ] Change `JWT_SECRET` and the seeded demo passwords
- [ ] Restrict `CORS_ORIGIN` to your real frontend origin
- [ ] Terminate TLS in front of both services
- [ ] Replace the in-memory `UserStore` with a database + OIDC
- [ ] Scope cloud credentials to least privilege (read-only on the log bucket)
- [ ] Lower `PRESIGN_MAX_EXPIRES_IN` to your policy maximum