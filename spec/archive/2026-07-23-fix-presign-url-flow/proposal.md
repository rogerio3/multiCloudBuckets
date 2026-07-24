# Proposal: Fix Presigned URL Generation Flow

**Change ID**: `fix-presign-url-flow`
**Status**: Draft
**Scope**: Frontend — `PresignModal.tsx` component and frontend spec

---

## Why

Two issues affect the presigned URL feature in the logs dashboard:

1. **Auto-generation on modal open**: When a user clicks the "Get Link" button on a file row, the `PresignModal` opens and **immediately** calls the backend `POST /api/logs/:key/presign` via a `useEffect` hook. The backend is called before the user has chosen an expiration time or explicitly requested generation. This is unexpected — the user expects to choose the expiration time first, then click a "Generate" button.

2. **"Authentication required" error on generated URL**: In mock mode, the presigned URL returned by the backend points to the authenticated download endpoint (`/api/logs/:key/download`). When the user clicks this URL in a new tab or shares it, the browser makes a request without a JWT, and the backend's `authenticate` middleware returns `{"error": "Authentication required", "code": "Unauthorized"}`. Combined with the auto-generation, the user sees this error immediately upon opening the modal if the token isn't yet available or if the URL is accessed outside the authenticated session.

**Context**:
- The `PresignModal.tsx` component uses `useEffect(() => { void generate(expiresIn); }, [expiresIn])` which fires on mount.
- The mock storage provider (`mock.provider.ts`) generates a URL pointing to the authenticated download endpoint, which requires a JWT.
- The frontend spec (`spec/specs/frontend/spec.md`) describes the modal as opening with the generated URL already present, without a "Generate" step.

**Current state**: The modal auto-generates the presigned URL on open, shows a loading spinner, and displays the URL with a "Copy to clipboard" button. If the token is missing or the URL is accessed without auth, the user sees "Authentication required".

**Desired state**: The modal opens with the file key and an expiration time selector. The user chooses the expiration time, then clicks a "Generate" button. Only then is the backend called. After successful generation, the URL is displayed with a "Copy to clipboard" button. The user can change the expiration and regenerate as needed.

---

## What Changes

1. **`frontend/src/components/PresignModal.tsx`** — Rewrite the modal flow:
   - Remove the `useEffect` that auto-generates the URL on mount.
   - Add a "Generate" button that calls `api.presign(fileKey, expiresIn)` only when clicked.
   - Show the URL and "Copy to clipboard" button only after successful generation.
   - Add a "Regenerate" capability: when the URL is already shown and the user changes the expiration, show a "Regenerate" button to call the backend again.
   - Maintain error display and loading states for the explicit generation call.

2. **`spec/specs/frontend/spec.md`** — Update the "Generate Presigned URL" requirement to reflect the new explicit-generation flow (MODIFIED delta).

3. **`spec/changes/fix-presign-url-flow/specs/frontend/spec-delta.md`** — Formal spec delta documenting the MODIFIED requirement.

4. **`spec/changes/fix-presign-url-flow/tasks.md`** — Implementation checklist.

---

## Impact

### Affected Specifications
- `spec/specs/frontend/spec.md` — The "Generate Presigned URL (Bonus)" scenario is MODIFIED to require an explicit "Generate" button click before the backend is called.

### Affected Code
- `frontend/src/components/PresignModal.tsx` — Modal flow rewritten: no auto-generation, explicit "Generate" button, URL shown only after success.

### User Impact
- Users now have explicit control over when the presigned URL is generated.
- The "Authentication required" error is no longer shown on modal open.
- The flow is clearer: choose expiration → click Generate → see URL → copy to clipboard.

### API Changes
- None. The `POST /api/logs/:key/presign` endpoint is unchanged.

### Migration Required
- [ ] Database migration — No
- [ ] API version bump — No
- [ ] User communication needed — No (UI-only change)
- [x] Documentation updates — Frontend spec delta

## Timeline Estimate

Small — 1-2 days (single component rewrite + spec update).

## Risks

- **Risk**: Removing auto-generation could confuse users who expected the URL immediately.
  - **Mitigation**: The modal clearly shows the expiration selector and a prominent "Generate" button. The file key is displayed so the user knows which file they're generating a link for.
- **Risk**: The "Authentication required" error on the mock provider's presigned URL persists when the URL is accessed without a JWT.
  - **Mitigation**: This is a known limitation of the mock provider (documented in the README). The fix addresses the UX flow so the error is no longer shown on modal open. The mock provider's URL pointing to the authenticated endpoint is by design for local development.
