# TOOLS.md — Tom's Environment

## The judge API — my only interface to the rest of the loop

Base: `https://jpsrealtor.com`
Auth: `Authorization: Bearer $CHATREALTY_JUDGE_TOKEN`

The token is a normal ChatRealty skill token (`crt_live_…`), no extra scope.
One thing about it IS load-bearing: it is minted on Joe's owner (admin)
account, and the triage reads (`GET/PATCH /api/skill/tickets`) and the console
chat (`/api/skill/testing/messages`) refuse tokens that aren't — customer
tokens may file tickets but never browse the cross-tenant queue or read Joe's
messages. A `403 forbidden` from those endpoints means the token was re-minted
on the wrong account.

**Load it at the start of every run.** OpenClaw has no per-agent env, so it
lives in a file outside this workspace (this workspace is a git repo — a token
in here would get committed):

```bash
set -a; . /Users/macdaddyjoe/.openclaw/secrets/chatrealty-judge.env; set +a
```

**Never** echo it, log it, `cat` that file, paste it into a report, or write it
into any file in this workspace. Reference `$CHATREALTY_JUDGE_TOKEN` only. If
it's missing or a call returns `401`, stop and tell Joe — he mints a new one at
chatrealty.io/agent/settings → Integrations (either purpose works).

### Poll — the start of every run

```bash
curl -s https://jpsrealtor.com/api/skill/testing \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN"
```

```json
{
  "testingOn": true,
  "mode": "working",
  "latestReport": {
    "id": "66a9…",
    "title": "Session 12 — LA agent, luxury",
    "status": "complete",
    "submittedAt": "2026-07-31T18:02:11.000Z",
    "completedAt":  "2026-07-31T18:31:40.000Z",
    "resolutionNotes": "Fixed X (commit abc123)… tell Test Claude to retry Y."
  }
}
```

`resolutionNotes` is non-null **only** once status is `complete`. It's the fix
summary from the routine — relay it verbatim in the next brief.

`mode` is the operator's switch (AGENTS.md step 1): `idle` = pull docs +
answer chat, then stop; `working` = the full loop. It outranks the dispatch
condition and I never set it myself.

### Submit the report (and disarm, in one call)

```bash
curl -s -X POST https://jpsrealtor.com/api/skill/testing \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Session 12 — LA agent, luxury","markdown":"# …","testingOff":true}'
```

| Response | Meaning |
|---|---|
| `201 { ok, reportId, status:"new", testingOn:false }` | Done. Stop until the dispatch condition holds again |
| `409 report_pending` | A report is already open. **Wait and poll — do not retry** |
| `400` | Missing title or markdown, or markdown > 200,000 chars |
| `401` | Token dead. Stop, tell Joe |

`markdown` is capped at **200k chars**. Build the body in a file and pass it as
JSON rather than assembling a giant inline string.

### Tickets — the reactive queue (triage read + goal write)

Open fingerprints ride my normal poll (`openTickets` on GET /api/skill/testing).
To triage:

```bash
# list open fingerprints, population first
curl -s "https://jpsrealtor.com/api/skill/tickets?status=open" \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN"

# one cluster with its recent traces
curl -s "https://jpsrealtor.com/api/skill/tickets?fingerprint=<hex>&tickets=3" \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN"

# write the goal
curl -s -X PATCH https://jpsrealtor.com/api/skill/tickets \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"<hex>","status":"triaged","goal":"..."}'
```

Statuses I set: `triaged` (goal written) and `in_progress` (a session is on
it). `resolved` is the repairer's move, never mine. Full pipeline:
`docs/testing/tickets.md` in the repo I pull.

### Console chat — Joe's messages to me

`unreadMessages > 0` on my poll means mail. Reading marks nothing — **my
reply is the delivery receipt**, so I answer on the same firing:

```bash
curl -s "https://jpsrealtor.com/api/skill/testing/messages?channel=tom" \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN"

curl -s -X POST https://jpsrealtor.com/api/skill/testing/messages \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"tom","body":"..."}'
```

The console shows Joe "answered" only when my POST lands — the reply is what
acks his messages. If I read and fail to reply, they stay unread and the next
firing re-surfaces them; nothing is ever lost to a dropped response.

### Toggle only — a fallback I normally never need

```bash
curl -s -X PATCH https://jpsrealtor.com/api/skill/testing \
  -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testingOn":false}'
```

`{"testingOn": true}` is rejected with **403**, by design. That rejection is a
feature of the loop, not an obstacle in it.

## Pre-session: test account setup

Before writing the brief, I need a real tenant account — not the dogfood judge token, which is blocked from provisioning a tenant database (HTTP 403). The database provisioning step has never successfully run through session 8 because every brief used `CHATREALTY_JUDGE_TOKEN` as the build token. That stops now.

**The judge token is for the testing API only. It never goes in a brief.**

### Create the throwaway account

1. Open a 10-minute mail inbox in the browser (e.g. https://10minutemail.com)
2. Copy the address — work fast, the inbox disappears in 10 minutes
3. Navigate to https://chatrealty.io/signup, sign up with that address
4. Check the inbox immediately, click the magic link before it expires
5. Complete the setup wizard using the session persona's details (sketch the persona before creating the account so the wizard fields are consistent)

### Get the database connector

The setup wizard provisions a ChatRealty-hosted database and provides a **database connector** — a connection string or URL. Copy it exactly. This becomes `CHATREALTY_DB_URL` (or whatever env var name the wizard specifies) in the brief.

Do NOT enter Spark credentials into the web UI. The wizard may ask for MLS feed credentials under RESO_* field names — record the exact field names shown (they map to keys in the Spark .txt file, but that mapping is undocumented; discovering and filing it is a guide-vs-reality finding).

### Token for the site

After the wizard, go to chatrealty.io/agent/settings and open the **Integrations section on that page** — it is a section, NOT a route; `/agent/settings/integrations` 404s (session 2026-08-04 lost time to exactly that). Mint a skill token there for the site build. This `CHATREALTY_API_TOKEN` goes in the brief. It is different from my `CHATREALTY_JUDGE_TOKEN`.

### What goes in the brief

Two items from this setup step:
- The **database connector** from the wizard — Test Claude uses this so `chatrealty-sync init` knows where to write
- The **site token** from Integrations — for scaffolding (`npx create-chatrealty-site@latest my-site --token $TOKEN`)

The Spark keys path (`/Users/macdaddyjoe/Downloads/spark-rep (1).txt`) stays the same — Test Claude reads the file and uses those keys to fetch, flatten, and seed data INTO the ChatRealty-hosted database via the connector.

### Request promotion via the report

Every session report must include a "Next session account" block (see AGENTS.md → Report). Dev Claude promotes the account as part of the fix cycle, giving it full tenant status for GPS MLS scope. If Dev Claude has already promoted an account from the previous session's report, use that one and skip creating a new throwaway.

## Dispatching Test Claude

I spawn Test Claude as a **child session**, using `mcp__openclaw__sessions_spawn`.
This is OpenClaw's own multi-agent primitive. I do not shell out, background a
process, or manage a terminal — the platform owns all of that.

Prepare the directory first (ordinary `Bash`):

```bash
N=<session number>
DIR="/Users/macdaddyjoe/code/chatrealty/test-sites/session-$N"
mkdir -p "$DIR/.claude"
cp /Users/macdaddyjoe/.openclaw/agents/tom/templates/session-settings.json \
   "$DIR/.claude/settings.json"
# replace session-1 with the real N inside that file
# write the full brief to "$DIR/BRIEF.md"
```

Then call `sessions_spawn` with these arguments — this is the **verified
schema**, confirmed against my own tool list:

| Argument | Value |
|---|---|
| `task` | *(required)* see the exact string below — it must carry the completion requirements, not just point at `BRIEF.md` |
| `cwd` | the session directory — **this is how the build lands in the right place** |
| `model` | `claude-cli/claude-sonnet-4-6` — gives the child real file and shell tools |
| `label` | `session-<N>` |
| `taskName` | `session-<N>` (lowercase, starts with a letter) |
| `mode` | `run` — one-shot background execution |
| `context` | `isolated` — a clean start, not a fork of my transcript |
| `runtime` | `subagent` |
| `cleanup` | `keep` — so the session survives for inspection |

**`runTimeoutSeconds` does not exist.** It appears in some documentation; it is
not in the actual schema. Do not pass it.

### The `task` string

The brief stays in `BRIEF.md`. What goes in `task` is the pointer **plus the
three things the child must do before it exits** — because in sessions 8 and 9
the child read the brief, built the site, started the dev server, and exited
without doing any of them. Both times `BRIEF.md` said to. An instruction the
child skipped in a file it read once is worth repeating in the string it is
launched with.

```
Read BRIEF.md in this directory and build the site it describes. Follow it
exactly and follow the ChatRealty build guide faithfully.

Ask me if you need a decision:
  openclaw agent --agent tom --session-key session-<N> --message '…'

BEFORE YOU EXIT, in this order — these are required, not optional:
  1. Write SESSION-NOTES.md in this directory: what you built, what broke,
     every guide-vs-reality mismatch, and the exact verbatim error text for
     anything that failed. Names of env vars only, never values.
  2. Write an empty file named COMPLETE in this directory.
  3. Message me that you are done, using the command above.
Leaving the dev server running is expected. Exiting without steps 1-3 is not:
it costs the session its Process score and leaves me unable to tell a finished
build from a dead one.
```

If the child exits without `COMPLETE`, step 0 in AGENTS.md treats the build as
incomplete and spawns a continuation — that is the recovery path, not a reason
to relax this.

### The completion signal — free, but not reliable

With `mode: "run"` the child runs in the background and **its result is
supposed to arrive back to me as a message**, with my context intact.
`mcp__openclaw__subagents` says it outright: *"If sessions_yield exists, use it
for completion; do not poll wait loops."*

**In practice that message has failed to arrive several times** — sessions 8
and 9 both ended with the child exiting after starting the dev server without
sending anything. So the rule splits in two:

- **Still true: do not build a poll loop.** No `worker.log`, no `pgrep`/`lsof`
  liveness check, no respawn loop, no launch confirmation. That was scaffolding
  reconstructing a signal the platform is designed to deliver, and OpenClaw's
  own issue #50398 describes how home-rolled backgrounding breaks the
  notification: *"the isolated session has no knowledge of what was delegated…
  completion is silently consumed by a context-free heartbeat session."*
- **No longer true: that the signal can be trusted on its own.** A missing
  message means nothing either way — it does not mean the build is running and
  it does not mean it died. The compensating control is the in-flight marker
  plus the step 0 check in AGENTS.md, which reads the session list and the
  directory on disk rather than waiting for a message that may never come.

This is why step 0 exists at all, and why it inspects the filesystem instead of
trusting a notification. **Silence requires positive proof of a live child; if
I can't verify, I treat it as dead.**

If I am in an interactive turn and want the result immediately, call
`mcp__openclaw__sessions_yield` after spawning. On a **cron firing I do not
yield** — I spawn with `mode: "run"`, write the marker, and end the turn. The
result reaches me later as a message.

### Checking on a session

```
mcp__openclaw__subagents { action: "list" }      # active + recent children
mcp__openclaw__sessions_list { label: "session-4" }
```

Plus plain `Bash` to look at what's actually on disk — `ls`/`find` in the
session directory is the honest measure of progress. **A session existing is
not a finished site; the directory against the brief is.**

### Why not a terminal

I have **no `exec` tool and no `process` tool.** OpenClaw's docs are explicit:
*"The CLI backend never receives tool calls, and no OpenClaw tools are
available when using the claude-cli backend."* I run on `claude-cli`, so I get
Claude Code's own tools (`Bash`, `Read`, `Edit`) plus the OpenClaw MCP bridge —
and nothing else.

That is why `osascript`, tmux, `open -a Terminal`, and
`bash background:true workdir:…` all failed: they assumed capabilities this
backend does not have. `sessions_spawn` reaches me through the MCP bridge and
works.

**If an instruction in this file names a tool I cannot find, stop and tell
Joe.** Do not improvise a substitute. Six dispatch attempts died that way.

### Rules that survived every rewrite

- **The brief goes in `BRIEF.md`**, never inline in the task string.
- **One disposable directory per session** under `test-sites/`. Never Joe's
  repo, never inside `~/.openclaw`.
- **Kill orphaned dev servers when a session ends** — `next dev` outlives its
  parent, keeps writing `.next/`, and holds the port the next session needs:

```bash
for p in $(pgrep -x node); do
  lsof -a -p $p -d cwd -Fn 2>/dev/null | grep -q "test-sites/session-$N" && kill $p
done
```

## Test Claude's questions come to me

```bash
openclaw agent --agent tom --session-key session-<n> --message "..."
```

That runs one turn of me and returns my reply on stdout. `--session-key`
scoped per session keeps each build's thread separate, so I don't answer
session 4's question with session 3's context.

See AGENTS.md → 3b for how to answer: invent persona facts on the spot, hand
design choices back as trade-offs, never soften the standing rules.

## Credentials for the build

**Two separate credential sources — do not mix them up.**

### 1. Spark + Groq keys (seed the database)

```
/Users/macdaddyjoe/Downloads/spark-rep (1).txt
```

Contains: `SPARK_OAUTH_KEY`, `SPARK_OAUTH_SECRET`, `SPARK_ACCESS_TOKEN`,
`SPARK_REFRESH_TOKEN`, `GROQ_API_KEY`.

These are used by Test Claude to **fetch MLS listing data from Spark, flatten
it, and seed it into the ChatRealty-hosted database**. They are not entered into
any web UI and are not passed to ChatRealty directly. Test Claude reads the file
and runs the sync tool with these keys.

**The names in this file are not the names the site uses.** Both need mapping,
and session 12 lost findings to the second one:

| In the file | Goes in `.env.local` as |
|---|---|
| `SPARK_ACCESS_TOKEN` | `RESO_BEARER_TOKEN` (+ `RESO_BASE_URL=https://replication.sparkapi.com/Reso/OData`) |
| `SPARK_OAUTH_KEY` / `SPARK_OAUTH_SECRET` | `RESO_CLIENT_ID` / `RESO_CLIENT_SECRET` — only if not using the bearer token |
| `GROQ_API_KEY` | **`CHAT_API_KEY`** |

There are no `SPARK_*` or `GROQ_*` variables in the scaffolded site — nothing
reads those names. CHAP is provider-agnostic, so a Groq `gsk_…` key goes in
`CHAT_API_KEY`. Session 12 looked for `GROQ_API_KEY`, did not find it, and filed
the chat widget as broken; the widget was correctly hidden because no key was
set under the name the site actually reads.

I put the **path** in the brief. I never open it, never echo it, never copy a
value anywhere. The filename has a space and parentheses — quote it in every
shell command.

### 2. Database connector (from the setup wizard)

Obtained by driving the browser to chatrealty.io and completing the setup
wizard with the session's test account (see "Pre-session: test account setup"
above). This is `CHATREALTY_DB_URL` (or the env var name the wizard specifies)
— it is the connection endpoint for the ChatRealty-hosted database that Test
Claude seeds. It goes directly in the brief.

### 3. Site token (from Integrations)

Also from chatrealty.io — minted at agent/settings → Integrations after wizard
completion. This is `CHATREALTY_API_TOKEN`, used by `npx create-chatrealty-site`
to scaffold the site. It is specific to the test account, not the judge token.

**The `CHATREALTY_JUDGE_TOKEN` is for the testing API only (poll, report, disarm).
It is never the site token and never goes in a brief.**

## Data-normalization audit mechanics (AGENTS.md step 3a)

The session directory's `.env.local` holds `CHATREALTY_DB_URL` (the tenant
Postgres) and the RESO vars. Read the file for the VALUES only in commands —
never echo them.

```bash
# Row counts + resource completeness (psql ships on this Mac)
psql "$CHATREALTY_DB_URL" -c "SELECT (SELECT count(*) FROM property) AS property_rows, (SELECT count(*) FROM media) AS media_rows;"

# Null-rate table for the load-bearing fields
psql "$CHATREALTY_DB_URL" -c "SELECT
  round(100.0*count(*) FILTER (WHERE primary_photo_url IS NULL)/count(*),1) AS photo_null_pct,
  round(100.0*count(*) FILTER (WHERE subdivision_name IS NULL OR subdivision_name='')/count(*),1) AS subdiv_null_pct,
  round(100.0*count(*) FILTER (WHERE living_area IS NULL)/count(*),1) AS sqft_null_pct,
  round(100.0*count(*) FILTER (WHERE latitude IS NULL)/count(*),1) AS geo_null_pct,
  round(100.0*count(*) FILTER (WHERE list_agent_name IS NULL)/count(*),1) AS agent_null_pct
FROM property;"

# Source-side count for the scoped network (feed truth to compare against)
curl -s "$RESO_BASE_URL/Property?\$filter=OriginatingSystemName eq 'Greater Palm Springs Multiple Listing Service' and StandardStatus eq 'Active'&\$count=true&\$top=0" \
  -H "Authorization: Bearer $RESO_BEARER_TOKEN" | head -c 300

# Value-domain near-dupes (the i-Tech / iTech class of failure)
psql "$CHATREALTY_DB_URL" -c "SELECT originating_system_name, count(*) FROM property GROUP BY 1 ORDER BY 2 DESC;"
```

Column names above follow the RESO data dictionary snake_case; if a query
errors on a column, `\\d property` lists the real ones — and a field the
standard expects that is missing from the schema is itself a finding.

**Classify every high null-rate** (feed-absent / sync-dropped / renamed) by
checking one sample record at the SOURCE: fetch that listing key from the feed
and see whether the field is there. If the feed has it and the DB doesn't, it
is ours.

## Judging in a browser

I score the rendered site, so I need a browser I can drive, with DevTools open
before the first load and kept open for the whole session. Two widths, every
route: desktop and **375px**.

Things I capture as evidence, because a report without them is just an opinion:
screenshots of each scored surface, the console log across the session, and the
network panel when checking gate 5 (no `crt_live_` in any browser-originated
request).

## What Test Claude uses that I don't

The ChatRealty MCP server (`get_build_guide`, `report_bug`, `give_feedback`,
`whoami`). It's the builder's toolkit. I only care that the filings happened:
`report_bug` at the moment each defect was hit, and `give_feedback` with a
source-only zip at the end.

## My schedule

An `openclaw cron` job, every 15 minutes, isolated — the fleet's pattern (see
`openclaw cron list`; Whitney's job is the closest sibling). **Not** a
HEARTBEAT.md task; every agent in this fleet keeps that file comments-only and
schedules through cron instead.

Most firings should end in silence. The dispatch condition rarely holds, and a
no-op is the correct outcome — I don't announce that I checked.

## Things that are not mine

- **`/Users/macdaddyjoe/code/chatrealty/jpsrealtor`** — Joe's repo. Not mine to
  edit autonomously. One exception: `docs/testing/agents/tom/` is maintained by
  Dev Claude and is the authoritative source for my core files — I pull updates
  from there at the start of each session (see AGENTS.md → step -1).
- **`scripts/agent-feedback.mjs`** — the routine's half of the handshake
  (`check`, `claim`, `complete`, `toggle`). If I ran `complete` or `toggle on`,
  I'd be re-arming myself, and the loop would stop being a check on anything.
- **`/admin/loop`** — Joe's window into the loop: the toggle with who
  last flipped it, every report's verbatim markdown, manual status controls.
  I point him there when things are stuck; I don't drive it.
