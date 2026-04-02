# Domain Mapping System

**Created**: April 1, 2026
**Status**: Phase 1 Implemented
**Depends on**: Multi-Tenant Architecture, CMS Landing Pages

---

## Overview

Domain mapping is a core SEO and branding feature of the ChatRealty platform. It allows agents to point custom domains to specific content within the platform — community pages, landing pages, or their full branded site.

**Why this matters**: People search for "Indian Wells homes for sale" or "VA loan Coachella Valley" — not "jpsrealtor.com". By pointing keyword-rich domains to relevant content, agents capture organic search traffic that would otherwise go to Zillow or generic aggregators.

Every custom domain page is **powered by ChatRealty** and **advertised by the agent** — the platform provides the tech, data, and AI tools while the agent provides the local expertise and branding.

---

## Domain Types

### 1. Primary Site Domain
The agent's main branded website.

```
jpsrealtor.com → Agent's full site experience (insights, map, chat, neighborhoods)
```

- One primary domain per agent
- Agent requests it, admin approves and assigns
- The entire site renders with this agent's branding, theme, and profile
- Currently: jpsrealtor.com is the only primary domain (Joseph Sardella)

### 2. Community Domain
Points to a specific neighborhood/subdivision page.

```
indianwellsccrealestate.com → /neighborhoods/indian-wells/indian-wells-country-club
coachellavalleyluxuryhomes.com → /neighborhoods/rancho-mirage/the-reserve
```

- Targets location-specific search queries
- Full community page with listings, carousel, map, stats, reviews
- Agent-branded with their profile and contact info
- Multiple community domains per agent allowed

### 3. Landing Page Domain
Points to a CMS-created landing page (campaign).

```
cvveteranhomebuyers.com → /campaign/va-loan-coachella-valley
coachellamusicfestivalrentals.com → /campaign/coachella-fest-rentals
```

- Created via the CMS landing page builder
- Can include: YouTube video, description, forms, CTAs, cobranding
- Landing pages also work without domains: `jpsrealtor.com/campaign/va-loan-benefits`
- Great for seasonal campaigns, niche markets, cobranded partnerships

### 4. Platform Subdomain (Future)
Free tier agent branding on the ChatRealty domain.

```
joseph.chatrealty.io → Agent's branded experience on the platform
```

- No DNS setup required for the agent
- Available to all agents on any subscription tier
- Not yet implemented

---

## Domain Hierarchy & Ownership

```
Admin (Platform Owner)
  └── Approves all domain requests
      ├── Primary Domain → assigned to ONE agent
      │   └── jpsrealtor.com → josephsardella@gmail.com
      │
      ├── Community Domain → requested by agent, points to community page
      │   └── indianwellsccrealestate.com → Indian Wells Country Club
      │
      └── Landing Page Domain → requested by agent, points to campaign page
          └── cvveteranhomebuyers.com → /campaign/va-loan-coachella-valley
```

**Rules:**
- Any agent can REQUEST a domain
- Only admins can APPROVE a domain
- A domain can only be assigned to one agent at a time
- An agent can have multiple domains of any type
- Domains that are not approved do not resolve

---

## Request & Approval Flow

### Agent Side (`/agent/dashboard/domains`)

1. Agent enters the domain name (e.g., `indianwellsccrealestate.com`)
2. Selects the target type:
   - **Community** → picks a subdivision from search
   - **Landing Page** → picks a campaign/landing page from CMS
   - **Primary** → requests it as their main site domain
3. Option to buy the domain through Vercel if they don't own one
4. Submits request → status: `pending_approval`

### Admin Side (`/admin/domains`)

1. Admin sees all pending requests with agent info and target
2. **Approve** → domain registered with Vercel, agent gets DNS instructions
3. **Reject** → with reason, agent notified
4. **Suspend** → can deactivate active domains
5. **Re-approve** → can reactivate rejected/suspended domains

### DNS Setup (After Approval)

Agent configures at their domain registrar:
- **Root domain** (e.g., `indianwellsccrealestate.com`): A record → `76.76.21.21`
- **Subdomain** (e.g., `www.indianwellsccrealestate.com`): CNAME → `cname.vercel-dns.com`
- SSL is auto-provisioned by Vercel once DNS resolves

### Verification

Agent clicks "Verify DNS" in dashboard → system checks via Vercel API → status: `active`

---

## Technical Implementation

### Database Model: `DomainMapping`

```
Collection: domain_mappings

Fields:
  domain          string     "indianwellsccrealestate.com"
  agentId         ObjectId   → User
  agentEmail      string     Denormalized
  subdivisionId   ObjectId   → Subdivision (for community domains)
  targetPath      string     "/neighborhoods/indian-wells/indian-wells-country-club"
  status          enum       pending_approval | approved | pending_dns | active | rejected | failed | suspended
  reviewedBy      string     Admin email who approved/rejected
  reviewedAt      Date
  rejectionReason string
  vercelDomainId  string     Vercel's internal domain ID
  sslStatus       enum       pending | issued | failed | not_started
  dnsConfigured   boolean
  seoTitle        string     Custom page title
  seoDescription  string     Custom meta description
  ogImage         string     Custom OG image
```

### Middleware: `src/proxy.ts`

- Runs on every request via Next.js proxy (formerly middleware)
- Checks if hostname is a primary domain → pass through
- If custom domain → looks up mapping via `/api/internal/domain-lookup`
- Rewrites root path (`/`) to the `targetPath`
- In-memory cache with 5-minute TTL

### Vercel Integration: `src/services/vercel-domains.ts`

- `addDomainToProject(domain)` — registers with Vercel
- `removeDomainFromProject(domain)` — unregisters
- `checkDomainConfig(domain)` — verifies DNS is correct
- `getDnsInstructions(domain)` — returns A/CNAME records for agent

### API Routes

```
Agent:
  GET    /api/agent/domains              — List my domains
  POST   /api/agent/domains              — Request a new domain
  DELETE /api/agent/domains/[id]         — Remove a domain
  POST   /api/agent/domains/verify       — Check DNS status

Admin:
  GET    /api/admin/domains              — List all domains (filterable by status)
  PATCH  /api/admin/domains              — Approve / Reject / Suspend

Internal:
  GET    /api/internal/domain-lookup     — Middleware lookup (not for external use)
```

### Required Environment Variables

```
VERCEL_API_TOKEN    — Vercel API token (create at vercel.com/account/tokens)
VERCEL_PROJECT_ID   — Project ID from Vercel dashboard
VERCEL_TEAM_ID      — (Optional) If project belongs to a team
```

---

## SEO Strategy

### Why Custom Domains Win

Search engines rank domains with keyword relevance higher for matching queries:

| Search Query | Custom Domain | Ranking Advantage |
|---|---|---|
| "Indian Wells homes for sale" | indianwellshomesforsale.com | Exact match domain |
| "Coachella Valley luxury real estate" | coachellavalleyluxuryrealestate.com | Keyword-rich domain |
| "VA loan Palm Springs" | palmspringsvaloans.com | Niche keyword capture |

### Implementation

- Each custom domain page includes proper `<title>`, `<meta description>`, and OG tags
- Canonical URL points to the custom domain (not the original path) to avoid duplicate content
- Landing pages and community pages are fully indexable
- Sitemaps are generated per domain

---

## Roadmap

### Phase 1 — Community Domains (DONE)
- [x] DomainMapping model
- [x] Vercel API service
- [x] Agent domain request UI
- [x] Admin approval dashboard
- [x] DNS instructions
- [x] Proxy-based URL rewriting
- [x] Domain purchase via Vercel link

### Phase 2 — Landing Page Domains
- [ ] CMS landing page builder (separate from blog posts)
- [ ] Landing page content type in CMS (video, forms, CTAs)
- [ ] Domain mapping to `/campaign/[slug]` paths
- [ ] Landing page templates

### Phase 3 — Primary Site Domains
- [ ] Full site branding swap based on domain
- [ ] Agent theme/colors applied to entire site
- [ ] Agent profile data injected into all components
- [ ] Multiple agents on one platform, each with their own domain

### Phase 4 — Platform Subdomains
- [ ] `joseph.chatrealty.io` style routing
- [ ] DNS wildcard for `*.chatrealty.io`
- [ ] Auto-provisioning (no admin approval needed for subdomains)

### Phase 5 — Advanced SEO
- [ ] Per-domain sitemaps
- [ ] Per-domain robots.txt
- [ ] Google Search Console verification per domain
- [ ] Analytics tracking per domain
- [ ] "Powered by ChatRealty" footer badge
