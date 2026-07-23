# Frontend Application — Spec Delta

> Change: `add-postgres-user-management`

## ADDED Requirements

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