# MEMORY — Tom, Judge

**This file is mine, and it is working state — not an archive.** I re-read it
before every session, so it stays short enough to read carefully. When a finding
is fixed and a later session confirms it, I **delete it**; if it taught
something general, that lesson becomes a rule in `AGENTS.md` or `SOUL.md` and
the bullet still goes. Regression checking does not depend on this file:
`resolutionNotes` arrive fresh from the API on every poll, and that is what I
re-verify against.

> **Not synced.** `MEMORY.md` is deliberately absent from step -1's copy list.
> It used to be in it, which meant every firing overwrote what I had written
> with the repo's copy — my memory never survived a single cron tick, and the
> Current site block below was wiped before it could ever be read. The repo
> copy is a starting point and a backup, nothing more. Dev Claude does not
> write here; durable instructions come via `AGENTS.md` or `resolutionNotes`.

Sessions are named by **date + the coverage cell targeted**, not by a running
number — `2026-08-05 seed-gps` says what a session was for; `session 11` does
not. `docs/testing/coverage.md` is the progress record.

---

## Current site — what I am FINISHING before anything new

- (none — set this block at next dispatch: account, persona, subdomain,
  checklist state per AGENTS.md Finished-Site Checklist)

## Standing rules — carried into every brief

- **FINISH BEFORE NEW.** Continue the current site across sessions until the
  Finished-Site Checklist passes (all template features working · data seeded
  + responding everywhere, watermark committed, photos + location stack
  populated · subdomain serving the deployment via connect_site). New
  personas are earned, not rotated.
- **A brief on an existing site is a PUNCH LIST** (AGENTS.md step 2, PUNCH
  LIST branch). The unchecked boxes and nothing else. No new persona, no new
  market, no design direction — those belong to the NEW SITE branch, which
  only runs when there is no current site. The Current site block above is
  what decides which branch I'm on.
- **Accounts are mine now.** I sign up with a `+crtest` address and run
  `scripts/test-accounts.ts` myself (promote · enrich --partial · token
  --out=<path>). No throwaway inboxes — the tooling refuses them. Dev Claude's
  only account job is RETIRING one when its site is finished or abandoned.
- **Mode before everything.** The poll is step 0 and carries
  `mode: idle | working`. Idle = pull docs, answer chat, STOP — no in-flight
  check, no triage, no dispatch, even if a build is running. I never set it.
- **Tickets before coverage.** My poll also carries `openTickets` and
  `unreadMessages`. In working mode, open fingerprints get triaged into goals
  first (AGENTS.md step 1); console messages get answered on the firing I read
  them, in either mode.

- **Greater Palm Springs only**, for as long as GPS is the only association we
  hold credentials for. This is a constraint, not the goal — see
  `coverage.md`. California only. Fictitious persona, internally consistent,
  `(760)` area code.
- **One persona, one market, one association per session.** Never an agent
  carrying every association's data. Narrow scenarios make findings
  attributable.
- **Gate 8: the backend must actually be used.** Agent's own credentials →
  seeded into the agent's own database → site reads from it → nightly refresh.
  Reading a feed directly at runtime, or platform inventory through a dogfood
  token, fails the gate however real the listings look.
- **`CHATREALTY_JUDGE_TOKEN` is for the testing API only.** Never the site
  token, never in a brief. Using it as the build token blocks tenant DB
  provisioning with a 403.
- **Brief must include:** the database connector from the setup wizard, the
  **path** to the token file written by `test-accounts.ts token --out`, and
  the Spark keys path for the seed step. Paths, never values — all three.
- Credentials path: `/Users/macdaddyjoe/Downloads/spark-rep (1).txt` — quote the
  spaces and parentheses. Path only, never values.
- Brief goes in `BRIEF.md`; completion requirements go in the spawn `task`
  string as well.
- Localhost only. Never deploy, never publish.
- Core files: pull `docs/testing/agents/tom/` before each dispatch and sync to
  the workspace if changed.

## Open — not yet fixed

- (none — cleared 2026-08-10)

## Recent combos — rolling, don't repeat too soon

- (none — cleared 2026-08-10)

## What I've learned about how I work

Kept because it changes what I do, not because it happened. Empty right now on
purpose: every lesson the first twenty sessions produced has been promoted into
`AGENTS.md` or `SOUL.md` as a rule that fires on its own, which is where a
lesson belongs once it has stopped being news.

- (none yet)

---

**Reset 2026-08-10.** Everything above the standing rules was cleared and the
loop restarted from a known-good process. The previous run accumulated its
findings against a broken one — my memory was being overwritten on every cron
firing, so no Current site block ever survived to be read, and each session
started over without knowing what the last one was finishing. That is fixed
(see the Not-synced note at the top). Nothing was lost that mattered: the
lessons are rules now, product defects live in the bug tracker, and coverage
progress lives in `coverage.md`. This file starts empty because the process it
was recording is not the process I run any more.
