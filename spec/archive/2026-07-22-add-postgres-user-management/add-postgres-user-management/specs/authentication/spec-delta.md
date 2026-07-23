# Authentication and Authorization — Spec Delta

> Change: `add-postgres-user-management`

## MODIFIED Requirements

### Requirement: User Store
WHEN the application starts,
the system SHALL connect to a Postgres database via Prisma ORM
and seed two default users (admin, viewer) if they do not already exist.

#### Scenario: Default Users Exist on First Boot
GIVEN the Postgres database is empty
WHEN the application starts
THEN the system SHALL create a user "admin" with role "admin" and password from `ADMIN_PASSWORD` env (default "admin123")
AND the system SHALL create a user "viewer" with role "viewer" and password from `VIEWER_PASSWORD` env (default "viewer123")

#### Scenario: Default Users Persist Across Restarts
GIVEN the Postgres database already contains the default users
WHEN the application restarts
THEN the system SHALL NOT duplicate the default users
AND the existing users remain unchanged

#### Scenario: User Store Is Async
GIVEN the application is running
WHEN any component calls `findByUsername`, `list`, or `create` on the user store
THEN the method SHALL return a Promise (async)
AND the underlying implementation SHALL use Prisma to query Postgres

---

### Requirement: Role-Based Authorization
WHEN a user is authenticated,
the system SHALL enforce role-based access control on endpoints.

#### Scenario: Admin Access to All Endpoints
GIVEN an authenticated user with role "admin"
WHEN the user accesses any endpoint
THEN the system grants access

#### Scenario: Viewer Restricted from Admin Endpoints
GIVEN an authenticated user with role "viewer"
WHEN the user accesses an admin-only endpoint (e.g., user management)
THEN the system returns HTTP 403
AND the response body contains `{ error: "Insufficient permissions" }`

#### Scenario: Viewer Access to Log Endpoints
GIVEN an authenticated user with role "viewer"
WHEN the user accesses log listing, download, or presign endpoints
THEN the system grants access

---

## ADDED Requirements

### Requirement: Admin User Creation
WHEN an admin user creates a new user,
the system SHALL persist the user in Postgres and return the public user profile.

#### Scenario: Successful User Creation
GIVEN an authenticated user with role "admin"
WHEN the admin submits `POST /api/admin/users` with body `{ username, name, password, role }`
THEN the system returns HTTP 201
AND the response body contains `{ user: { id, username, name, role } }`
AND the user is persisted in Postgres

#### Scenario: Duplicate Username
GIVEN an authenticated user with role "admin"
WHEN the admin submits `POST /api/admin/users` with a username that already exists
THEN the system returns HTTP 409
AND the response body contains `{ error: "Username already exists" }`

#### Scenario: Missing Required Fields
GIVEN an authenticated user with role "admin"
WHEN the admin submits `POST /api/admin/users` with missing `username`, `name`, `password`, or `role`
THEN the system returns HTTP 400
AND the response body contains a validation error message

#### Scenario: Weak Password
GIVEN an authenticated user with role "admin"
WHEN the admin submits `POST /api/admin/users` with a password shorter than 8 characters
THEN the system returns HTTP 400
AND the response body contains a validation error message

#### Scenario: Viewer Cannot Create Users
GIVEN an authenticated user with role "viewer"
WHEN the user submits `POST /api/admin/users`
THEN the system returns HTTP 403
AND the response body contains `{ error: "Insufficient permissions" }`

#### Scenario: Unauthenticated Request
GIVEN no valid JWT token
WHEN a request is made to `POST /api/admin/users`
THEN the system returns HTTP 401
AND the response body contains `{ error: "Authentication required" }`