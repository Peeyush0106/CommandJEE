# CommandJEE Web-first build

## Run the website (Windows PowerShell)
Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev:web
```
Open http://localhost:3000.

## Included
- Dashboard and live countdown to 15 January 2027 (midnight IST)
- Chapter tracker with subject/priority/status filters and PYQ counters
- Monthly calendar
- Study planner and task completion
- Revision queue
- Mock-test score records
- AI Study Manager local suggestion demo with approval interaction
- Dark/light theme and JSON backup export
- Browser-local persistence; no login required

## Data
Currently uses localStorage. Data is stored in this browser profile and is not synced to other devices. Firestore repository and optional Firebase Authentication are the next integration stage. The Android app is intentionally postponed.
\n\n## v6.7 event builder updates\n- Chapter suggestion list is viewport-fixed and can extend beyond the modal.\n- Subject filter contains only Physics, Chemistry, Mathematics; the list-level All action adds all chapters for the selected subject.\n- Duplicate chapter selections merge their task selections.\n- Saved events retain ordered per-chapter entries with individual completion checkboxes.\n- Scheduling step includes an editable, prefilled event title.\n- Successful saves show a confirmation toast.\n

## v6.8 chapter suggestion overlay fix
- Chapter suggestions are rendered through a document-body portal, avoiding modal/backdrop stacking contexts and fixed-position containing blocks.
- The dropdown is anchored using the chapter input viewport rectangle and rendered above the modal with a high stacking order.
