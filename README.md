# Productivity Tracker

Brandon's productivity tracker — a single-page app plus a local review workspace.

## Two parts in this folder

### 1. The app (this repo — deployed)
The tracker itself: a single-page app that stores state in the browser and syncs
to JSONbin.

- **Live:** https://bwd-productivitytracker.netlify.app/
- **Source:** [`index.html`](index.html) (the whole app) + [`netlify/functions/triage.js`](netlify/functions/triage.js)
- **Deploy:** push to `origin` (GitHub `bdemaris-gwe/productivity-tracker`) → Netlify auto-deploys.
- `.env` holds the GitHub push token (gitignored).

### 2. `review/` — local-only review & planning workspace (NOT deployed)
Node tooling that pulls the tracker's live data from JSONbin so Claude Code can act
as a thinking partner for weekly / monthly / quarterly / yearly reviews.

- Fully **gitignored** — it holds personal data and JSONbin keys and must never reach GitHub.
- Start here: [`review/CLAUDE.md`](review/CLAUDE.md) — the framework, data model, and how to run a review.
- Refresh data: `cd review && node fetch.js`

> The `review/` workspace only **reads** unless you explicitly run `commit-week.js`.
> The app is always the source of truth.
