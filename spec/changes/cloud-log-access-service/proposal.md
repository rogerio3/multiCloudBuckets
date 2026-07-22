# Proposal: Cloud Log Access Service

## Summary
Build a full-stack Cloud Log Access Service with a TypeScript/Fastify backend and a Next.js + Tailwind CSS frontend that provides secure, controlled access to log files stored across multiple cloud providers (AWS S3, GCP GCS, Azure Blob Storage).

---

## Why

Development teams need a self-service interface to browse and download application logs stored in cloud object storage without:
- Direct cloud console access (security risk)
- Manual CLI commands (productivity drain)
- Sharing cloud credentials (compliance issue)

A BFF (Backend-for-Frontend) pattern solves this by providing a secure, auditable, and user-friendly interface.

---

## What Changes

### Backend (Node.js + TypeScript + Fastify)
1. **Fastify API Server** with structured logging, rate limiting, CORS, and health checks
2. **JWT-based Authentication** — login endpoint returns signed tokens with expiry
3. **Role-based Authorization** — `admin` and `viewer` roles with scoped permissions
4. **Multi-Cloud Storage Abstraction** — interface pattern supporting AWS S3, GCP GCS, Azure Blob Storage, plus a **Mock Provider** for local development
5. **REST Endpoints**:
   - `POST /api/auth/login` — authenticate
   - `GET /api/logs` — list files (with prefix/maxKeys pagination)
   - `GET /api/logs/:key/download` — stream file download
   - `POST /api/logs/:key/presign` — generate temporary access URL
   - `GET /api/health` — health check
6. **Dockerfile** for containerized deployment
7. **Rate Limiting** and **Helmet** security headers

### Frontend (Next.js + TypeScript + Tailwind CSS)
1. **Next.js App Router** — modern file-based routing with SSR capabilities
2. **Login Page** `/login` — email/password form with error handling
3. **Logs Dashboard** `/logs` — file listing with search, pagination, download, and presigned URL generation
4. **Protected Route Middleware** — route guards via Next.js middleware + global auth context
5. **Auth Context (React Context API)** — global state for user session synced with localStorage
6. **API Client Layer** — typed middleware wrapping fetch with JWT injection
7. **Beautiful UI** — Tailwind CSS with a modern design system (cards, modals, toast notifications, loading skeletons)
8. **Docker multi-stage build** for production
9. **Responsive Design** — mobile-friendly layout

### DevOps
1. **Docker Compose** — orchestrate backend + frontend for local development
2. **Dockerfiles** for both services
3. **`.env` configuration** with clear defaults for mock mode
4. **README** with setup instructions, architecture diagram, API examples, and screenshots

---

## Impact

| Area | Impact |
|------|--------|
| **Backend code** | New Express-free, Fastify-based TypeScript service |
| **Frontend code** | New Next.js application with Tailwind CSS |
| **Dependencies** | Fastify ecosystem, @aws-sdk/client-s3, @google-cloud/storage, @azure/storage-blob |
| **Local dev** | Docker Compose with mock provider — no cloud credentials needed |
| **Security** | Token auth with role-based access; rate limiting; security headers |
| **Operational** | Containerized, stateless, scalable horizontally |

### Assumptions
- Backend runs on port `3001`, frontend on port `3000`
- Mock provider generates realistic log data for local testing
- JWT secret configurable via environment variable
- No database required — in-memory user store for MVP (extensible later)