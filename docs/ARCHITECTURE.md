# Architecture and data model

## User-owned data (current web implementation)
All private data is scoped beneath `/users/{uid}` and guarded by verified-email owner rules:
- `/users/{uid}/workspace/state`: the current web workspace (profile, preferences, chapters, tasks, recurring classes, mocks and focus log) written as one debounced document.
- `/users/{uid}/account/state`: export timing and deletion/recovery markers.

The single workspace document is intentionally simple for the first two-user release and small free-tier workloads. Firestore local persistence is enabled in the browser. The document has Firestore's 1 MiB size ceiling; if real usage approaches it, migrate arrays into the per-entity subcollections described in the original design before adding large notes or history.

No browser-local study data is imported at sign-up. Future Android work should share the data types and rules but should not reuse the web-only persistence implementation.

## AI safety / approval flow
1. Authenticate the user.
2. Fetch only the user's relevant schedule, chapter and performance context.
3. Ask the model for suggestions or structured proposed actions.
4. Validate proposed actions against allowed schemas and user ownership.
5. Save proposals as `pending`.
6. User approves or rejects.
7. Only an approved proposal is applied by a trusted backend function.
8. Record an audit event.

The model must never receive Firebase admin credentials, unrestricted database access or the OpenAI API key from a client.

## Calendar and study-day accounting
Task start date/time and duration are stored once. Rendering and daily statistics derive the segment that intersects each configured logical day (day starts at midnight by default, configurable through 08:00). Blocks crossing the boundary contribute only their intersecting minutes to each day. Recurring classes are stored as weekly rules with dated exceptions, not copied into task documents. The current web client uses the browser's local time zone.

## Countdown
Default target date: 2027-01-15. The UI calculates the remaining time locally every second. Store the target as a user setting so the actual exam session date can replace the default.

## Free-tier account lifecycle
Account deletion is a soft-delete marker with a 30-day recovery window. Logging in during the window clears the marker automatically. There is deliberately no scheduled Cloud Function while the project must remain on free resources: expired deletion is physically cleaned up when the owner next signs in and reauthenticates. Accounts that never sign in again after expiry require a paid/trusted scheduled cleanup service for guaranteed background erasure.
