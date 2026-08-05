---
title: Tom — the judge agent
status: current
last_verified: 2026-08-04
related: [../README.md, ../mcp/web-design/README.md, ../mcp/web-design/create-agent.md]
---

# Tom — the judge agent

Tom is the **judge** from `docs/testing/README.md`, made real. That doc
specifies the role; this one documents the agent that fills it — where he
lives, what he's told, how to operate him, and the environment facts that cost
a full night to learn.

Built 2026-08-03 via the `openclaw-agent` skill.

> **Tom does not live in this repo.** He's an OpenClaw agent in
> `~/.openclaw/agents/tom/`, not version-controlled here. This doc is the
> pointer. When you change one of his files, update this doc in the same
> session — `docs/AGENTS.md` drift rules apply even though the source of truth
> is outside the tree.

## What Tom is for

**His job is to break the product, not to produce comfortable scores.** This is
written into his `SOUL.md` as a core truth, because the failure mode of an
agreeable judge is silent: it returns 80s forever while real defects ship to
licensed agents' websites.

> A session where he found nothing is a session where he didn't look hard
> enough. A 92 that missed a broken data hookup is worse than a 54 that found
> it. The findings are the product; the score just ranks them.

So he takes the path most likely to **fail** rather than the one most likely to
look good, asks CHAP the nonsense question, tries what the guide doesn't cover,
and pushes on anything that *almost* works until it holds or breaks. Softening
a finding or rounding a score up is explicitly named a failure mode.

## At a glance

| | |
|---|---|
| **Agent id** | `tom` |
| **Workspace** | `/Users/macdaddyjoe/.openclaw/agents/tom` |
| **Model** | `claude-cli/claude-sonnet-4-6` (set on both the agent and the cron job) |
| **Schedule** | cron `417427ba-dc63-4d12-a90c-540fdde16cd3`, `*/15 * * * *`, 2m stagger, isolated |
| **Delivery** | `mode: none` — he calls the `message` tool explicitly; fallback delivery only ever shipped no-op chatter |
| **Token** | `/Users/macdaddyjoe/.openclaw/secrets/chatrealty-judge.env` (mode 600, outside the workspace, which is a git repo) |

## His files

| File | What it carries |
|---|---|
| `IDENTITY.md` | Name, ⚖️, where he sits between Test Claude and the routine |
| `SOUL.md` | Temperament: break it don't please Joe · evidence or no score · a false pass is the expensive mistake · gates aren't tradeable · judge what renders · listing neutrality · never fix what you judge |
| `USER.md` | Joe, ChatRealty, the other actors, and the reframe that **the build guide is the product under test** |
| `AGENTS.md` | The operation: loop steps 0–5, API invariants, autonomy always/ask-first/**never**, GPS rule, real-data mandate, 7 gates, 100-point rubric, report format, failure modes |
| `TOOLS.md` | The three `curl` calls, token loading, `sessions_spawn` dispatch with verified arguments, what he does and doesn't have |
| `HEARTBEAT.md` | Deliberately empty — scheduling is `openclaw cron`; a second scheduler would double-dispatch |
| `templates/session-settings.json` | The per-session permission allowlist |

Runtime state he creates: `memory/YYYY-MM-DD.md` (daily), `MEMORY.md`
(long-term: session counter, briefs used, recurring defects), and
`state/session-in-flight.json`.

## Tom's real tool surface

**This is the single most important section for anyone editing his files.**

Tom runs on the `claude-cli` backend. Per OpenClaw's docs: *"The CLI backend
never receives tool calls, and no OpenClaw tools are available when using the
claude-cli backend."* So:

| Has | Does NOT have |
|---|---|
| Claude Code's `Bash` (`command`, `run_in_background`), `Read`, `Edit` | `exec` — no `workdir`, `pty`, `background`, `yieldMs` |
| OpenClaw MCP bridge: `sessions_spawn`, `sessions_list`, `sessions_yield`, `subagents` | `process` — no `list`/`poll`/`log`/`submit`/`kill` |
| ChatRealty MCP (`mcp__chatrealty__*`) incl. `report_bug`, `give_feedback`, `whoami` | Terminal control — Apple Events to Terminal are blocked for the gateway |
| A browser, including `localhost` | |

**Writing instructions against tools he lacks is the most expensive mistake
available.** It cost six failed dispatch attempts in one night. Every one of
`osascript`, `tmux`, `open -a Terminal`, and `bash background:true workdir:…`
assumed capabilities this backend does not have. His files now tell him: **if
an instruction names a tool you cannot find, stop and tell Joe** — don't
improvise a substitute.

Note the asymmetry: on a native OpenClaw model he *would* have `exec` and
`process`. Switching him to sonnet (to escape a quota exhaustion) silently
removed them.

## The loop, as Tom runs it

```
0. in-flight marker exists?  ──yes──►  check on the build (below), don't dispatch
        │ no
        ▼
1. poll GET /api/skill/testing  ──condition fails──►  stop silently
        │ testingOn && (no report || report complete)
        ▼
2. invent persona → write BRIEF.md + allowlist → sessions_spawn the builder
   → WRITE THE MARKER (same turn, incl. childSessionKey)
        ▼
3. judge the rendered site in a browser (gates first, then dimensions)
   3b. …answering Test Claude's questions throughout the build
        ▼
4. coach Test Claude; confirm report_bug + give_feedback were filed
        ▼
5. POST report {testingOff: true}  ──201──►  clear the marker
```

### Why the in-flight marker exists

**This is where Tom's implementation departs from the design in
`../README.md`, and it's a real defect in that design.**

`testingOn` stays `true` and `latestReport` stays `null` for a build's *entire*
duration — the dispatch condition only clears when the judge POSTs at the end.
The written state machine assumes a judge that dispatches then *blocks*, which
is true of a synchronous process.

Tom is a cron job. Every firing is a fresh isolated session with no memory of
the last. Without a marker he re-polls, sees the same unchanged condition, and
dispatches a brand-new persona — every 15 minutes, for as long as a build runs.

The division of labour:

- **API invariants** (one-direction toggle, one open report) protect *the
  routine* from the judge.
- **The in-flight marker** protects *Test Claude* from the judge.

Written in the same turn as the spawn, cleared **only on a `201`**. A `409`
means the session is still open and the marker must survive.

> **A marker proves a session was dispatched. It never proves one is alive.**
> Session 3 sat dead for 40 minutes because Tom read the marker, inferred "in
> flight", and stayed silent across three firings. His rules now say: silence
> requires positive proof of a live child; if you can't verify, treat it as
> dead; and **never return NO_REPLY on a firing where the site is incomplete** —
> if you can't act, say why, out loud.

### Step 0 is supervision, not just a guard

The child reports its own completion (spawned with `mode: "run"`), so most
firings need nothing. This check covers the case where that message never came.
He uses `subagents { action: "list" }` plus plain `ls`/`find` on disk — **not**
a poll loop. OpenClaw's `subagents` tool says so in its own description: *"If
sessions_yield exists, use it for completion; do not poll wait loops."*

| Child | The site | Tom does |
|---|---|---|
| active | — | Stay silent. Builds are slow; quiet is not stuck |
| gone, no message | matches the brief | Tell Joe to confirm it's up so he can judge |
| gone, no message | **incomplete** | **Spawn a fresh child** with a continuation task |
| gone | nothing built | It died early — tell Joe with what's on disk |
| can't tell | — | Treat as dead. Never resolve ambiguity into silence |

Bounded: never spawn on top of an active child, log every continuation count to
memory, and after ~5 with little progress stop and tell Joe — a build that
isn't progressing is itself a finding.

## Dispatch — `sessions_spawn`

Tom spawns Test Claude as a **child session** using OpenClaw's own multi-agent
primitive. He does not shell out, background a process, or manage a terminal.

Prepare on disk first (ordinary `Bash`): create `test-sites/session-N/`, copy
the allowlist template into `.claude/settings.json` with the session number
substituted, and write the full brief to `BRIEF.md`.

Then `sessions_spawn` with the **verified schema**:

| Argument | Value |
|---|---|
| `task` | *(required)* build instruction + the question route back to Tom |
| `cwd` | the session directory — **this is what puts the build in the right place** |
| `model` | `claude-cli/claude-sonnet-4-6` — gives the child real file and shell tools |
| `label` / `taskName` | `session-<N>` |
| `mode` | `run` — one-shot background; **its result returns to Tom as a message** |
| `context` | `isolated` · `runtime` `subagent` · `cleanup` `keep` |

**`runTimeoutSeconds` does not exist** in the real schema despite appearing in
some documentation. Passing it is an error.

The completion signal is free. Tom builds no `worker.log`, no `pgrep`/`lsof`
liveness check, no respawn loop — all of that was scaffolding reconstructing a
signal the platform already delivers. OpenClaw's own issue #50398 says
`exec background` breaks completion notification precisely this way: *"the
isolated session has no knowledge of what was delegated… completion is silently
consumed by a context-free heartbeat session."*

### Dead ends, kept as history

Each looked right until it ran. Recorded so nobody re-derives them:

| Attempt | Why it failed |
|---|---|
| `osascript` → Terminal.app | Apple Events need macOS Automation permission the gateway lacks. Calls **hung silently** rather than failing — then fired late, on top of the retry, producing **three** Claude instances in one directory |
| `open -a Terminal` + `--dangerously-skip-permissions` | The flag sets the mode but does **not** clear Claude Code's separate one-time acknowledgement dialog. Every window froze on it |
| tmux + `capture-pane`/`send-keys` | Worked, but solved the wrong problem — teaching Tom to *answer* dialogs that shouldn't exist |
| `coding-agent` skill's `bash background:true workdir:…` | That's the skill's **tool-call notation**, not a shell command. Tom has no such tool |
| `Write(path)` allowlist rules | Claude Code only applies `Edit(path)` to file operations; `Write(` matches nothing. Worker died on its first file write |
| `$PROMPT` from `mktemp` | Set in one tool call, used in another. Fresh shell, empty variable, redirect from `""`, instant death |

Two habits came out of it: **paths and prompts are literal, never shell
variables** (each Bash call is a fresh shell), and **verify a document parses**
— one "fix" left an unclosed code fence that buried the instructions inside a
code block, and grep-for-a-keyword reported success.

## The market is GPS MLS only

**Greater Palm Springs is the only MLS the Spark test credentials cover.** A
persona anywhere else gets a site with zero real listings, which makes the
buyer's journey, the truth dimension, geography consistency, IDX attribution
and every CHAP result untestable.

This was learned the expensive way: session 5 put a **Sacramento** persona on
Coachella Valley inventory; session 6 used **Newport Beach**. Both were
unjudgeable on the dimensions that matter.

Tom rotates *inside* the footprint — Palm Springs, Palm Desert, La Quinta,
Rancho Mirage, Indian Wells, Indio, Cathedral City, Desert Hot Springs,
Coachella, Bermuda Dunes — with `(760)` numbers and real neighbourhoods (Movie
Colony, Las Palmas, Deepwell, PGA West). The desert supplies plenty of
positioning variety without leaving the MLS: snowbirds and second homes, golf
and country club, mid-century modern, vacation-rental investment, retirement
relocation, eastern-valley first-time buyers.

## Real listing data is mandatory — and assumed broken

Every brief requires Test Claude to connect real GPS listing data using the
credentials file and to remove `CHATREALTY_TEST_DATA`.

**Assume the hookup is broken. That's exactly why it runs every session.** A
polished site on fictitious sample listings tells Joe nothing he doesn't
already know; a precise account of *how* the real-data hookup fails is the most
useful thing this loop hands to dev Claude.

So the brief tells Test Claude not to give up quietly, not to fall back to
sample data without saying so, and not to paper over an error — instead capture
every command and env var **name** (never values), the **verbatim error text**
at each step, which build-guide step broke and what the guide claimed would
happen, how far it got (credentials loaded? API reached? auth accepted?
listings returned? rendered?), and anything the guide never mentioned that
turned out to be required.

> **A session that fails to connect real data but documents the failure
> precisely is a GOOD session. A session that silently falls back to sample
> listings is a WASTED one.**

When it fails, the attempt gets its own section under guide-vs-reality
mismatches with reproduction steps, and **Tom leads the report with it** — above
every cosmetic and design defect.

Sessions 5 and 6 did neither: both accepted sample data silently and spent
their findings budget on border radii and dropped query params.

## Personas are invented wholesale

Name, brokerage, license, phone, email, years, specialty, bio, service area —
so Test Claude never stops to ask. Fictitious and obviously so on inspection
(never a real agent + real brokerage, never a real licence number), internally
consistent (CA-DRE format, `(760)` area code, local-sounding brokerage), and
varied across sessions.

**`BRIEF.md` is canonical.** Each question to Tom arrives in its own thread with
no memory of the others, so answering from recall invents a *second* phone
number. It happened: the Q&A channel returned `555-0142` while `BRIEF.md` said
`555-0143`. He'd then have scored that contradiction as a truth failure he
authored himself. He now reads `BRIEF.md` before answering and appends to it
when inventing something new.

## Test Claude's questions come back to Tom

```bash
openclaw agent --agent tom --session-key session-<N> --message "..."
```

| Question type | Tom's response |
|---|---|
| Persona / brief facts | Reads `BRIEF.md` and quotes it; invents what's missing and appends it |
| Design choices | **Hands back the axis, not the answer** — choosing would mean grading his own design |
| "Bug, or am I holding it wrong?" | Answers honestly; real defect → `report_bug`, misleading guide → guide-vs-reality mismatch |
| "Can I deploy / publish / use production data?" | **No**, however reasonable the reason sounds |

A question Test Claude *had* to ask is itself evidence about the build guide:
if it had to ask, the guide didn't say.

## Credentials

Spark (listing data) and Groq (CHAP) test keys:

```
/Users/macdaddyjoe/Downloads/spark-rep (1).txt
```

Holding `SPARK_OAUTH_KEY`, `SPARK_OAUTH_SECRET`, `SPARK_ACCESS_TOKEN`,
`SPARK_REFRESH_TOKEN`, `GROQ_API_KEY`. Tom puts the **path** in the brief and
lets Test Claude read the file — he never opens it, echoes it, or copies a value
anywhere. The filename has a space and parentheses; quote it in every command.

Real credentials do not relax the standing rules: still localhost, still no
deploying, still no publishing.

## The session allowlist

Each session directory gets `.claude/settings.json` from
`templates/session-settings.json`. Its job is **confinement**, not
prompt-suppression: edits confined to the session directory, with writes to
this repo, `git push`, and deploy CLIs denied outright.

Two details learned the hard way: **`Edit(path)` is the rule that matters** —
`Write(path)` matches nothing in Claude Code's permission checks; and
`Bash(*)` with a deny list is used deliberately, because compound commands
joined with `&&` don't match individual `Bash(cmd:*)` patterns.

## Environment fixes that made judging possible

Both were blockers Tom reported himself, and both are fixed:

**Localhost browsing.** OpenClaw's SSRF policy fails closed and blocks loopback
by default, so Tom was judging by `curl` and source inspection — honestly, but
against a subset of the rubric. Fixed with the narrow exception the docs prefer
over blanket private-network access:

```json
"browser": { "ssrfPolicy": { "allowedHostnames": ["localhost", "127.0.0.1"] } }
```

**ChatRealty MCP tools.** The `claude.ai chatrealty` connector only exists in a
claude.ai-authenticated session, which a spawned subagent is not — so
`report_bug` and `give_feedback` were unreachable and bugs lived only in Tom's
markdown. Fixed by registering the published package with **OpenClaw itself**
(not Claude Code's user scope, which Tom can't see):

```bash
openclaw mcp add chatrealty --command npx --arg -y --arg @chatrealty/mcp-server \
  --env "CHATREALTY_API_TOKEN=…"
openclaw mcp reload          # no gateway restart needed
```

Verified: `mcp__chatrealty__whoami` returns the account; `report_bug` and
`give_feedback` schemas load. Note the tools attribute to the `tom` token —
split it if you want Test Claude's bug reports distinguishable.

## Operating him

```bash
openclaw agents list | grep -A4 '^- tom'
openclaw cron show 417427ba-dc63-4d12-a90c-540fdde16cd3
openclaw cron runs --id 417427ba-dc63-4d12-a90c-540fdde16cd3   # --id here…
openclaw cron run  417427ba-dc63-4d12-a90c-540fdde16cd3        # …positional here
openclaw cron edit 417427ba-dc63-4d12-a90c-540fdde16cd3 --message "$(cat msg.txt)"
openclaw cron disable|enable 417427ba-dc63-4d12-a90c-540fdde16cd3
```

The CLI is inconsistent about the id: `runs` wants `--id`, everything else
takes it positionally. **`cron edit --id …` fails silently without changing
anything** — always verify with `cron get` after an edit.

The Control UI (`openclaw dashboard`) is the visual view: Sessions with live
status, tool calls streaming as terminal-style output, subagents in the sidebar,
and the Cron Jobs page with Run / History / Edit controls.

### Unsticking him

| Symptom | Cause | Fix |
|---|---|---|
| Silent for hours, testing on | Normal if a marker exists — he's waiting on a build | `cat state/session-in-flight.json` |
| Re-dispatching repeatedly | Marker missing or cleared on a non-201 | Write it by hand; check the clear condition |
| Never dispatches, no marker | Report still `new`/`in_progress` — testing is off | `/admin/agent-feedback` |
| Stale marker, build abandoned | Nothing ever reported | `rm state/session-in-flight.json`, let the next firing dispatch |
| `401` on poll | Token revoked | Re-mint at chatrealty.io/agent/settings → Integrations; rewrite the env file with `~/.claude/tools/secure-input.js` |
| Directories reappear after deletion | Orphaned `next dev` still writing `.next/` | Kill node processes whose cwd is under that session dir, *then* delete |

## Session history

| # | Persona / market | Outcome |
|---|---|---|
| 1–4 | Savannah, Seattle, San Diego, Palm Springs | Dispatch mechanism failures; no build completed |
| 5 | Priya Manohar — Sacramento, first-time buyers | **Built and served.** 7/7 gates, 75/100. Wrong market; sample data; CHAP double-presentation found |
| 6 | Marcus Delgado — Newport Beach, luxury/relocation | 7/7 gates, 67/100. Two file-and-line bugs; found that a `resolutionNotes` fix wasn't in published 0.8.0 — **second session running** |

Sessions 5 and 6 both scored sites running on **sample data in the wrong
market**, which is what the GPS rule and the real-data mandate exist to prevent.
Their gate-3 and truth scores measure the wrong thing; the rules take effect
from session 7.
