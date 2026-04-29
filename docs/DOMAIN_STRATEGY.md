# Domain Strategy — Multi-Tenant Architecture

**Created:** April 29, 2026
**Branch:** `admin-dash`

---

## Overview

ChatRealty uses a multi-tenant domain architecture where each agent gets a branded subdomain and can purchase custom domains pointing to different content.

## Domain Hierarchy

```
chatrealty.io                          ← Platform homepage (admin)
├── johndoe.chatrealty.io              ← Agent subdomain (auto-created)
├── johndoe.com → johndoe.chatrealty.io  ← Custom domain → subdomain
├── indianwellshomes.com → /neighborhoods/indian-wells  ← Custom → city page
├── pgawestliving.com → /neighborhoods/la-quinta/pga-west  ← Custom → subdivision
└── johndoelistings.com → /agent/cms/landing-page/xyz  ← Custom → CMS landing page
```

## Agent Flow

### 1. Subdomain (Automatic)
- Agent registers → gets `{slug}.chatrealty.io` subdomain
- Subdomain renders their branded homepage (hero, logo, CTA from agentProfile)
- Stored in `User.agentProfile.subdomain`

### 2. Domain Search & Purchase
- Agent searches for domains in settings (Domain & SEO step)
- Vercel API checks availability and returns price
- Agent purchases with credits (exact Vercel price, no markup for admin)
- Domain registered via Vercel API

### 3. Domain Pointing
- After purchase (or for domains they already own), agent chooses target:
  - **My Homepage** → points to their subdomain (johndoe.chatrealty.io)
  - **City Page** → points to /neighborhoods/{city}
  - **Subdivision Page** → points to /neighborhoods/{city}/{subdivision}
  - **CMS Landing Page** → points to their custom landing page (future)
- Agent submits domain request with target selection

### 4. Admin Approval
- Domain request appears in admin dashboard
- Admin sees: domain, agent, target URL, purchase status
- Admin approves → Vercel domain added to project + DNS instructions sent
- Admin rejects → agent notified with reason

### 5. DNS Configuration
- After approval, agent gets DNS instructions (CNAME → cname.vercel-dns.com)
- System monitors verification status
- Once verified → SSL auto-issued → domain goes live

## Data Model

Uses existing `DomainMapping` model with updated fields:

```typescript
{
  domain: "johndoe.com",
  agentId: ObjectId,
  agentEmail: "johndoe@email.com",

  // Target
  mappingType: "agent_landing" | "community_page" | "custom",
  targetPath: "/",  // or "/neighborhoods/indian-wells" etc.
  subdivisionId?: ObjectId,  // if community_page
  subdivisionName?: string,
  cityId?: string,
  subdivisionSlug?: string,

  // Workflow
  status: "pending_approval" | "approved" | "pending_dns" |
          "pending_verification" | "active" | "rejected" | "failed",
  reviewedBy?: string,
  reviewedAt?: Date,
  rejectionReason?: string,

  // Vercel
  vercelVerified: boolean,
  purchasedViaVercel: boolean,

  // DNS
  dnsConfigured: boolean,
  dnsRecords?: [{ type, name, value }],
}
```

## API Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/agent/domains` | List agent's domain mappings | Agent |
| POST | `/api/agent/domains` | Submit domain request | Agent |
| DELETE | `/api/agent/domains/[id]` | Remove domain request | Agent |
| POST | `/api/domains/check` | Check availability + price | Agent |
| POST | `/api/domains/purchase` | Purchase via Vercel | Agent |
| GET | `/api/admin/domains` | List all domain requests | Admin |
| PUT | `/api/admin/domains/[id]` | Approve/reject request | Admin |

## Implementation TODO

### Phase 1: Domain Model & API Updates
- [x] DomainMapping model exists with full workflow fields
- [ ] Make subdivisionId/cityId/subdivisionSlug optional in schema
- [ ] Add mappingType field to schema
- [ ] Update POST /api/agent/domains to support flexible targets

### Phase 2: Agent Domain UI (DomainSeoStep)
- [ ] Connected Domains section shows DomainMapping records (not just agentProfile)
- [ ] Domain search with Vercel availability check
- [ ] Domain purchase with credits
- [ ] Target selection: My Homepage / City / Subdivision
- [ ] Submit for admin approval
- [ ] Status badges (pending, approved, active, rejected)
- [ ] DNS instructions shown after approval

### Phase 3: Admin Domain Approval
- [ ] Admin domains page shows pending requests
- [ ] Approve action: adds domain to Vercel project, updates status
- [ ] Reject action: sends reason to agent
- [ ] Domain status tracking (DNS verification progress)

### Phase 4: CMS Landing Page Integration (Future)
- [ ] Add "CMS Landing Page" as target option
- [ ] Pull from agent's CMS pages for selection
- [ ] Point domain to landing page URL
