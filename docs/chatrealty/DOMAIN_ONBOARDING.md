# Domain Onboarding Pipeline

Automatic SEO infrastructure provisioning for agent custom domains.

## Overview

When an agent purchases a custom domain via `POST /api/domains/purchase`, the onboarding pipeline runs automatically to set up SEO infrastructure. Each step is fault-tolerant - individual failures don't block the rest of the pipeline.

## Pipeline Steps

| Step | What it does | Can fail? |
|------|-------------|-----------|
| **1. Domain Live Check** | HEAD request to `https://{domain}` to verify DNS + SSL are working | Yes - domain may not have propagated yet |
| **2. GSC Site Added** | Adds a URL-prefix property in Google Search Console | Yes - requires valid OAuth credentials |
| **3. GSC Sitemap Submitted** | Submits `https://{domain}/sitemap.xml` to GSC | Skipped if step 2 failed |
| **4. GBP Post Created** | Creates a Google Business Profile post announcing the new website | Skipped if agent has no GBP connected |
| **5. Status Saved** | Persists pipeline results to `User.agentProfile.domainOnboarding` | Rarely fails |

## API Endpoints

### POST /api/domains/purchase

Purchases a domain and triggers onboarding automatically. The response includes onboarding status if the pipeline completes within 5 seconds, otherwise reports `in_progress`.

```json
{
  "success": true,
  "domain": "agentname.com",
  "purchased": true,
  "connectedToProject": true,
  "savedToProfile": true,
  "onboarding": {
    "status": "completed",
    "steps": { ... }
  }
}
```

### GET /api/domains/onboarding

Returns current onboarding status for the authenticated user's domain.

```json
{
  "status": "partial",
  "domain": "agentname.com",
  "startedAt": "2026-04-22T10:00:00.000Z",
  "completedAt": "2026-04-22T10:00:05.000Z",
  "summary": { "success": 3, "failed": 1, "skipped": 0, "total": 4 },
  "steps": {
    "domainLive": { "status": "success", "message": "Domain is live (HTTP 200)" },
    "gscSiteAdded": { "status": "success", "message": "Site property created in GSC (pending verification)" },
    "gscSitemapSubmitted": { "status": "success", "message": "Sitemap submitted: https://agentname.com/sitemap.xml" },
    "gbpPostCreated": { "status": "failed", "message": "GBP API error (403): ..." }
  }
}
```

### POST /api/domains/onboarding

Re-runs the onboarding pipeline. Useful after fixing issues (DNS propagation, GBP connection, etc.).

## GSC Verification

Adding a site via the API creates an **unverified** property. Full verification requires one of:

1. **DNS TXT Record** (recommended for domain properties)
   - Add a TXT record to the domain's DNS with the verification token from GSC
   - Token format: `google-site-verification=XXXXXXXXXXXX`
   - This is the most reliable method for custom domains

2. **HTML File Upload**
   - Upload a verification HTML file to `https://{domain}/googleXXXXXXXX.html`
   - Requires deploying the file to the Next.js public directory or handling via route

3. **Meta Tag**
   - Add `<meta name="google-site-verification" content="XXXX">` to the site's `<head>`
   - Can be done dynamically in the Next.js layout

4. **Google Analytics / Tag Manager**
   - If the agent's site already has GA4 or GTM, verification can piggyback on those

### Current Approach

The pipeline creates the GSC property and submits the sitemap optimistically. The agent (or admin) must then complete DNS verification manually. The `GET /api/domains/onboarding` endpoint reports whether verification is still pending.

## GBP Limitations

- GBP post creation requires the agent to have connected their Google Business Profile (`adAccounts.gbp.status === 'connected'`)
- The announcement post is a `STANDARD` type with a `LEARN_MORE` call-to-action linking to the new domain
- If the agent has no GBP connection, this step is skipped (not failed)
- GBP API uses the agent's per-user refresh token when available, falling back to platform credentials

## Manual Steps for Agents

After the pipeline runs, agents may need to:

1. **Wait for DNS propagation** (if domain live check failed) - typically 15-60 minutes after Vercel domain connection
2. **Add DNS TXT record** for GSC verification - the verification token can be found in the GSC dashboard
3. **Connect GBP** via the platform's OAuth flow if they want GBP announcement posts
4. **Re-run onboarding** via `POST /api/domains/onboarding` after fixing any issues

## Architecture

```
POST /api/domains/purchase
  |
  +-- purchaseDomain() (Vercel API)
  +-- addDomainToProject() (Vercel API)
  +-- User.agentProfile.customDomain = domain
  +-- runDomainOnboarding(userId, domain)  <-- non-blocking
        |
        +-- Step 1: fetch(https://{domain}) - HEAD check
        +-- Step 2: gsc-api.addSite() - GSC property creation
        +-- Step 3: gsc-api.submitSitemap() - sitemap submission
        +-- Step 4: gbp-api.createLocalPost() - GBP announcement
        +-- Step 5: User.agentProfile.domainOnboarding = results
```

## Source Files

| File | Purpose |
|------|---------|
| `src/lib/domain-onboarding.ts` | Pipeline orchestrator |
| `src/lib/gsc-api.ts` | Google Search Console API client |
| `src/lib/gbp-api.ts` | Google Business Profile API client (existing) |
| `src/app/api/domains/purchase/route.ts` | Domain purchase + onboarding trigger |
| `src/app/api/domains/onboarding/route.ts` | Onboarding status GET + re-run POST |
| `src/lib/sitemap-generator.ts` | Per-domain sitemap generation (existing) |
