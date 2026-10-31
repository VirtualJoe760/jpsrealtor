# AGENTS.md — jpsrealtor / ChatRealty

Instructions for any coding agent working in this repository.

`AGENTS.md` is the open standard (Linux Foundation's Agentic AI Foundation,
alongside MCP) read natively by Codex, Cursor, Copilot, Gemini CLI, Aider,
Windsurf and Zed. **Claude Code does not read it natively** — it reads
`CLAUDE.md`, so the root `CLAUDE.md` is a two-line file that imports this one.
Edit **this** file; never duplicate rules into `CLAUDE.md`.

---

## 1. Hard rules

1. **Absolute paths for every file operation.**
   The repo is checked out on two machines and the correct prefix differs:
   - macOS (current primary): `/Users/averagexjoe/Documents/websites/jpsrealtor/...`
   - Windows: `F:\web-clients\joseph-sardella\jpsrealtor\...`

   Use the one matching the machine you are on — a hardcoded `F:\` path silently
   creates a junk file on macOS instead of editing the real one. Absolute, not
   relative, either way: there is a Claude Code bug with relative paths on Windows.

2. **Do the task asked, not the refactor next to it.**
   Scope creep here is the most expensive failure mode, because the work
   *looks* finished and has to be unpicked. Before touching a file, ask whether
   the request named it. If not, don't.

   - **A branding change is strings and assets.** It is not a pipeline, a
     schema migration, or an ID. If the ask is "we changed brokerage", do not
     touch MLS agent IDs, team keys, listing-pool queries, or the carousel
     generator's source definition. Those are identity of a *different* kind
     and they keep working across a brokerage move. (2026-10-10: a Fathom
     rebrand gutted `scripts/tmp-pool4.js` and halted the daily carousel over
     a team key that never needed to change.)
   - **Check the UI before writing a script.** Most per-agent data has an
     editor at `/agent/settings`. A one-record change is a form field, not a
     `scripts/*.js` with a dry-run flag. Write a script only for something
     bulk, repeated, or impossible in the product.
   - **One wrong constant is not a mandate to re-architect.** Fixing it is in
     scope; migrating every caller onto a new model is a separate task. Say
     you found it, then ask.
   - **Flag, don't fix, outside the blast radius.** Stale comments, unrelated
     dead code and pre-existing bugs go in `docs/tech-debt.md` or a sentence in
     the reply. They do not go in this diff.

   When unsure whether something is in scope, the cheap move is one question,
   not fifty files.

3. **Never hand the task back.** A finished job never looks like a to-do list
   for Joe. If the work needs a credential, a value, or a click, get it with
   the tools that are already available — do not write instructions for him to
   run.

   - **Never ask Joe to fetch a credential. Ever.** Not from a dashboard, not
     from a password manager, not by pasting a command. The tools exist:
     `~/.claude/tools/ask-secret.sh "Label" --env KEY /path/to/.env` opens a
     masked dialog and writes the value straight into the env file without it
     ever entering the transcript, and `vercel env pull` reads anything already
     in the Vercel environment (`virtualjoe760`, project `jpsrealtor`).
   - **Never paste a shell command for him to run.** If you can run it, run it.
     Handing over a one-liner is the same failure wearing a helpful costume.
   - **A permission denial is not a delegation.** When the sandbox refuses a
     call, say in one line that the *permission layer* blocked it, then
     re-attempt so the approval prompt reaches him. Do not restate the block as
     a chore for him, and do not blame project policy for something policy does
     not forbid — rule 9 is about git, not about moving a variable between
     environments.
   - **Report a block first, not last.** A denial buried under three paragraphs
     of progress reads as success. He will act on the success, and the real
     state stays broken.

   The test before sending: if the reply ends with something he has to do that
   you could have done, it is not finished.

   (2026-10-11: a stale `MONGODB_URI` cost four round trips because I pasted
   two "run this yourself" one-liners and a "sign in there and tell me", then
   reported a `vercel link` success line as though the pull had happened.
   Joe: "you are never supposed to direct me to get credentials for you...
   ever" and "a finished job never looks like you delegating me a task.")

4. **Read before writing.** For anything non-trivial: `docs/ARCHITECTURE.md`,
   then the relevant `docs/{area}/README.md`. State back what you understood
   before writing code.

5. **Update the docs you read, in the same commit.** Bump `last_verified`. If
   the area had no doc, create one per `docs/AGENTS.md`.

6. **Doc drift is a bug.** If a doc contradicts the code, the doc is wrong —
   fix it the same session.

7. **Mongoose strict mode drops undeclared fields silently.** Add the field to
   the schema *before* writing to it. This has twice produced a "successful"
   write that persisted nothing.

8. **Verify the result, not the exit code.** String-replacement edits have
   silently no-op'd here (matching zero lines while reporting success) and have
   corrupted file encodings. Read back what you changed.

9. **Env files never reach GitHub. Ever.** `.env`, `.env.local`, `env.local`,
   and anything else holding live keys stay local, permanently. Before any
   `git add`/`commit`/`push`:
   - **Stage by explicit path.** Never `git add -A`, never `git add .`.
   - **Check the staged list** before committing — if an env file appears,
     unstage it and fix `.gitignore`.
   - **Confirm coverage, don't assume it.** `git check-ignore -v <file>` is the
     only proof. `.gitignore` here had `.env*` and `.env*.local`, all of which
     require a **leading dot** — a dotless `env.local` (15 KB of live keys for
     Cloudinary, Google, Facebook, ElevenLabs, Groq, HeyGen, Drop Cowboy) was
     never matched and sat untracked in the repo, one `git add -A` from public.
     Now covered by `env.local` / `env.*` with `!env.example`.

   If an env file ever *does* land on a remote, rotating every key in it comes
   before anything else — a force-push doesn't unpublish a secret.

---

## 2. Repository map

```
jpsrealtor/
├── src/
│   ├── app/            Next.js App Router — 47 route groups, 315 API routes
│   │   ├── api/        see §3 for the heavy areas
│   │   ├── agent/      agent-facing product (settings, CMS, dashboard)
│   │   ├── admin/      platform admin
│   │   └── developers/ public API docs
│   ├── lib/            82 modules — integrations + domain logic (§4)
│   ├── models/         64 Mongoose models (§5)
│   ├── components/     shared React components
│   ├── hooks/  types/  services/  server/  config/  content/  data/
│   └── scripts/        app-scoped TS scripts
├── packages/           publishable npm packages (§6)
├── scripts/            143 operational scripts — syncs, generators, one-offs
├── docs/               area docs; docs/AGENTS.md is the authoring policy
├── worker/             background worker
├── apps/  finance/  public/
```

## 3. API surface, by weight

Where the code actually is, most routes first:

| Area | Routes | What it is |
|---|---|---|
| `api/skill/` | 40 | The **public product API** — what agent sites and the MCP server call. Token-authed (`crt_live_`), scope-gated. |
| `api/auth/` | 34 | NextAuth + 2FA + email verification |
| `api/campaigns/` | 28 | Postcards, voicemail, ads — **spends real money** |
| `api/crm/` | 24 | Contacts, inbox, sending |
| `api/agent/` | 21 | Agent settings, pending posts, integrations |
| `api/user/` `api/articles/` `api/admin/` | 11–13 | |

**`/api` is default-deny at the middleware.** A route with no in-file auth check
is still gated, but do not rely on that alone — add the check.

## 4. Notable libraries

| File | Why it matters |
|---|---|
| `lib/email-resend.ts` | 1,465 lines, 13 senders. Platform mail is `ChatRealty <noreply@chatrealty.io>` via `platformFrom()`. |
| `lib/email-brand.ts` | `renderBrandedEmail()` — the branded shell. **Only 1 of 13 senders uses it**; adopting it is open work. |
| `lib/spark-roster.ts` | MLS agent roster. Listing rows carry agent email ~1% of the time; the roster resource has it. |
| `lib/publishing-pipeline.ts` | Article/landing-page publish |
| `lib/google-ads-api.ts` `lib/meta-ads-api.ts` `lib/twilio.ts` `lib/thanksio.ts` | Outbound channels — all cost money |
| `lib/skill-scopes.ts` | Token presets and scope catalog |

## 5. Data

MongoDB via Mongoose, 64 models. The ones that come up most: `User` (carries
`agentProfile`, including minted API tokens), `Contact`, `Campaign`,
`PendingPost`, `DomainRegistry`, `CreditLedger`.

Listings live in **`unifiedlistings` (Active only, ~85k)** and
**`unified_closed_listings` (~1.1M)** — closed history is a *different
collection*, a distinction that has caused wrong answers.

## 6. Packages

| Package | Purpose |
|---|---|
| `create-chatrealty-site` | Scaffolder — `npx create-chatrealty-site` |
| `mcp-server` | `@chatrealty/mcp-server`, the MCP surface + build guide |
| `chatrealty-sync` | Tenant data sync |
| `install-skill` | Legacy Claude skill installer |

Publishing: `npm whoami` should be `jsardella`. **Bump the version first** — the
registry rejects a republish, and a fix sitting at an already-published version
reaches nobody.

## 7. Money, publishing, and other people's data

- **Campaigns, ads, voicemail, postcards spend real money.** Never trigger one
  to test.
- **`social:post` publishes to Instagram immediately.** No draft step.
- **Listings belong to other brokerages.** Marketing that alters a listing photo
  is a compliance problem, not a taste one. See
  `docs/content-templates/actor-generation.md`.
- **Test-data mode must never be deployed** — the sample listings are fictitious
  and publishing them violates MLS/IDX rules.
- **Never put a secret in chat.** Download credential files directly; for key
  strings use `~/.claude/tools/secure-input.js`.

## 8. Conventions

- TypeScript throughout; `npx tsc --noEmit` before committing.
- **`npm run build`** — never bare `npx next build` — before shipping anything
  touching a page. A broken route is worse than the bug being fixed.

  It has to be the npm script because `prebuild` compiles
  `packages/mcp-server` first. `npx next build`
  skips the lifecycle hook, so `packages/mcp-server/dist/tools/index.js` stays
  stale and the build dies with six `Module not found` errors
  (`./create_carousel_slide.js`, `./give_feedback.js`, …) that point at the MCP
  package and have nothing to do with whatever you changed.

- **A Next build reports success on failure here.** `npx next build` exits 0
  even when Turbopack aborts, so the exit code is not evidence. Check that
  `.next/BUILD_ID` exists, or grep the output for `Build error occurred`.
  Likewise, a `node_modules` symlink or Windows junction — e.g. one pointed at
  another worktree to skip an install — fails with
  `Symlink node_modules is invalid, it points out of the filesystem root`,
  again behind exit 0. Each worktree needs a real `npm ci`.
- Comments explain **why**, especially the failure a rule prevents. Several
  rules here exist because something shipped broken; keep that provenance.
- Commit messages: what changed, and what it cost to learn.
