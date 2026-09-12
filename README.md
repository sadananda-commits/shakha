# HSS Denmark Portal — Frontend Scaffold

Next.js 14 (pages router) + TypeScript + Tailwind. Reads/writes everything
through the Apps Script API in `/hss-apps-script`.

## Setup

```bash
cd hss-portal
npm install
cp .env.local.example .env.local   # then paste in your Apps Script /exec URL
npm run dev
```

Open http://localhost:3000. Builds clean with `npm run build` (verified —
all 9 pages prerender).

## Pages

| Route | What it does |
|---|---|
| `/` | Public home page — hero, activity cards from `getActivities` |
| `/my-shakha` | Login / register (with GDPR consent) / dashboard — next Shakha, run-of-show, attendance poll, profile view+edit, add family participants |
| `/coordinator` | Shakha Coordinator dashboard — participant summary stats, next-Shakha attendance counts, participant search |
| `/coordinator/schedule` | Coordinator schedule management — create draft dates, build the run-of-show, copy a previous week's activities, publish |
| `/baudhik`, `/khel` | Repository listings filtered by category |
| `/admin` | Admin login + dashboard (summary cards, area overview, participant search) |

`/coordinator*` pages check `isCoordinator` from `getMyDashboard` client-side
for UX (showing/hiding the link), but the real enforcement is server-side —
every Coordinator action in the Apps Script backend re-validates the caller's
Role and that they coordinate the specific Shakha ID passed in, so this isn't
just a hidden link.

Session is kept in `localStorage` (`hss_user_id`, `hss_admin_email`) — fine
for this stage; swap for a real session/cookie approach before production if
you want server-side auth checks on protected routes.

## Design direction

The brief is a Hindu community organization operating in Denmark — so the
palette leans into both halves rather than defaulting to a generic warm-cream
template: **deep indigo** (night sky / traditional indigo dye) as the primary
ink color, a warm **sandstone paper** background, and a **marigold/vermilion**
flame accent used sparingly for the one signature element — a small arc of
flame silhouettes (`FlameDivider`) representing the diya lit at the start of
each Shakha, placed once per page under the main heading.

Type: **Fraunces** (display, characterful serif) + **IBM Plex Sans** (body,
multilingual-friendly) + **IBM Plex Mono** (data/labels like times and IDs).

## Wiring to the backend

`lib/hssApi.ts` implements the `text/plain` POST pattern documented in
`/hss-apps-script/README.md` to avoid CORS preflight. Every page calls it
through `callHssApi(action, params)` — no direct Sheets access from the
browser, matching the spec's security requirement.

Until `NEXT_PUBLIC_HSS_API_URL` is set, the home page falls back to a small
hardcoded activities list so the UI is still browsable during early dev.

## GDPR consent

Both the registration form and the "Add Participant" form require an
explicit, unchecked-by-default checkbox before submitting — the backend
(`registerUser`, `addParticipant`) rejects the request outright if
`gdprConsent` isn't `true`, so this isn't just a frontend nicety.

## Suggested next steps

1. Add data-validation for `Shakha Coordinator` as a Role option in the
   `Users` tab if it isn't already there from the migration.
2. Assign a `Coordinator User ID` on at least one Shakha to test
   `/coordinator` end-to-end.
3. Consider a lightweight edit UI on `/coordinator/schedule` for reordering
   activities (currently Sequence is set on creation only) and editing an
   existing activity's time/name in place rather than remove+re-add.
4. Admin's own Shakha/Schedule editing UI still isn't built on `/admin` —
   the backend actions (`upsertShakha`, `upsertScheduleEntry`) exist and are
   ready to wire up whenever it's a priority.
