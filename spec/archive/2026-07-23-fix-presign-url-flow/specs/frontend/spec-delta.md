# Spec Delta: Frontend Application

This file contains specification changes for `spec/specs/frontend/spec.md`.

## MODIFIED Requirements

### Requirement: Generate Presigned URL (Bonus)
**Previous**: When the user clicks "Get Link" on a file row, a modal opens and immediately calls `POST /api/logs/:key/presign` to generate the temporary URL. The modal displays the generated URL, expiry time, a "Copy to Clipboard" button, and a "Close" button.

WHEN an authenticated user clicks "Get Link" on a file row,
the system SHALL open a modal that displays the file key and an expiration time selector.
The system SHALL NOT call the presign backend endpoint until the user explicitly clicks a "Generate" button.
WHEN the user clicks "Generate",
the system SHALL call `POST /api/logs/:key/presign` with the selected expiration time.
THEN the system SHALL display the generated temporary URL in a read-only input field
AND show the calculated expiry timestamp
AND display a "Copy to Clipboard" button
AND display a "Close" button.

WHEN the URL has already been generated and the user changes the expiration time,
the system SHALL display a "Regenerate" button.
WHEN the user clicks "Regenerate",
the system SHALL call `POST /api/logs/:key/presign` again with the new expiration time
AND update the displayed URL and expiry timestamp.

#### Scenario: Modal Opens Without Generating
GIVEN an authenticated user clicks "Get Link" on a file row
WHEN the modal opens
THEN the system SHALL display the file key
AND the system SHALL display an expiration time selector (15 min / 1 hour / 2 hours)
AND the system SHALL display a "Generate" button
AND the system SHALL NOT call the presign backend endpoint
AND the system SHALL NOT display a URL or "Copy to Clipboard" button

#### Scenario: Generate Presigned URL
GIVEN the user is on the presigned URL modal with an expiration time selected
WHEN the user clicks "Generate"
THEN the system SHALL call `POST /api/logs/:key/presign` with the selected `expiresIn`
AND show a loading state on the "Generate" button
AND on success, display the generated temporary URL in a read-only input field
AND display the expiry timestamp
AND display a "Copy to Clipboard" button
AND display a "Close" button

#### Scenario: Copy to Clipboard
GIVEN the presigned URL has been generated and is displayed
WHEN the user clicks "Copy to Clipboard"
THEN the system SHALL copy the URL to the clipboard
AND show a toast notification "Link copied to clipboard"

#### Scenario: Regenerate with Different Expiration
GIVEN the presigned URL has already been generated
WHEN the user changes the expiration time in the selector
THEN the system SHALL display a "Regenerate" button
WHEN the user clicks "Regenerate"
THEN the system SHALL call `POST /api/logs/:key/presign` with the new `expiresIn`
AND update the displayed URL and expiry timestamp

#### Scenario: Generation Error
GIVEN the user clicks "Generate"
WHEN the presign API call fails
THEN the system SHALL display an error message in the modal
AND the "Generate" button SHALL return to its normal state

---

## Notes

- The MODIFIED requirement changes the existing "Generate Presigned URL (Bonus)" scenario from auto-generation on modal open to explicit generation on button click.
- The backend API (`POST /api/logs/:key/presign`) is unchanged — only the frontend interaction flow is modified.
- The mock provider's presigned URL pointing to the authenticated download endpoint is a known limitation documented in the README; this change does not alter that behavior but ensures the error is not shown on modal open.
