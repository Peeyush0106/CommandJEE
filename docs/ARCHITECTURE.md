# Architecture and data model

## User-owned data
All private data is scoped beneath `/users/{uid}`:
- `profile`: display name, timezone, exam target
- `preferences`: theme, quiet hours, notification consent, study target
- `coachingSchedule`: recurring coaching blocks
- `chapters/{chapterId}`: priority, status, subtopic progress, PYQ stats
- `tasks/{taskId}`: planned study blocks and task state
- `events/{eventId}`: calendar events (study, revision, mock, deadline)
- `studySessions/{sessionId}`: actual time spent
- `revisions/{revisionId}`: spaced-repetition queue
- `mockTests/{mockId}`: marks, accuracy, subject and chapter analysis
- `fcmTokens/{tokenId}`: device notification tokens
- `aiProposals/{proposalId}`: proposed plan changes and approval state

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

## Calendar
Calendar events are stored in Firestore with UTC timestamps plus the user's IANA timezone. Render month/week/day views in local time. Recurring coaching blocks should be expanded for display or generated into bounded event windows by a trusted backend process.

## Countdown
Default target: 2027-01-15 00:00 Asia/Kolkata. The UI calculates the remaining time locally every second. Store the target as a user setting so the actual exam session time can replace the default.
