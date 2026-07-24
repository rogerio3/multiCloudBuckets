# Implementation Tasks: Fix Presigned URL Generation Flow

## Phase 1: Component Rewrite

1. Rewrite `PresignModal.tsx` to remove the `useEffect` auto-generation
2. Add a "Generate" button that calls `api.presign()` only on click
3. Show the URL and "Copy to clipboard" button only after successful generation
4. Add a "Regenerate" button for changing the expiration after the URL is shown
5. Maintain error display and loading states for the explicit generation call

## Phase 2: Spec Updates

6. Create `spec-delta.md` with MODIFIED requirement for the presigned URL flow
7. Update `spec/specs/frontend/spec.md` to merge the spec delta

## Phase 3: Validation

8. Verify the modal opens without calling the backend
9. Verify the "Generate" button calls the backend and shows the URL
10. Verify the "Copy to clipboard" button works after generation
11. Verify the "Regenerate" button works when changing expiration
12. Run frontend lint and typecheck
