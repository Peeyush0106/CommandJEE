# CommandJEE (web)

## Run
Requires Node.js 20+.
```powershell
npm install
npm run dev:web
```
Open http://localhost:3000.

## What's new in v8
- Dashboard (was Overview) leads with a red-tinted *Today's focus* card; analytics are secondary
- Today tab: clock, timeline with a now-line, tasks, events, day analytics, focus stats, tomorrow
- Pomodoro: full-screen neon timer (Esc minimizes). Dynamic Island shows the live task and the timer, splitting in two when both are active
- Countdown chip (top right) with rolling digits, live 24h clock in the sidebar
- Profile page + profile menu with quick tools; shortcuts: N, P, T, D, ?
- Fixed: subject analytics scrolling

## Features
- Overview: live countdown (exam date configurable), KPIs, syllabus donut, 7-day study chart, today's schedule
- Chapter tracker: search, subject/priority/status filters, drag reorder, per-subject analytics (Esc to close)
- Calendar: click a day to see/add its blocks (week starts Monday)
- Study planner: upcoming / past views, per-day progress, undo on delete
- Revisions queue, mock tests with trend chart and delete
- Add-study-block wizard: live chapter search, multi-chapter blocks, clash warning
- AI Study Manager: rule-based local assistant; approved proposals really update the planner
- Dark/light theme, JSON backup export and import
- Pages are linkable (`#/planner`) and survive refresh

## Data
Stored in this browser (localStorage key `commandjee.web.v1`, unchanged from earlier versions). Export backups regularly.
