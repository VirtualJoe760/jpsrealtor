# Dynamic Per-Domain Sitemap Generation

## Overview

The ChatRealty platform serves multiple domains from a single Next.js application. Each domain receives a tailored `sitemap.xml` and `robots.txt` based on its identity and purpose.

## Architecture

```
Request → Next.js App Router
  ├── /sitemap.xml  → src/app/sitemap.ts
  │                    ↓ reads Host header
  │                    ↓ calls generateSitemapForDomain(hostname)
  │                    ↓ dispatches to domain-specific generator
  │
  └── /robots.txt   → src/app/robots.ts
                       ↓ reads Host header
                       ↓ returns domain-specific crawl rules
                       ↓ points sitemap to https://{host}/sitemap.xml
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/sitemap-generator.ts` | Core domain resolution and sitemap generation logic |
| `src/app/sitemap.ts` | Next.js App Router sitemap entry point (thin wrapper) |
| `src/app/robots.ts` | Next.js App Router robots.txt with per-domain rules |

## Domain Types

### 1. JPS Realtor (`jpsrealtor.com`, `josephsardella.com`)

Full sitemap with all content:
- Static pages (home, about, selling, book-appointment, mls-listings, neighborhoods)
- City neighborhood pages with /buy and /sell variants
- Subdivision pages within each city
- Blog/insights posts and landing pages
- Active MLS listings (capped at 49K, residential sales only)

Both domains are treated identically — same owner, same content.

### 2. Platform (`chatrealty.io`)

Minimal platform-focused sitemap:
- Landing page, about, pricing, agent directory
- Privacy policy and terms of service
- Cross-domain links to all registered agent sites (custom domains and subdomains)

### 3. Agent Domains (custom domains + `*.chatrealty.io` subdomains)

Agent-specific sitemap scoped to their service areas:
- Agent profile pages (home, about, contact, book-appointment, selling)
- Neighborhoods limited to their declared service areas
- Subdivisions within those service area cities
- Blog posts authored by the agent
- MLS listings filtered to service area cities
- Cross-domain link back to chatrealty.io

## Domain Resolution

The `resolveDomain(hostname)` function classifies incoming requests:

1. Check against hardcoded JPS domain list
2. Check against platform domain list
3. Parse subdomain from `*.chatrealty.io` pattern → DB lookup via `agentProfile.subdomain`
4. Fall back to custom domain lookup via `agentProfile.customDomain`
5. Unknown domains default to platform behavior

Resolution uses indexed MongoDB fields:
- `agentProfile.subdomain` (unique sparse index)
- `agentProfile.customDomain` (indexed)

## robots.txt Behavior

Each domain type gets tailored crawl rules:

| Domain Type | Behavior |
|-------------|----------|
| JPS Realtor | Full rules with Googlebot/Bingbot/Googlebot-Image specifics, blocks /v1/ and /*/property-stats |
| Platform | Simple allow of public pages, blocks admin/dashboard/auth |
| Agent | Allows public agent pages (listings, neighborhoods, insights, selling), blocks admin paths |

All robots.txt responses include `Sitemap: https://{host}/sitemap.xml` pointing to the current domain.

## Adding a New Domain

1. Agent registers a custom domain or subdomain in their profile settings (`agentProfile.customDomain` or `agentProfile.subdomain`)
2. DNS is configured to point to the ChatRealty server
3. The sitemap and robots.txt automatically resolve based on the Host header — no code changes needed

## Performance Notes

- JPS sitemap queries two MLS collections (UnifiedListing + CRMLSListing) with a 49K cap
- Agent sitemaps filter by `city` field, reducing DB scan scope
- Platform sitemap is nearly static with a small agent cross-link query
- Blog posts are read from filesystem MDX files at generation time
- Sitemaps are regenerated on each request (Next.js handles caching via `revalidate` if configured)
