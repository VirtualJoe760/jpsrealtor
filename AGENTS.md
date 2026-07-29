# AGENTS.md — jpsrealtor / ChatRealty

Instructions for any coding agent working in this repository.

`AGENTS.md` is the open standard (Linux Foundation's Agentic AI Foundation,
alongside MCP) read natively by Codex, Cursor, Copilot, Gemini CLI, Aider,
Windsurf and Zed. **Claude Code does not read it natively** — it reads
`CLAUDE.md`, so the root `CLAUDE.md` is a two-line file that imports this one.
Edit **this** file; never duplicate rules into `CLAUDE.md`.

---

## 1. Hard rules

1. **Absolute Windows paths for every file operation.**
   `F:\web-clients\joseph-sardella\jpsrealtor\...` — there is a Claude Code bug
   with relative paths on Windows.

2. **Read before writing.** For anything non-trivial: `docs/ARCHITECTURE.md`,
   then the relevant `docs/{area}/README.md`. State back what you understood
   before writing code.

3. **Update the docs you read, in the same commit.** Bump `last_verified`. If
   the area had no doc, create one per `docs/AGENTS.md`.

4. **Doc drift is a bug.** If a doc contradicts the code, the doc is wrong —
   fix it the same session.

5. **Mongoose strict mode drops undeclared fields silently.** Add the field to
   the schema *before* writing to it. This has twice produced a "successful"
   write that persisted nothing.

6. **Verify the result, not the exit code.** String-replacement edits have
   silently no-op'd here (matching zero lines while reporting success) and have
   corrupted file encodings. Read back what you changed.

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
- `npx next build` before shipping anything touching a page — a broken route is
  worse than the bug being fixed.
- Comments explain **why**, especially the failure a rule prevents. Several
  rules here exist because something shipped broken; keep that provenance.
- Commit messages: what changed, and what it cost to learn.
