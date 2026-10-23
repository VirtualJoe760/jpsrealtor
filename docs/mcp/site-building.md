---
title: Building an agent website with the MCP — the flow as shipped
status: current
last_verified: 2026-10-17
related: [./tools.md, ./scopes-and-safety.md, ./hosting.md, ../chatrealty-api/create-site-scaffolder.md, ../chatrealty-api/external-site.md, ../chatrealty-api/data-tiers.md, ../testing/mcp/web-design/README.md]
---

# Building an agent website with the MCP

> **TL;DR.** Claude builds an agent's site by following the build guide in
> `packages/mcp-server/src/build-guide/prompts.ts` (served by `get_build_guide`
> and, on stdio, the `guide://chatrealty/*` resources). The path is:
> `whoami` → branch on the data source (`tenant` / `dogfood` / `none`) →
> `npx create-chatrealty-site@latest my-site --test-data` → for a seeded agent,
> `get_site_claim_code` swaps sample data for the agent's own database → design
> and build → deploy (never on test data) → `connect_site` (private preview) →
> `set_site_live` (license-gated). Two known defects bite this flow today; they
> are listed under Gotchas.

## The nine guide steps

| # | Guide id | What happens | Tools it drives |
|---|---|---|---|
| 1 | `check-your-data-source` | Read `dataSource`, pick the branch below. Never claim data exists until a listing/market call returned rows. | `whoami`, `search_listings`, `get_market_stats` |
| 2 | `scaffold-your-site` | Confirm identity (0a), four interview questions, scaffold, claim the site key (tenant), mock first (`design/mock.html`), first reveal + smoke checks, CHAP key, deferred compliance/brand interview | `whoami`, `my_agent_profile`, `get_site_claim_code` |
| 3 | `design-your-site` | Restyle to the approved mock; token knobs and variant axes in the template's `DESIGN.md` | — |
| 4 | `customize-listings-and-search` | Filters mirror the `search_listings` schema; attribution on every card | `search_listings` (schema reference) |
| 5 | `add-the-map` | Leaflet + clustering, same data source as the grid | — |
| 6 | `wire-favorites-and-lead-capture` | Saving behind sign-in; `/api/lead` → `POST /api/skill/contacts/from-signup` | — |
| 7 | `build-neighborhoods` | `/neighborhoods` from service areas + market stats | `get_market_stats`, `get_neighborhood_info` |
| 8 | `wire-your-blog` | Draft with `create_article`; publish only on approval via `update_article` `status:"published"` | `create_article`, `update_article` |
| 9 | `go-live` | Deploy, connect, preview, go live, Cloudflare edge cache | `connect_site`, `site_status`, `set_site_live` |

Every step body is prefixed with `VOICE_RULE` (never narrate tools or speak
internal field values like `tenant`/`dogfood` to the agent) and steps 2–3 with
`INTERVIEW_RULE` (drive the client's multiple-choice tool, one topic at a time).

## Step 1 — the three data-source branches

`dataSource` comes from `authenticateSkillRequest` (`src/lib/skill-auth.ts`)
via `GET /api/skill/me`.

| Value | Meaning | What the guide does |
|---|---|---|
| `tenant` | The agent owns an active tenant database (seeded in Settings → Integrations, updated nightly) | Data step is done: no RESO credentials, no `@chatrealty/sync`, never sample data. Probe one area, then scaffold and claim the site key. |
| `none` | No database yet; data routes answer 403 `no_data_source` | Don't probe. Ask whether the agent has MLS credentials. **Yes** → collect `RESO_*` into `.env.local`, `npx @chatrealty/sync access` to choose scope against real counts, `init`, `doctor`, `run`, verify Active for-sale rows on `/listings`. **No / "show me first"** → scaffold in test-data mode. |
| `dogfood` | ChatRealty-internal admin account reading the platform dataset | `sync init` refuses it (403) by design. Probes are diagnostic only. Offer: build on the internal dataset (`CHATREALTY_API_TOKEN` alone) or switch to a non-internal test account to exercise the seed. |

## Step 2 — scaffold, then claim the site key

1. `npx create-chatrealty-site@latest my-site --test-data`, then
   `cd my-site && npm install`. Everything after runs inside `my-site`.
   (`--token <crt_live_…>` still works for an agent who already holds a
   website key; the CLI verifies it against `/api/skill/me`.)
2. **Tenant only:** call `get_site_claim_code`. It returns a one-time code
   (`XXXX-XXXX-XXXX`, 15 minutes, one use), `claimScript` and `steps`.
   Claude writes `claimScript` to `chatrealty-claim.mjs`, runs
   `node chatrealty-claim.mjs <code>`, deletes the file, restarts the dev
   server, and confirms by name: `grep -c CHATREALTY_API_TOKEN .env.local` → 1.
   The script `POST`s `/api/skill/site/claim` and rewrites `.env.local` (adds
   the key, removes `CHATREALTY_TEST_DATA`). The key never appears in chat.
3. What the claimed key can do: the `website` preset **intersected with the
   asking key's scopes** (`src/lib/site-claim.ts`). The tool needs only
   `listings:read`, so any key that can read listings can claim, and the result
   never exceeds that key. Details: `docs/chatrealty-api/external-site.md` →
   claim codes.
4. No data source and no credentials: stop after `--test-data`; that is the
   build mode. Test data is 47 watermarked sample listings, localhost only.

## Step 9 — deploy, connect, go live

1. **Preconditions:** license number on the site (footer, every page) and real
   data. The template's `next.config.mjs` throws when
   `CHATREALTY_TEST_DATA=true` and `VERCEL` or `CI` is set — don't work around it.
2. Deploy (Vercel or any Next host) with `CHATREALTY_API_TOKEN`,
   `CHATREALTY_API_BASE`, `AUTH_SECRET`, and `CHAT_API_KEY` if CHAP is on. A site
   that runs its own sync also needs `CHATREALTY_DB_URL`, the `RESO_*` feed
   credentials and `CRON_SECRET` for the hourly `/api/sync/cron`.
3. `connect_site(deploymentUrl)` → the agent's `{subdomain}.chatrealty.io`
   serves the build in **preview** (agent via the dashboard link, plus admins).
   Call `site_status` before and after and confirm the `subdomain` is the
   agent's — these tools act on the account the MCP is signed in as, which
   `AGENT_*` overrides in `.env.local` do not change.
4. `set_site_live` after the agent says yes. Server-side gate: the
   **profile's** license number (an `AGENT_LICENSE` env override shows on the
   site but does not unblock go-live).

## Gotchas

- **`whoami` drops `database` (bug).** `/api/skill/me` returns a `database`
  summary for tenants, but `packages/mcp-server/src/tools/whoami.ts:30-40`
  rebuilds the result without it. Step 1 and `get_site_claim_code`'s
  description both tell Claude to read `whoami.database`; it never arrives. The
  claim-code response does carry `database`, so Claude only sees the inventory
  summary after claiming.
- **No Claude-access preset includes `site:manage` (gap).** Of the presets in
  `src/lib/skill-scopes.ts`, only `website` carries it; `content_drafting`,
  `lead_aware`, `full_workspace` and `client_research` do not. On the hosted
  connector `site_status` / `connect_site` / `set_site_live` are therefore
  hidden from a typical Claude key, and on stdio they are listed but the route
  answers 403. Step 9 needs a key with `site:manage` (the `website` preset or
  Custom). The claim flow was deliberately moved to `listings:read` for this
  reason; the go-live tools were not.
- **stdio and hosted see different tools.** See [tools.md](./tools.md) → Two
  surfaces. The hosted MCP also does not serve `guide://` resources —
  `get_build_guide` is the only way to read the guide there.
- **`whoami` is the MCP's identity, not the site's.** If the site's
  `.env.local` holds a different key, read identity off the running site.
- **The claim script uses the shell's `CHATREALTY_API_BASE`** (default
  `https://www.chatrealty.io`), not `.env.local`. Building against a local
  ChatRealty dev server means exporting it in the shell first.
- **Restart the dev server after any `.env.local` change** — Next reads it once.

## Versions and how changes reach users

| Package | `package.json` | Reaches users when |
|---|---|---|
| `@chatrealty/mcp-server` | 0.26.0 (bumped 2026-10-16, `828fcbf3`) | **Hosted:** every Vercel build — the root `prebuild` runs `build:mcp-server`, so `/api/mcp/mcp` serves current source. **stdio:** only after `npm publish` of a new version. `get_site_claim_code` and the claim-code guide text landed after the 0.26.0 bump (`f991b21c`, `2ccb7839`, 2026-10-17) with no new version — if 0.26.0 is already on npm, stdio users need a 0.26.1 publish to get them. |
| `create-chatrealty-site` | 0.17.1 | `npx create-chatrealty-site@latest` pulls the registry. The claim flow needs no scaffolder release (the script ships inside the tool response). |
| `@chatrealty/sync` | 0.8.0 (template depends on `^0.6.4`) | `npx @chatrealty/sync` pulls the registry. |

The stdio server also reports a hard-coded `version: "0.21.0"` in its MCP
`initialize` response (`packages/mcp-server/src/index.ts`), whatever the
package version is; the hosted route reads the real version from
`package.json`.
