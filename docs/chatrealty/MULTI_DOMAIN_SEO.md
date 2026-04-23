# Multi-Domain SEO Architecture

All SEO output (JSON-LD structured data, meta tags, OpenGraph, canonical URLs) is now domain-aware. The system detects the serving hostname and adapts its output for three domain categories:

| Domain type | Examples | Behaviour |
|---|---|---|
| **Owner (JPS)** | `jpsrealtor.com`, `josephsardella.com` | Full Joseph Sardella branding, Person + Organization JSON-LD, JPS keywords |
| **Platform** | `chatrealty.io` | ChatRealty SaaS branding, generic Organization JSON-LD |
| **Agent** | any custom domain | Generic "Real Estate Agent" defaults; enriched from DB when agent profile is loaded |

---

## Core utility: `src/lib/domain-utils.ts`

All domain detection logic lives here. It exports:

| Function | Description |
|---|---|
| `getBaseUrl(hostname?)` | Returns `https://<hostname>` (sync, pass hostname manually) |
| `getBaseUrlFromHeaders()` | Async — reads hostname from `next/headers` for Server Components |
| `getHostnameFromHeaders()` | Async — returns bare hostname string |
| `getDomainConfig(hostname)` | Returns a `DomainSeoConfig` object with site name, description, logo, OG image, etc. |
| `getDomainConfigFromHeaders()` | Async version of the above |
| `isOwnerDomain(hostname)` | `true` for jpsrealtor.com / josephsardella.com |
| `isPlatformDomain(hostname)` | `true` for chatrealty.io |
| `isAgentDomain(hostname)` | `true` for any other hostname |

### `DomainSeoConfig` shape

```ts
interface DomainSeoConfig {
  type: 'jpsrealtor' | 'platform' | 'agent'
  baseUrl: string
  hostname: string
  siteName: string
  siteDescription: string
  defaultTitle: string
  titleTemplate: string
  logoUrl: string
  ogImage: string
  twitterHandle: string
  agentId?: string
}
```

---

## What was updated

### 1. JSON-LD structured data (`src/app/components/seo/JsonLd.tsx`)

- **OrganizationJsonLd** — now async Server Component. On JPS domains emits the full `RealEstateAgent` schema. On platform domains emits a generic `Organization`. On agent domains emits a minimal `RealEstateAgent` shell.
- **PersonJsonLd** — now async. Only renders on JPS owner domains (returns `null` otherwise).
- **WebSiteJsonLd** — now async. Uses `cfg.baseUrl` and `cfg.siteName` instead of hardcoded `jpsrealtor.com`.
- **BreadcrumbJsonLd** and **PropertyListingJsonLd** — unchanged (they already receive URLs as props).

### 2. ArticleJsonLd (`src/app/components/seo/ArticleJsonLd.tsx`)

- Now async Server Component.
- Author name, author URL, publisher name, publisher logo, and image base URL all resolve from the current domain config.

### 3. FaqJsonLd (`src/app/components/seo/FaqJsonLd.tsx`)

- `getCityFaqs()` now accepts optional `agentName` and `agentPhone` parameters (defaults to Joseph Sardella's info).
- Callers on agent domains should pass the agent's name and phone for personalised FAQ text.

### 4. Root layout (`src/app/layout.tsx`)

- `metadata` export replaced with async `generateMetadata()` that reads the hostname and returns domain-specific:
  - `title` (default + template)
  - `description`, `keywords`, `authors`, `creator`, `publisher`
  - `metadataBase`, `alternates.canonical`
  - `openGraph` (url, siteName, title, description, images)
  - `twitter` (title, description, images, creator handle)
  - `applicationName`, `appleWebApp.title`

### 5. Directory page (`src/app/directory/page.tsx`)

- Converted from static `metadata` to `generateMetadata()`.
- OpenGraph URL uses `cfg.baseUrl` instead of hardcoded `chatrealty.io`.

### 6. Pricing page (`src/app/pricing/page.tsx`)

- Converted from static `metadata` to `generateMetadata()`.
- Title and OG URL use `cfg.siteName` / `cfg.baseUrl`.

### Already domain-aware (not changed)

- `src/app/robots.ts` — reads hostname from headers
- `src/lib/sitemap-generator.ts` — has its own `DomainInfo` classification
- `src/app/sitemap.ts` — delegates to sitemap-generator

---

## How to add a new domain

### New owner alias (e.g. `josephsardella.realestate`)

Add the hostname to `JPS_DOMAINS` in:
- `src/lib/domain-utils.ts`
- `src/proxy.ts` (`OWNER_HOSTNAMES`)
- `src/app/robots.ts` (`JPS_DOMAINS`)
- `src/lib/sitemap-generator.ts` (`JPS_DOMAINS`)

### New platform domain (e.g. `chatrealty.com`)

Add the hostname to `PLATFORM_DOMAINS` in the same four files listed above.

### Agent custom domains

No code changes needed — any hostname not in the owner or platform sets is automatically treated as an agent domain. The middleware in `proxy.ts` resolves the agent ID via `AGENT_DOMAIN_MAP` (to be replaced with a DB lookup).

To enrich the generic agent SEO defaults with real profile data, the caller should fetch the agent's profile from the DB and pass it to the relevant component (or use the `useAgentProfile` hook on the client side).

---

## Testing

Locally, set the `Host` header to simulate different domains:

```bash
# JPS domain
curl -H "Host: jpsrealtor.com" http://localhost:3000/ | grep "ld+json"

# Platform domain
curl -H "Host: chatrealty.io" http://localhost:3000/ | grep "ld+json"

# Agent domain
curl -H "Host: janedoe-realty.com" http://localhost:3000/ | grep "ld+json"
```

Or configure `/etc/hosts` entries pointing test domains to `127.0.0.1`.
