---
title: Visitor activity (pages viewed, time on page)
status: current
last_verified: 2026-11-03
related: [README.md, ../admin/README.md, ../auth/README.md, ../crm/README.md]
---

# Visitor activity

What a lead looked at on a site, and for how long. Shown in three places:

| Where | Endpoint | Scope |
|---|---|---|
| Admin → Users → **User Details** → *Site activity* | `GET /api/admin/users/[id]/activity` | Every site; each row shows its host |
| Agent → Contacts → open a contact → *Site activity* (above Notes) | `GET /api/crm/contacts/[id]/activity` | **Only pages on sites that agent owns.** Contact must be theirs too |
| Agent → Dashboard → **Site visitors** | `GET /api/agent/visitors?days=` (list), `GET /api/agent/visitors/[key]?days=` (timeline) | Only the agent's own sites; the agent's own browsing is excluded |

The first two render `src/app/components/crm/VisitorActivityCard.tsx` from
`summarizeVisitorActivity()` in `src/lib/visitor-activity.ts`: visits, pages
viewed, total visible time, last seen, top 5 pages by time, and the last 40
pages.

## Site visitors panel

`src/app/agent/dashboard/components/SiteVisitors.tsx`, backed by
`src/lib/agent-visitors.ts`. Range 7/30/90 days. Lists signed-in visitors
(name, email, a *Contact* badge when they're in the agent's CRM, pages,
listings, time, last seen); anonymous visitors sit behind a "Show N anonymous"
toggle. Expanding a row shows a per-day timeline: time of each view, the page
or listing, and how long. Listing pages (`/mls-listings/<slugAddress>`) are
matched to `unifiedlistings` for address, price, beds/baths and photo
(`primaryPhoto.uri300` — synced rows rarely have `primaryPhotoUrl`). A listing
that has left `unifiedlistings` shows "Off market".

Visitor keys: `u:<userId>` signed in, `a:<anonymousId>` not.

**Not captured:** a listing opened in a panel inside chat or the map counts
only if the URL changes — the tracker records route changes, not UI panels.
(Not yet audited which panels change the URL.)

## How it's recorded

1. `src/components/PageViewTracker.tsx` (mounted in `ClientLayoutWrapper`)
   mints a `viewId` per route change and beacons `POST /api/activity/page-view`
   on open, on every tab-hide, and on leaving the page.
2. Time counts only while the tab is **visible**. The route upserts on `viewId`
   and keeps the `$max` duration, so repeat beacons never double-count. Capped
   at 6 h per view.
3. Each row stores `host`, `path`, `title`, `agentId` (owner of the host —
   subdomain, custom domain or registry; `null` on platform hosts) and either
   `userId` or the browser's `anonymousId`.
4. The first signed-in beacon in a tab (`first: true`) stamps `userId` onto that
   browser's earlier anonymous rows — so an agent sees what the lead browsed
   **before** signing up.

Collection: `pageviews` (`src/models/PageView.ts`). Rows expire after 18
months (TTL index on `startedAt`).

Not recorded: `/admin`, `/agent`, `/auth`, `/api` paths; impersonation sessions
(an admin acting as an agent is not that agent's visitor). Agent sites served
by their **own external deployment** (proxy-rewrite, see
[external-site](../chatrealty-api/external-site.md)) don't run this tracker.

**Recording started 2026-11-03.** Nothing before that exists — the old
`trackPageView()` in `src/lib/activity-tracker.ts` had no route behind it and
no callers.

## "Which agent did they sign up with?"

`User.signupOrigin.agentId`. Email/password sign-up sets it at
`/api/auth/register`. **Google/Facebook sign-ups can't** — NextAuth's `signIn`
callback has no request, and on an agent's site the OAuth round trip runs on
chatrealty.io before handing back via `/api/auth/receive`. They're stored as
`domain: "unknown"` and filled by `backfillSignupOrigin()`
(`src/lib/signup-origin.ts`) on the first request from the real site: the
`receive` hand-off, or the first signed-in page-view beacon. It also creates
the agent's CRM contact (`linkUserToAgent`). Only for accounts < 2 h old with
an unknown origin.

Before 2026-11-03 this backfill didn't exist (a code comment claimed it did),
so earlier Google sign-ups — e.g. Becky Rees, 2026-10-29 — have no agent and
no CRM contact, and can't be recovered from data we hold.
