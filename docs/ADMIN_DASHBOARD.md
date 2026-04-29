# Admin Dashboard — Architecture & Implementation Guide

**Created:** April 29, 2026
**Branch:** `admin-dash`
**Access:** Only `josephsardella@gmail.com` (admin role) — enforced server-side

---

## Table of Contents

1. [Security Model](#security-model)
2. [Dashboard Sections](#dashboard-sections)
3. [File Structure](#file-structure)
4. [API Routes](#api-routes)
5. [Data Sources](#data-sources)
6. [ChatRealty Homepage Builder](#chatrealty-homepage-builder)

---

## Security Model

### Middleware Protection

All `/admin` routes are protected by server-side middleware that:
1. Checks NextAuth session exists
2. Verifies user has `admin` role in the database (not just session)
3. Returns 403 for any non-admin access
4. Logs unauthorized access attempts

**Hardcoded admin emails** (fallback if role check fails):
- `josephsardella@gmail.com`

### Implementation

**File:** `src/middleware.ts` — Add `/admin` path protection
**File:** `src/lib/admin-auth.ts` — Shared admin verification utility

```typescript
export async function verifyAdmin(session: Session): Promise<boolean> {
  if (!session?.user?.email) return false;
  const ADMIN_EMAILS = ['josephsardella@gmail.com'];
  if (ADMIN_EMAILS.includes(session.user.email)) return true;
  // Also check DB role
  const user = await User.findOne({ email: session.user.email }).select('roles');
  return user?.roles?.includes('admin') ?? false;
}
```

Every `/api/admin/*` route calls `verifyAdmin()` before processing.

---

## Dashboard Sections

### 1. Overview (Home)

**Route:** `/admin`

Displays key platform metrics at a glance:

| Metric | Source |
|--------|--------|
| Total Users | `users.countDocuments()` |
| Active Agents | `users.countDocuments({ roles: 'realEstateAgent' })` |
| Service Partners | `users.countDocuments({ roles: 'serviceProvider' })` |
| Active Subscriptions | `agentsubscriptions.countDocuments({ status: 'active' })` |
| Monthly Revenue | Sum of active subscription prices |
| Total Credits Outstanding | Sum of all `PointsLedger.balance` |
| Credits Spent (30d) | Aggregation on PointsLedger transactions |
| Pending Applications | Count of agent + partner applications awaiting review |
| FUB Sync Status | Last sync time from `fub_sync_state` collection |
| Active Listings | From City model aggregate |

**Recent Activity Feed:**
- New user signups (last 7 days)
- New applications (agent/partner)
- Subscription changes
- Credit purchases

### 2. Agent Applications

**Route:** `/admin/applications/agents`

Queue of users who applied to become real estate agents.

**Current flow (to modify):**
- User applies via `/dashboard/settings/join-us` or `/api/agent/apply`
- Application goes through Stripe Identity verification
- Currently auto-approves after identity check

**New flow:**
- Application created with `status: 'pending'`
- Admin sees in queue with: name, email, brokerage, license #, DRE status, identity verification status
- Admin actions: **Approve** (grants `realEstateAgent` role, sends welcome email), **Reject** (sends rejection email with reason), **Request Info** (sends email asking for more details)
- Applications filterable by status: pending, approved, rejected

**Data source:** `User.agentApplication` field

### 3. Service Partner Applications

**Route:** `/admin/applications/partners`

Queue from `/partner/settings/apply`.

**Current flow (to modify):**
- Partner applies → auto-granted `serviceProvider` role
- Admin gets email notification

**New flow:**
- Application created with `status: 'pending_review'` instead of auto-approving
- Admin sees: name, email, company, partner type, license, NMLS, phone, website
- Admin actions: **Approve** (grants role, sends email), **Reject**, **Request Info**

**Data source:** `User.servicePartnerProfile` + `User.roles`

### 4. Partnership Management

**Route:** `/admin/partnerships`

All partnerships between agents and service partners.

**Display:** Agent name, partner name, status (pending/active/suspended/terminated), cost split terms, JMA status, campaign count
**Actions:** Suspend, terminate, modify terms
**Data source:** `Partnership` model

### 5. Subscriptions & Revenue

**Route:** `/admin/subscriptions`

**Display:**
- Subscriber list with tier, status, credits balance, renewal date
- Revenue breakdown by tier (Beginner/Experienced/Top Agent/User Pro)
- MRR (Monthly Recurring Revenue)
- Churn rate (cancellations / total)
- Cancellation reasons breakdown (from `User.cancellationReason`)
- Credit economy: total earned, total spent, outstanding

**Actions:**
- Gift credits to any user
- Adjust subscription tier
- Cancel/refund subscription
- View billing history

**Data sources:** `AgentSubscription`, `PointsLedger`, `User`

### 6. Campaign Approvals

**Route:** `/admin/campaigns`

**Display:**
- Pending campaigns awaiting approval
- Campaign details: type (Google Ads, Meta, Direct Mail, Voicemail), target audience, budget in credits, contact count
- Active campaigns with performance metrics

**Actions:** Approve, reject, pause, modify budget
**Data source:** `Campaign` model

### 7. Domain Management

**Route:** `/admin/domains`

**Display:**
- All agent domains from User `agentProfile.customDomain`
- Vercel verification status
- DNS configuration issues
- Domain purchase history

**Actions:** Add domain to Vercel project, remove domain, verify DNS
**Data source:** `User.agentProfile.customDomain`, Vercel API

### 8. User Management

**Route:** `/admin/users`

**Display:**
- Full user list with search, filter by role/status/tier
- User details: name, email, roles, subscription, last login, credit balance

**Actions:**
- Grant/revoke roles (admin, agent, serviceProvider)
- Adjust subscription tier
- Gift/deduct credits
- Suspend/unsuspend account
- Delete account
- View activity history

**Data source:** `User` model

### 9. FUB / CRM Overview

**Route:** `/admin/crm`

**Display:**
- FUB sync status, last sync time, lead count
- Contact counts by source (FUB, CSV import, manual, etc.)
- Lead distribution by status
- Recent FUB sync log

**Actions:** Trigger manual sync, view sync history
**Data source:** `Contact`, `fub_sync_state` collection

### 10. Content / CMS

**Route:** `/admin/content`

**Display:**
- Published articles list
- Draft articles
- SEO performance (from GSC if connected)
- GBP post history

**Actions:** Publish, unpublish, edit, delete articles
**Data source:** `Article` model, GSC API

---

## ChatRealty Homepage Builder

**Route:** `/admin/homepage`

The admin dashboard includes a homepage builder specifically for the ChatRealty.io platform landing page. This mirrors the agent settings concept (Identity, Branding, Photos, Content) but for the main platform.

### Sections

**1. Hero Section**
- Headline text
- Subheadline text
- CTA button text and link
- Background image/video
- Featured agent spotlight

**2. Value Propositions**
- Array of { icon, title, description } cards
- For buyers: AI chat, saved searches, market insights
- For agents: CRM, campaigns, credits system
- For partners: co-marketing, cost splitting, directory

**3. Featured Agents**
- Select agents to feature on homepage
- Pull from User model where `roles: 'realEstateAgent'`
- Show headshot, name, brokerage, service areas

**4. Featured Communities**
- Select cities/subdivisions to highlight
- Pull from City model
- Show listing count, avg price, photo

**5. Testimonials**
- Add/edit testimonials
- Fields: name, role, quote, photo, rating

**6. Platform Stats**
- Active listings count (auto from DB)
- Agents on platform
- Cities covered
- Custom stats (editable)

**7. SEO & Meta**
- Meta title for chatrealty.io
- Meta description
- Open Graph image
- Structured data config

### Data Storage

Store ChatRealty homepage config in a new collection: `platform_config`

```typescript
{
  _id: "homepage",
  hero: { headline, subheadline, ctaText, ctaLink, backgroundImage },
  valueProps: [{ icon, title, description }],
  featuredAgents: [ObjectId],  // refs to User
  featuredCommunities: [{ citySlug, name, photo }],
  testimonials: [{ name, role, quote, photo, rating }],
  stats: { customStats: [{ label, value }] },
  seo: { metaTitle, metaDescription, ogImage },
  updatedAt: Date,
  updatedBy: ObjectId
}
```

### API

- `GET /api/admin/homepage` — fetch config
- `PUT /api/admin/homepage` — update config (admin only)
- `GET /api/platform/homepage` — public read (for frontend rendering)

---

## File Structure

```
src/app/admin/
├── layout.tsx                    # Admin layout with sidebar nav
├── page.tsx                      # Overview dashboard
├── applications/
│   ├── agents/page.tsx           # Agent application queue
│   └── partners/page.tsx         # Partner application queue
├── partnerships/page.tsx         # Partnership management
├── subscriptions/page.tsx        # Subscriptions & revenue
├── campaigns/page.tsx            # Campaign approvals
├── domains/page.tsx              # Domain management
├── users/page.tsx                # User management
├── crm/page.tsx                  # FUB/CRM overview
├── content/page.tsx              # CMS management
├── homepage/page.tsx             # ChatRealty homepage builder
└── components/
    ├── AdminLayout.tsx           # Sidebar + header
    ├── AdminNav.tsx              # Sidebar navigation
    ├── StatsCard.tsx             # Metric display card
    ├── DataTable.tsx             # Reusable sortable/filterable table
    ├── ApprovalCard.tsx          # Application approval card
    ├── HomepageBuilder.tsx       # Homepage section editor
    └── ActivityFeed.tsx          # Recent activity timeline

src/app/api/admin/
├── stats/route.ts                # Dashboard metrics
├── applications/
│   ├── agents/route.ts           # GET list, PUT approve/reject
│   └── partners/route.ts         # GET list, PUT approve/reject
├── partnerships/route.ts         # GET list, PUT actions
├── subscriptions/route.ts        # GET list, PUT adjust
├── campaigns/route.ts            # GET list, PUT approve/reject
├── domains/route.ts              # GET list, domain actions
├── users/route.ts                # GET list, PUT role/tier changes
├── users/[id]/route.ts           # GET/PUT/DELETE single user
├── credits/route.ts              # POST gift credits
├── homepage/route.ts             # GET/PUT homepage config

src/lib/
├── admin-auth.ts                 # Admin verification utility
```

---

## API Routes Summary

All routes require admin authentication.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/stats` | Dashboard overview metrics |
| GET | `/api/admin/applications/agents` | List agent applications |
| PUT | `/api/admin/applications/agents` | Approve/reject agent |
| GET | `/api/admin/applications/partners` | List partner applications |
| PUT | `/api/admin/applications/partners` | Approve/reject partner |
| GET | `/api/admin/partnerships` | List all partnerships |
| PUT | `/api/admin/partnerships` | Modify partnership |
| GET | `/api/admin/subscriptions` | List subscriptions + revenue |
| PUT | `/api/admin/subscriptions` | Adjust tier/credits |
| GET | `/api/admin/campaigns` | List campaigns |
| PUT | `/api/admin/campaigns` | Approve/reject campaign |
| GET | `/api/admin/domains` | List all domains |
| GET | `/api/admin/users` | List/search users |
| GET | `/api/admin/users/[id]` | Get single user detail |
| PUT | `/api/admin/users/[id]` | Update user (roles, tier) |
| DELETE | `/api/admin/users/[id]` | Delete user |
| POST | `/api/admin/credits` | Gift credits to user |
| GET | `/api/admin/homepage` | Get homepage config |
| PUT | `/api/admin/homepage` | Update homepage config |
| GET | `/api/platform/homepage` | Public homepage config |

---

## Data Sources Reference

| Section | Collections Used |
|---------|-----------------|
| Overview | users, agentsubscriptions, pointsledgers, contacts, fub_sync_state, cities |
| Agent Applications | users (agentApplication field) |
| Partner Applications | users (servicePartnerProfile field) |
| Partnerships | partnerships |
| Subscriptions | agentsubscriptions, pointsledgers, users |
| Campaigns | campaigns, contactcampaigns |
| Domains | users (agentProfile.customDomain), Vercel API |
| Users | users |
| CRM | contacts, fub_sync_state |
| Content | articles |
| Homepage | platform_config (new collection) |
