# CommandJEE

A JEE preparation workspace built as a Next.js web app with a shared chapter catalogue.

## Run locally

Requires Node.js 20+.

```powershell
npm install
npm run dev:web
```

Open http://localhost:3000.

## Firebase setup

The web app uses Firebase Authentication and Cloud Firestore. Copy `apps/web/.env.example` to `apps/web/.env.local` if the local file is not already present, then set the Firebase web configuration values. The Firebase web API key is a public client identifier; restrict it to the app's domains in Google Cloud.

In Firebase Console:

1. Enable Email/Password authentication. Email verification is required before the app unlocks.
2. Enable Google only if users want to link it to an existing email/password account.
3. Create the Firestore database and deploy the repository's `firestore.rules`.
4. Add `localhost` and the eventual production domain to authorized domains.
5. Configure Firebase App Check before opening the app to public traffic.

Each user has a separate workspace under their Firebase UID. Existing browser `localStorage` data is intentionally not imported.

## Account and free-tier limits

- Google can be linked after signing in with email/password.
- Phone linking is deferred to avoid unexpected Firebase SMS/billing charges.
- Export requests require reauthentication and a typed phrase, wait 24 hours, and are limited to one every 30 days.
- Deletion requests require reauthentication and a typed phrase. Logging in during the 30-day recovery period automatically cancels the request.
- To keep the project free-tier-only, there is no scheduled Cloud Function. A deletion past its recovery window is physically cleaned up when that account next signs in; this is not background deletion if the user never returns.
- Hosting is intentionally undecided. The Firebase web-framework hosting integration may require a paid plan; evaluate free hosting separately before deployment.

Notifications, install/PWA support, passkeys/2FA, and Android are deferred.

## Included features

- Dashboard, Today, chapters, calendar, planner, revisions, mock tests, rule-based study manager, and Pomodoro
- Configurable study-day boundary (00:00 default, selectable in 30-minute steps through 08:00)
- Full 24-hour day timeline; blocks are split across logical days for daily totals
- Recurring class rules with per-occurrence cancellation and date/time changes
- Syllabus overview with subject status heatmaps and remaining-pace estimates
- Dark/light theme, profile, Firebase sync, and Firestore offline cache
