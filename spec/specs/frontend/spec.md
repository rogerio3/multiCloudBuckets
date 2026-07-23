# Frontend Application (Next.js + Tailwind CSS) — Living Specification

> Merged from change `cloud-log-access-service` (archived 2026-07-22).

### Requirement: API Client Layer
WHEN the frontend communicates with the backend,
the system SHALL use a typed API client layer that handles JWT injection, error handling, and request serialization.

#### Scenario: Authenticated Request
GIVEN a user has a valid JWT token stored in localStorage
WHEN the API client makes a request to a protected endpoint
THEN it SHALL include the `Authorization: Bearer <token>` header
AND handle 401 responses by clearing the session and redirecting to login

#### Scenario: API Error Handling
GIVEN an API request fails
WHEN the response has a non-2xx status code
THEN the API client SHALL parse the error body
AND throw a typed error with `{ status, message, code }`

#### Scenario: Request/Response Types
GIVEN the API client is defined
WHEN making requests
THEN all request payloads and response bodies SHALL have TypeScript types/interfaces

---

### Requirement: Authentication Context (Global State)
WHEN the application loads,
the system SHALL initialize an auth context that syncs user session state across the application.

#### Scenario: Session Restoration
GIVEN a user has a previously stored session in localStorage
WHEN the application loads
THEN the auth context SHALL restore the session from localStorage
AND set the user as authenticated without requiring re-login

#### Scenario: Login Flow
GIVEN a user is unauthenticated
WHEN the user submits valid credentials via the login form
THEN the auth context SHALL store the token and user data in localStorage
AND update the global auth state
AND redirect to the /logs page

#### Scenario: Logout Flow
GIVEN a user is authenticated
WHEN the user clicks the logout button
THEN the auth context SHALL clear the token and user data from localStorage
AND update the global auth state to unauthenticated
AND redirect to the /login page

#### Scenario: Protected Route Guard
GIVEN a user navigates to a protected route (e.g., /logs)
WHEN the user is not authenticated
THEN the system SHALL redirect to /login
AND preserve the intended destination for post-login redirect

---

### Requirement: Login Page (`/login`)
WHEN a user visits the login page,
the system SHALL display a styled login form with username, password, and submit button.

#### Scenario: Page Layout
GIVEN the user navigates to `/login`
WHEN the page loads
THEN it SHALL display a centered card with:
- Application logo/title "Cloud Log Access"
- Username input field with icon
- Password input field with icon
- "Sign In" submit button
- Error message area (initially hidden)
- Loading state on submit button

#### Scenario: Successful Login
GIVEN the user enters valid credentials
WHEN the user clicks "Sign In"
THEN the button SHALL show a loading spinner
AND on success, redirect to /logs

#### Scenario: Failed Login
GIVEN the user enters invalid credentials
WHEN the user clicks "Sign In"
THEN the form SHALL display an error message "Invalid username or password"
AND the button SHALL return to normal state

#### Scenario: Form Validation
GIVEN the user submits with empty fields
WHEN the form is submitted
THEN the system SHALL display validation errors below each empty field
AND prevent the API call

---

### Requirement: Logs Dashboard Page (`/logs`)
WHEN an authenticated user visits the logs dashboard,
the system SHALL display a searchable, paginated list of log files with download and presigned URL actions.

#### Scenario: Page Layout
GIVEN the user is authenticated and on `/logs`
WHEN the page loads
THEN it SHALL display:
- Top navigation bar with app title, user info (name + role badge), and logout button
- Search/filter bar with prefix input and "Search" button
- File list table with columns: Name, Size, Last Modified, Actions
- Loading skeleton while fetching
- Empty state when no files match

#### Scenario: File List Table
GIVEN files are loaded
WHEN the table renders
THEN each row SHALL display:
- File name (with file icon)
- Formatted file size (KB, MB)
- Relative time for last modified (e.g., "2 hours ago")
- Action buttons: Download (icon), Get Link (icon)

#### Scenario: Search/Filter
GIVEN the user types a prefix in the search bar
WHEN the user clicks "Search" or presses Enter
THEN the system SHALL call `GET /api/logs?prefix=<value>`
AND update the file list with matching results

#### Scenario: Download File
GIVEN the user clicks the download button on a file row
WHEN the action is triggered
THEN the system SHALL call `GET /api/logs/<key>/download`
AND trigger a file download in the browser
AND show a success toast notification

#### Scenario: Generate Presigned URL (Bonus)
GIVEN the user clicks "Get Link" on a file row
WHEN the action is triggered
THEN a modal SHALL open with:
- The generated temporary URL (read-only input)
- Expiry time display
- "Copy to Clipboard" button
- "Close" button
AND a toast notification on successful copy

#### Scenario: Loading State
GIVEN the page is fetching data
WHEN the request is in progress
THEN the table SHALL display animated skeleton rows (3-5 placeholder rows)

#### Scenario: Empty State
GIVEN no files match the current search
WHEN the results are empty
THEN the page SHALL display a friendly empty state message with an icon
AND suggest trying a different search prefix

#### Scenario: Error State
GIVEN the API request fails
WHEN an error occurs
THEN the page SHALL display an error banner with the error message
AND a "Retry" button

---

### Requirement: Responsive Design
WHEN the application is viewed on different screen sizes,
the system SHALL adapt the layout for mobile and desktop.

#### Scenario: Desktop View (≥1024px)
GIVEN a desktop screen
WHEN the dashboard renders
THEN the file list SHALL display as a full table with all columns
AND the navigation SHALL be a horizontal top bar

#### Scenario: Mobile View (<768px)
GIVEN a mobile screen
WHEN the dashboard renders
THEN the file list SHALL display as cards (one per file) instead of a table
AND the navigation SHALL collapse to a hamburger menu
AND the search bar SHALL be full width

---

### Requirement: UI Design System
WHEN the application renders,
the system SHALL use a consistent Tailwind CSS design system.

#### Scenario: Color Palette
GIVEN the application theme
WHEN any component renders
THEN it SHALL use:
- Primary: Indigo/blue tones for buttons and links
- Background: Light gray (slate-50) for page, white for cards
- Text: Gray-900 for headings, gray-600 for body
- Success: Green for success states and badges
- Error: Red for error messages and alerts
- Warning: Amber for warning states

#### Scenario: Typography
GIVEN text content
WHEN rendered
THEN headings SHALL use font-semibold with appropriate sizing (text-2xl for page titles, text-lg for section headers)
AND body text SHALL use text-sm or text-base

#### Scenario: Dark Mode Support (Bonus)
GIVEN the user's system preference is dark mode
WHEN the application renders
THEN it SHALL automatically apply dark mode styles (dark: variants)
AND provide a manual toggle in the navigation bar

---

### Requirement: Admin Users Page (`/admin/users`)
WHEN an admin user visits the admin users page,
the system SHALL display a user management interface with user list and user creation form.

#### Scenario: Page Layout
GIVEN the user is authenticated with role "admin"
WHEN the user navigates to `/admin/users`
THEN the page SHALL display:
- Page title "User Management"
- User creation form with fields: username, name, password, role (select: admin/viewer)
- "Create User" submit button
- User list table with columns: Username, Name, Role, Created At
- Loading state while fetching users
- Error state on API failure
- Success message after user creation

#### Scenario: Create User Form
GIVEN the admin is on the users page
WHEN the admin fills in the form fields and clicks "Create User"
THEN the system SHALL call `POST /api/admin/users` with the form data
AND on success (201), display a success toast
AND add the new user to the list
AND reset the form fields
AND the password field SHALL have type "password"
AND the password field SHALL require minimum 8 characters

#### Scenario: Form Validation Errors
GIVEN the admin submits the form with invalid data
WHEN the API returns HTTP 400
THEN the form SHALL display validation error messages below the relevant fields
AND the submit button SHALL return to normal state

#### Scenario: Duplicate Username Error
GIVEN the admin submits the form with a username that already exists
WHEN the API returns HTTP 409
THEN the form SHALL display an error message "Username already exists"
AND the username field SHALL be highlighted

#### Scenario: User List Table
GIVEN the users page has loaded
WHEN the user list renders
THEN each row SHALL display:
- Username
- Name
- Role badge (colored: admin = indigo, viewer = gray)
- Created At (formatted date)
AND the table SHALL have a header row with column names
AND if no users exist, display an empty state message

#### Scenario: Loading State
GIVEN the users page is loading
WHEN the initial data fetch is in progress
THEN the table SHALL display a loading spinner or skeleton rows
AND the form SHALL be disabled

#### Scenario: Error State
GIVEN the API request fails on page load
WHEN an error occurs
THEN the page SHALL display an error banner with the error message
AND a "Retry" button to reload the user list

#### Scenario: Viewer Cannot Access Page
GIVEN a user with role "viewer" is authenticated
WHEN the user navigates to `/admin/users`
THEN the system SHALL redirect to `/logs`
OR display a "Not authorized" message

---

### Requirement: Admin Navigation Link
WHEN the user is authenticated with role "admin",
the system SHALL display a "Users" link in the navigation bar.

#### Scenario: Link Visible to Admin Only
GIVEN the user is authenticated with role "admin"
WHEN the navigation bar renders
THEN it SHALL display a "Users" link pointing to `/admin/users`

#### Scenario: Link Hidden for Viewer
GIVEN the user is authenticated with role "viewer"
WHEN the navigation bar renders
THEN it SHALL NOT display the "Users" link
