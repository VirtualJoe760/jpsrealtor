---
title: External sites — MCP-built deployments on the multi-tenant edge
status: current
last_verified: 2026-10-17
related: [./architecture.md, ../ARCHITECTURE.md, ../multi-tenant/README.md, ./create-site-scaffolder.md]
---

# External sites — "Option A: point, don't host"

How an MCP-built site, deployed to the customer's own Vercel account, becomes
`{subdomain}.chatrealty.io` — the primary tenancy path going forward. This file
was cited by `src/app/api/skill/site/connect/route.ts` since 2026-07-24 and
never existed; it does now.

## The two serving models

| | Legacy (platform-rendered) | **MCP-built (external)** |
|---|---|---|
| Example | bethanyklier.chatrealty.io | any site built via `get_build_guide` |
| Who hosts | We do — the normal app routes render with `x-agent-subdomain` | The agent's own Vercel deployment |
| What we serve | The insights homepage skinned by `/api/agent/public` | A **proxy rewrite** of every request onto their deployment |
| Go-live gate | Profile readiness checklist (`agent-site-readiness.ts`) | License on file + explicit `set_site_live` |

Both resolve through the same edge; a subdomain uses whichever applies. The
platform-rendered page is the fallback whenever no external site is connected.

## The serving chain (as shipped, `src/proxy.ts`)

```
 request → {slug}.chatrealty.io
   │
   ▼
 Vercel router            hostname must be REGISTERED on the project
   │                      (see below — the wildcard alone is not enough)
   ▼
 src/proxy.ts             parses slug from Host header
   │
   ├─► resolveExternalSite() → GET /api/site-config?subdomain={slug}
   │        (public, CDN-cached 30s; reads agentProfile.externalSite)
   │
   ├─ status "live"                      → REWRITE pages + the entire
   ├─ status "preview" + valid preview   → /api surface onto
   │        JWT (?crpv= → 15-min cookie)   externalSite.deploymentUrl
   │
   ├─ agent exists, site not ready       → /coming-soon (noindex)
   └─ otherwise                          → platform-rendered fallback
```

The external site owns its subdomain's **whole `/api` surface** too
(`/api/site-config` excluded to prevent recursion) — the built site's own API
routes answer, not the platform's.

## The lifecycle (MCP tools ↔ skill routes)

| Step | Tool | Route | Effect |
|---|---|---|---|
| 0. Data | `get_site_claim_code` | `POST /api/skill/site/claim-code`, then `POST /api/skill/site/claim` | Agents with a seeded database: the site claims its own key, already bound to that database — nothing pasted, no sample data (claim codes, below) |
| 1. Deploy | — | — | Builder deploys to the agent's Vercel; env vars server-side; test-data mode hard-fails deploys |
| 2. Connect | `connect_site` | `POST /api/skill/site/connect` | Validates URL (https, never `*.chatrealty.io` — proxy loop), sets `externalSite.{deploymentUrl,status:"preview",connectedAt}`, **and registers the subdomain with Vercel** (below). Preview = agent + admins only, via signed link |
| 3. Go live | `set_site_live` | `POST /api/skill/site/go-live` | **License gate** (`licenseNumber` on file → else 409 `license_required`); sets `status:"live"` + `liveAt`. Public from that moment |
| — | `site_status` | `GET /api/skill/site/status` | Current state, `licenseOnFile`, URLs |

State lives at `User.agentProfile.externalSite` (`deploymentUrl`, `status:
none|preview|live`, `connectedAt`, `liveAt`).

## Building on the agent's seeded database — claim codes (2026-10-17)

An agent who seeded listings in Settings → Integrations
([data-tiers.md](./data-tiers.md) → Hosted seeding) already has a tenant
database. The build used to ignore it: the guide scaffolded with sample data,
then asked the agent for a `crt_live_` key to paste into `.env.local` — a
secret through the chat, for a step the agent had no reason to understand. Now
the MCP build tool finds the database itself and the site gets its key without
anyone handling it.

1. **`whoami` says the data is there.** `GET /api/skill/me` returns
   `dataSource: "tenant"` plus a `database` block: `listings` (rows written
   by the last seed/update), `associations`, `propertyTypes`,
   `closedHistory`, `lastSyncedAt`, `updates: "nightly, automatic"`. Build
   guide step 1 treats that as "data step done" — no RESO credentials, no
   `sync init`, never sample data.
2. **The agent's own MCP key reaches it.** A key minted in Settings lives only
   on the User, but tenant routing resolves by `Tenant.tokenHashes`, so those
   keys read `dataSource: "none"`. `authenticateSkillRequest`
   (`src/lib/skill-auth.ts`) now binds a non-admin's key to the tenant they
   **own** (`ownerUserId`, `status: "active"`) on first use and re-resolves.
   Admin keys are never auto-bound — admin reads the dogfood corpus
   ([ship-strategy.md](./ship-strategy.md)). Revoking a key in Settings pulls it
   from the tenant mirror too.
3. **`get_site_claim_code`** (scope `site:manage`, `POST
   /api/skill/site/claim-code`) mints a one-time code: `XXXX-XXXX-XXXX`, 12
   characters from an alphabet without 0/O/1/I/L, valid 15 minutes, one use,
   only its sha256 stored (`src/models/SiteClaim.ts`, TTL-indexed). 409
   `no_database` without an active tenant. The tool returns the code, the
   database summary and `claimScript` — never a key.
4. **The site trades the code for its key.** Claude writes `claimScript` to
   `chatrealty-claim.mjs` in the site root, runs `node chatrealty-claim.mjs
   <code>`, deletes it. The script calls `POST /api/skill/site/claim`
   (public; 10 tries per 15 min per IP), which spends the code atomically and
   mints a **website-preset** key **bound to the tenant at birth**, then
   rewrites `.env.local`: drops any `CHATREALTY_API_TOKEN` /
   `CHATREALTY_TEST_DATA` line, appends the new key, and prints only
   "Connected … (N listings)". The key goes ChatRealty → disk; the conversation
   sees the code and the count.

Refusals: 410 `invalid_or_used` (expired, spent or wrong — call the tool
again), 409 `token_limit` (10 active keys; checked **before** the code is spent,
so a full list doesn't burn it), 400 `malformed`.

**Why a script the tool hands back, not a scaffolder flag:** it works with every
published `create-chatrealty-site` and needs no npm release. It is a
`String.raw` template in `packages/mcp-server/src/tools/site_tools.ts` — as a
plain template the `\/` and `\r?\n` in its regexes collapsed and the first
end-to-end run handed Claude a script that died on parse ("Unexpected token
'const'"). Keep backticks and `${` out of it.

Verified locally 2026-10-17 against a seeded GPS tenant (14,788 rows), running
the **compiled** tool: owner-binding, `whoami.database`, a code with no key in
the tool output, the script passing `node --check`, `.env.local` rewritten
(one key line, sample mode gone, other lines kept, CRLF input), the claimed key
reading `dataSource: "tenant"` and present in `tokenHashes`, spent and
unknown codes → 410. Test keys revoked afterwards.

## Subdomain registration — the part that was broken

**The `*.chatrealty.io` wildcard is DNS only** (Cloudflare CNAME →
`cname.vercel-dns.com`). The Vercel *project* cannot hold a wildcard domain
while DNS runs on Cloudflare nameservers, so any hostname not individually
added via the projects/domains API dies at Vercel's router —
`404 DEPLOYMENT_NOT_FOUND` — before `proxy.ts` ever runs.

Per-subdomain registration existed for ~13 hours (added 2026-04-30
`bcf56ac9`, removed the same day by `7aec49bb` on the wrong assumption that
the wildcard covered it). Every subdomain minted in the gap resolved DNS, passed TLS on the
wildcard cert, and 404'd at the router — which is exactly how a fully working
MCP-built test site could be connected and still show Vercel's 404.

Fixed 2026-08-05:

- `ensureSubdomainRegistered()` (`src/lib/generate-subdomain.ts`) —
  idempotent add via the Vercel API; 409/already-registered is success.
- Awaited at subdomain mint (a dangling promise dies with the serverless
  response) and awaited inside
  `connect_site` — the response now carries `subdomainRegistered`, because
  "connected but your URL 404s" is the half-truth that route must not return.
- `scripts/backfill-vercel-subdomains.ts` — registers every Mongo subdomain
  missing from the project. Run 2026-08-05: 4 registered, 2 already attached.
  Idempotent; safe to re-run after any bulk import.

Do not remove registration again without actually attaching a wildcard domain
to the project, which requires moving DNS to Vercel nameservers.

## Failure modes

| Symptom | Meaning | Fix |
|---|---|---|
| Vercel `404 DEPLOYMENT_NOT_FOUND` on the subdomain | Hostname not registered on the project | `npx tsx scripts/backfill-vercel-subdomains.ts` |
| TLS error right after registration | Vercel is still minting the cert | Wait ~1–2 min |
| Subdomain shows the platform page, not the build | `externalSite.status` is `none`, or `preview` without the signed link | `connect_site`, then use the preview link; `set_site_live` for public |
| `409 license_required` on go-live | No license number on the ChatRealty profile | Add the license to the agent's profile (Settings). `AGENT_LICENSE` only changes what the SITE displays — it does not clear this gate. Compliance gate, not a bug |
| Subdomain shows /coming-soon | Agent exists, no external site, profile checklist incomplete | Finish the profile, or connect the external site |
