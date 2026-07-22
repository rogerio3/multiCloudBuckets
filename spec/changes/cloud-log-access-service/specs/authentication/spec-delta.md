## ADDED Requirements

### Capability: Authentication and Authorization

---

### Requirement: User Login
WHEN a user submits valid credentials (username + password) to `POST /api/auth/login`,
the system SHALL authenticate the user and return a signed JWT token with user role and expiry.

#### Scenario: Successful Login
GIVEN a registered user with username "admin" and password "admin123"
WHEN the user submits `POST /api/auth/login` with valid credentials
THEN the system returns HTTP 200
AND the response body contains `{ token, user: { id, username, role, name }, expiresAt }`

#### Scenario: Invalid Credentials
GIVEN any username and password combination
WHEN the user submits `POST /api/auth/login` with invalid credentials
THEN the system returns HTTP 401
AND the response body contains `{ error: "Invalid credentials" }`

#### Scenario: Missing Fields
GIVEN a request without username or password
WHEN the user submits `POST /api/auth/login` with missing fields
THEN the system returns HTTP 400
AND the response body contains a validation error message

---

### Requirement: JWT Token Validation
WHEN a request is made to a protected endpoint,
the system SHALL validate the JWT token from the `Authorization: Bearer <token>` header.

#### Scenario: Valid Token
GIVEN a valid, non-expired JWT token
WHEN the request includes `Authorization: Bearer <valid-token>`
THEN the system extracts user context (id, role, username)
AND processes the request normally

#### Scenario: Expired Token
GIVEN an expired JWT token
WHEN the request includes `Authorization: Bearer <expired-token>`
THEN the system returns HTTP 401
AND the response body contains `{ error: "Token expired" }`

#### Scenario: Missing Token
GIVEN no Authorization header
WHEN a request is made to a protected endpoint
THEN the system returns HTTP 401
AND the response body contains `{ error: "Authentication required" }`

#### Scenario: Malformed Token
GIVEN an invalid JWT token string
WHEN the request includes `Authorization: Bearer <invalid-token>`
THEN the system returns HTTP 401
AND the response body contains `{ error: "Invalid token" }`

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

### Requirement: User Store
WHEN the application starts,
the system SHALL seed two default users: admin (role: admin) and viewer (role: viewer).

#### Scenario: Default Users Exist
GIVEN the application has just started
WHEN the system initializes
THEN there SHALL be a user "admin" with password "admin123" and role "admin"
AND there SHALL be a user "viewer" with password "viewer123" and role "viewer"