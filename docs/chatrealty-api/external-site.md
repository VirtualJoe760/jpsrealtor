---
title: External sites — MCP-built deployments on the multi-tenant edge
status: current
last_verified: 2026-08-05
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
| 1. Deploy | — | — | Builder deploys to the agent's Vercel; env vars server-side; test-data mode hard-fails deploys |
| 2. Connect | `connect_site` | `POST /api/skill/site/connect` | Validates URL (https, never `*.chatrealty.io` — proxy loop), sets `externalSite.{deploymentUrl,status:"preview",connectedAt}`, **and registers the subdomain with Vercel** (below). Preview = agent + admins only, via signed link |
| 3. Go live | `set_site_live` | `POST /api/skill/site/go-live` | **License gate** (`licenseNumber` on file → else 409 `license_required`); sets `status:"live"` + `liveAt`. Public from that moment |
| — | `site_status` | `GET /api/skill/site/status` | Current state, `licenseOnFile`, URLs |

State lives at `User.agentProfile.externalSite` (`deploymentUrl`, `status:
none|preview|live`, `connectedAt`, `liveAt`).

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
