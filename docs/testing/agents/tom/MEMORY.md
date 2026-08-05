# MEMORY — Tom, Judge

**This file is working state, not an archive.** I re-read it before every
session, so it stays short enough to read carefully. When a finding is fixed and
a later session confirms it, I **delete it** — if it taught something general,
that lesson becomes a rule in `AGENTS.md` or `SOUL.md`, and the bullet still
goes. Regression checking does not depend on this file: `resolutionNotes`
arrive fresh from the API on every poll, and that is what I re-verify against.

Sessions are named by **date + the coverage cell targeted**, not by a running
number — `2026-08-05 seed-gps` says what a session was for; `session 11` does
not. `docs/testing/coverage.md` is the progress record.

---

## Standing rules — carried into every brief

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
  site token from Integrations, and the Spark keys path for the seed step.
- Credentials path: `/Users/macdaddyjoe/Downloads/spark-rep (1).txt` — quote the
  spaces and parentheses. Path only, never values.
- Brief goes in `BRIEF.md`; completion requirements go in the spawn `task`
  string as well.
- Localhost only. Never deploy, never publish.
- Core files: pull `docs/testing/agents/tom/` before each dispatch and sync to
  the workspace if changed.

## Open — not yet fixed

- **The backend chain has never run.** No session has provisioned a tenant
  database, seeded it, served from it, or configured the nightly refresh. Every
  cell in `coverage.md` matrix 1 is empty. This is phase 1 and nothing else
  matters until it passes once.
- **A fresh account cannot self-serve.** No Integrations tab, so no site token,
  so no tenant database. This is the wall every session has routed around. Dev
  Claude promotes the account; I do not work around it.
- **"Back to listings" loses the search filters.** Marked fixed after one
  session, broken again the next. The `href` is correct in the DOM; navigation
  strips the query params. Fragile — re-check every session.
- **"View all N photos" missing from the swipe deck.** Resolution notes said it
  was rerouted on-site; it is not present at all. Removed rather than rerouted,
  or the fix never shipped.
- **The child exits without reporting.** Two sessions running: builds and
  starts the dev server, then exits without `SESSION-NOTES.md`, without
  `COMPLETE`, without a message. The completion requirements now live in the
  spawn `task` string as well as the brief — unverified whether that fixes it.

## Recent combos — rolling, don't repeat too soon

- Cathedral City / Desert Hot Springs / Thousand Palms — family relocation,
  mid-market, bright and optimistic
- Palm Springs — luxury mid-century modern, Movie Colony / Deepwell
- Rancho Mirage / Indian Wells / Palm Desert — luxury golf and country club

## What I've learned about how I work

Kept because it changes what I do, not because it happened.

- **A high score can mean I tested nothing.** Two sessions rendered real GPS
  listings by pointing the site straight at the feed and I scored them 82 and
  71 — no database, no seed, no cron. I filed one as a milestone. Now I ask
  *"is this what Joe would want"* before scoring anything, and gate 8 makes the
  bypass a failure.
- **The rubric can be the thing that's wrong.** When a build passes my checks
  and still tested nothing Joe cares about, the finding is the rubric. I say so
  rather than scoring what I can measure and staying quiet about what I can't.
- **A comfortable score is the failure mode.** The two sessions with the fewest
  findings were the two least worth running.
- **Silence is never information.** A missing completion message means neither
  alive nor dead. I check the directory, not my inbox.
- **If an instruction names a tool I don't have, I stop and tell Joe.** Six
  dispatch attempts died from improvising substitutes.
- **Stop early.** Finding is cheap for me, fixing is expensive for everyone
  else. Structural failure → report immediately; otherwise the top few by
  severity, and say plainly that more exist.
