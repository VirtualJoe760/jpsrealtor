# Domain Registry — Centralized Domain Management System

**Created:** April 29, 2026
**Status:** Architecture document — to be implemented

---

## Problem

As the platform scales, each domain needs integration with multiple services:
- Vercel (hosting, SSL, DNS verification)
- Google Search Console (indexing, sitemaps, performance)
- Google Analytics / GA4 (traffic tracking)
- Google Ads (ad accounts, conversion tracking)
- Meta Ads (pixel, CAPI, ad accounts)
- Sitemap generation
- robots.txt configuration
- Structured data / JSON-LD

Currently domain data is scattered across DomainMapping, User.agentProfile, and Vercel API calls with no central registry.

## Solution: Domain Registry Model

A single `DomainRegistry` collection that's the master record for every domain on the platform. All services reference this registry.

## Data Model

```typescript
interface IDomainRegistry {
  // Core
  domain: string;                    // e.g., "johndoe.com"
  type: "platform" | "agent_subdomain" | "agent_custom" | "community";
  status: "active" | "pending" | "suspended" | "decommissioned";

  // Ownership
  ownerId?: ObjectId;                // User who owns this domain (null for platform)
  ownerEmail?: string;               // Denormalized
  ownerType: "platform" | "agent" | "partner";

  // What this domain serves
  target: {
    type: "homepage" | "agent_landing" | "community_page" | "landing_page";
    path: string;                    // e.g., "/", "/neighborhoods/la-quinta"
    agentSubdomain?: string;         // If pointing to an agent subdomain
    subdivisionSlug?: string;
    cityId?: string;
  };

  // Vercel Integration
  vercel: {
    registered: boolean;
    verified: boolean;
    domainId?: string;
    sslStatus: "pending" | "issued" | "failed" | "not_started";
    dnsConfigured: boolean;
    dnsRecords?: Array<{ type: string; name: string; value: string }>;
    registeredAt?: Date;
    verifiedAt?: Date;
  };

  // Google Search Console
  gsc: {
    registered: boolean;
    verified: boolean;
    propertyUrl?: string;            // e.g., "sc-domain:johndoe.com"
    sitemapSubmitted: boolean;
    sitemapUrl?: string;             // e.g., "https://johndoe.com/sitemap.xml"
    lastCrawled?: Date;
    indexedPages?: number;
    registeredAt?: Date;
  };

  // Google Analytics
  analytics: {
    gaEnabled: boolean;
    measurementId?: string;          // e.g., "G-XXXXXXXXXX"
    propertyId?: string;
    streamId?: string;
    createdAt?: Date;
  };

  // Google Ads
  googleAds: {
    enabled: boolean;
    accountId?: string;              // e.g., "123-456-7890"
    conversionTrackingId?: string;
    remarketingTag?: string;
    linkedAt?: Date;
  };

  // Meta (Facebook/Instagram) Ads
  metaAds: {
    enabled: boolean;
    pixelId?: string;                // e.g., "1378421466770456"
    accessToken?: string;            // CAPI server token
    adAccountId?: string;
    linkedAt?: Date;
  };

  // SEO Configuration
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    robotsTxt?: string;              // Custom robots.txt content
    sitemapEnabled: boolean;
    structuredData?: any;            // JSON-LD config
  };

  // Domain Purchase
  purchase: {
    purchasedViaVercel: boolean;
    purchaseDate?: Date;
    expiresAt?: Date;
    registrar?: string;
    autoRenew: boolean;
    creditsCost?: number;            // Credits spent to buy
  };

  // Admin
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## Domain Types

| Type | Example | Owner | Purpose |
|------|---------|-------|---------|
| platform | chatrealty.io, jpsrealtor.com | Admin | Main platform |
| agent_subdomain | johndoe.chatrealty.io | Agent | Auto-created subdomain |
| agent_custom | johndoe.com | Agent | Custom domain → agent page |
| community | indianwellshomes.com | Agent | Custom domain → community page |

## Service Integration Flow

```
Domain created/approved
    ↓
DomainRegistry record created
    ↓ (parallel)
├── Vercel: addDomainToProject() → wait for DNS → SSL
├── GSC: registerProperty() → submit sitemap
├── GA4: createDataStream() → get measurementId
├── Google Ads: linkDomain() → conversion tracking
└── Meta: configurePixel() → CAPI setup
    ↓
All services report back to DomainRegistry
    ↓
Domain fully provisioned
```

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/domains/registry | List all domains (admin) |
| GET | /api/domains/registry/[id] | Get single domain details |
| POST | /api/domains/registry | Create domain record |
| PUT | /api/domains/registry/[id] | Update domain record |
| DELETE | /api/domains/registry/[id] | Decommission domain |
| POST | /api/domains/registry/[id]/provision | Trigger all service registrations |
| GET | /api/domains/registry/[id]/status | Check all service statuses |

## Utility Functions

```
src/lib/domain-registry/
├── index.ts              # Main registry CRUD
├── vercel.ts             # Vercel integration (exists: src/lib/vercel-domains.ts)
├── gsc.ts                # Google Search Console integration
├── analytics.ts          # GA4 stream creation
├── google-ads.ts         # Google Ads domain linking
├── meta-ads.ts           # Meta pixel/CAPI setup
├── sitemap.ts            # Sitemap generation per domain
└── provision.ts          # Orchestrator: provisions all services for a domain
```

## Migration Path

1. Create DomainRegistry model
2. Seed with existing domains (Vercel project domains + DomainMapping records)
3. Build provisioning orchestrator
4. Gradually add service integrations (GSC, GA4, Ads)
5. Update DomainSeoStep and admin pages to use registry
6. Deprecate DomainMapping in favor of DomainRegistry

## Sitemap Strategy

Each domain gets its own sitemap generated based on its target:

| Domain Type | Sitemap Contents |
|-------------|-----------------|
| platform | All pages, all neighborhoods, all articles |
| agent_subdomain | Agent's page, their listings, their community pages |
| agent_custom | Same as subdomain (mirrors) |
| community | Community page, subdivisions, listings in that area |

Sitemaps auto-generated by a utility that reads from the registry and builds XML based on domain type.

## robots.txt Strategy

| Domain Type | robots.txt |
|-------------|-----------|
| platform | Allow all, sitemap reference |
| agent_subdomain | Allow all, agent-specific sitemap |
| agent_custom | Allow all, custom sitemap |
| community | Allow all, community-specific sitemap |

## Implementation Priority

1. **Phase 1:** DomainRegistry model + seed existing domains
2. **Phase 2:** Vercel integration (replace current scattered calls)
3. **Phase 3:** Sitemap generation per domain
4. **Phase 4:** GSC auto-registration
5. **Phase 5:** GA4 stream creation per domain
6. **Phase 6:** Ad platform linking (Google Ads, Meta)
