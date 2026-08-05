# Tom's core files — editing guide

Tom is the judge agent in the ChatRealty test loop. He lives at
`~/.openclaw/agents/tom/` on the test machine. This directory is the
**authoritative source** for his instructions — when you edit files here and
commit, Tom pulls them via `git pull` at the start of his next session and
overwrites his local copies before dispatching.

Do not edit `~/.openclaw/agents/tom/` directly. Edit here, commit, and let
Tom pull.

---

## What Tom is for

Tom scores each ChatRealty test site against a fixed rubric and files the
report that drives fixes. His job is to break the product, not to produce
comfortable scores. **The findings are the product; the score is just a way
of ranking them.**

Two things Tom is specifically looking for beyond ordinary bugs:

1. **Guide-vs-reality mismatches** — places where the ChatRealty build guide
   told Test Claude something the product contradicted. These are the
   highest-value findings because they're what a real agent following the guide
   would hit.

2. **Language/UX failures in the guide** — the end customer is a **licensed
   real estate agent, not a developer.** They know their market and their
   clients. They do not know what a terminal, an environment variable, a
   database connector, or a token scope is. Every place the build guide or MCP
   tool responses use technical language without a plain-English explanation is
   a first-class defect. Tom flags these with the exact quoted text and a
   rewrite a real estate agent could follow.

A guide that technicians can follow but agents cannot has never actually been
tested for its real audience.

---

## What each file does

| File | Purpose | Edit when |
|---|---|---|
| `AGENTS.md` | Tom's operational playbook — the loop steps, rubric, gates, report format, what he owns and what he never touches | Changing the loop mechanics, adding/removing steps, updating the rubric, fixing a recurring process failure |
| `TOOLS.md` | Environment facts — API endpoints, credentials sources, how to dispatch Test Claude, browser judging setup, pre-session account setup | The tooling or environment changes (new API path, new credential source, spawn arguments change) |
| `MEMORY.md` | Cross-session state — sessions run, recurring issues, persona/market combos used, standing brief rules | After a fix lands (mark resolved), after a new recurring pattern emerges, after standing rules change |
| `SOUL.md` | Tom's values and voice — why he judges the way he does, what failure modes look like, how he writes | Almost never. Touch only if the judging philosophy needs a structural correction. |
| `IDENTITY.md` | Who Tom is — name, role, emoji, where he sits in the loop | Almost never. Name/role changes only. |
| `USER.md` | Who Joe is, what ChatRealty is, what the loop is for | If Joe's preferences or the product description changes significantly |
| `HEARTBEAT.md` | Intentionally empty — Tom's cron schedule lives in OpenClaw, not here | Leave this alone |

---

## Propagation model

```
You edit a file here → commit → Tom pulls at next session start
  → copies updated files to ~/.openclaw/agents/tom/
  → re-reads them
  → then dispatches
```

Tom's pull step (from `AGENTS.md → step -1`):

```bash
cd /Users/macdaddyjoe/code/chatrealty/jpsrealtor && git pull --ff-only
git diff HEAD@{1} HEAD --name-only -- docs/testing/agents/tom/
# if any changed:
for f in AGENTS.md TOOLS.md MEMORY.md SOUL.md IDENTITY.md USER.md HEARTBEAT.md; do
  src="/Users/macdaddyjoe/code/chatrealty/jpsrealtor/docs/testing/agents/tom/$f"
  dst="/Users/macdaddyjoe/.openclaw/agents/tom/$f"
  [ -f "$src" ] && cp "$src" "$dst"
done
```

If your change must take effect before Tom's next cron firing, tell Joe —
he can trigger Tom manually.

---

## Rules for editing

**AGENTS.md is the most sensitive file.** Changes here directly affect loop
behavior. Before editing:

- Understand the two invariants (Tom may only turn testing OFF; one open report
  at a time). Never add a step that routes around these.
- The gates are pass/fail with no partial credit — don't add partial scoring.
- The report format (`## Bugs found` with one H3 per bug) is what the routine
  (judge-loop-check) parses. If you change it, update the routine's parser too.
- Steps are numbered for a reason — step -1 (pull docs) → step 0 (mid-session
  check) → step 1 (poll) → step 2 (brief + account setup) → dispatch. Don't
  reorder.

**TOOLS.md credential section:** Three distinct credential sources must stay
clearly separated:
1. Spark + Groq keys (`.txt` file, used by Test Claude to seed the DB)
2. Database connector (from chatrealty.io setup wizard — goes in the brief)
3. Site token (from chatrealty.io Integrations — goes in the brief)

The judge token (`CHATREALTY_JUDGE_TOKEN`) is for the testing API only (poll,
submit report, disarm). If you see it used for anything else in these files,
that is a bug — it is blocked from provisioning tenant databases.

**MEMORY.md:** This file is Tom's cross-session brain. When you mark a bug
resolved, add `← RESOLVED in vX.Y.Z` to the bullet rather than deleting it —
Tom uses the history to catch regressions. Add new recurring issues as bullets
under "Recurring issues across sessions." Update "Combos used" if personas or
markets change. Update "Standing rules" if brief requirements change.

**Language/UX findings in AGENTS.md:** The guide-vs-reality section of the
report template has two categories: technical mismatches and language/UX issues.
If you update what counts as a language finding or change the jargon watchlist,
update the brief instructions in AGENTS.md (the "guide must be readable by a
non-technical real estate agent" section) to match.

**Don't add secrets.** No token values, no connection strings, no credentials
in any of these files. Paths and env var names only.

---

## What NOT to change here

- Tom's schedule (cron timing) — lives in OpenClaw's cron config, not here
- The routine's scripts (`scripts/agent-feedback.mjs`) — separate system
- The rubric score weights — changing weights invalidates all prior session
  comparisons; discuss with Joe first
- The GPS MLS market restriction — this is a hard constraint (Spark credentials
  only cover the Greater Palm Springs footprint)
- The two invariants — Tom may only turn testing OFF, and only one report can
  be open at a time. These are enforced server-side for good reason.

---

## After editing

1. Commit with a clear message describing what changed and why
2. If the change fixes a guide-vs-reality discrepancy Tom filed, note the
   session number and report ID in the commit message
3. If the change fixes a language/UX finding, note which jargon term was
   replaced and what the plain-English version is
4. If it changes something Tom needs to know immediately, tell Joe to trigger
   a manual Tom session so he pulls before the next cron fires
