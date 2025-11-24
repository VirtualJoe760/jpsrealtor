# Multi-Tenant Architecture

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty Network
**Status:** Phase 1 (Single Tenant) → Phase 2 (Multi-Tenant Ready)

---

## Executive Summary

The ChatRealty ecosystem is designed as a **multi-tenant SaaS platform** that enables multiple real estate agents to deploy their own branded websites while sharing a common backend infrastructure.

**Current State** (Phase 1): Single tenant (jpsrealtor.com)

**Future State** (Phase 2): Multi-tenant network (agent1.com, agent2.com, agent3.com, all powered by ChatRealty.io)

---

## Architecture Model

### Shared Backend, Isolated Data

```
┌─────────────────────────────────────────────────────┐
│             ChatRealty.io Network                   │
├─────────────────────────────────────────────────────┤
│  Frontend Layer (Multi-Tenant)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │jpsrealtor.com│  │agent2.com  │  │agent3.com  │ │
│  │ (Tenant 1)   │  │ (Tenant 2)  │  │ (Tenant 3)  │ │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                 │                │        │
│         └─────────────────┴────────────────┘        │
│                          ↓                          │
│  ┌─────────────────────────────────────────────┐   │
│  │        Shared PayloadCMS Backend             │   │
│  │     (cms.chatrealty.io or per-tenant)       │   │
│  └─────────────────────────────────────────────┘   │
│                          ↓                          │
│  ┌─────────────────────────────────────────────┐   │
│  │        Shared MongoDB Database               │   │
│  │   (tenant-aware collections)                 │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Tenant Identification

### Domain-Based Tenancy

Each tenant has their own domain that maps to a tenant ID.

**Tenant Configuration**:
```typescript
// Stored in database
{
  tenantId: "jpsrealtor",
  domain: "jpsrealtor.com",
  cmsUrl: "https://cms.jpsrealtor.com",
  branding: {
    name: "JPS Realtor",
    logo: "https://cdn.jpsrealtor.com/logo.png",
    primaryColor: "#6B46C1",
    secondaryColor: "#3B82F6"
  },
  subscription: {
    tier: "enterprise",
    status: "active"
  }
}
```

**Middleware** (tenant detection):
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';

  // Look up tenant by domain
  const tenant = await getTenantByDomain(hostname);

  if (!tenant) {
    return NextResponse.redirect(new URL('https://chatrealty.io/404', req.url));
  }

  // Add tenant context to request
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-id', tenant.tenantId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

---

## Data Isolation

### Tenant-Scoped Collections

**Pattern**: Add `tenantId` field to all tenant-specific collections.

**Example** (Users collection):
```typescript
{
  _id: ObjectId,
  tenantId: "jpsrealtor", // ← Tenant identifier
  email: "user@example.com",
  role: "client",
  // ...
}
```

**Queries** always filter by `tenantId`:
```typescript
const users = await User.find({
  tenantId: req.headers.get('x-tenant-id'),
  role: 'client'
});
```

---

### Shared Collections

**MLS listings** are shared across all tenants (no `tenantId` field).

**Rationale**: Listing data is public and not tenant-specific.

---

## Tenant-Specific Features

### 1. Branding Customization

Each tenant can customize:
- Logo
- Color scheme
- Homepage layout
- Footer content

**Implementation**:
```typescript
// Fetch tenant branding
const tenant = await Tenant.findOne({ tenantId });

// Apply branding to UI
<div style={{
  '--primary-color': tenant.branding.primaryColor,
  '--secondary-color': tenant.branding.secondaryColor
}}>
  <img src={tenant.branding.logo} alt={tenant.branding.name} />
</div>
```

---

### 2. Subscription Tiers

**Tiers**:
- **Basic** ($49/mo): 100 AI queries/month, basic analytics
- **Pro** ($99/mo): Unlimited AI, advanced analytics, custom domain
- **Enterprise** ($299/mo): White-label, priority support, API access

**Enforcement**:
```typescript
// Check subscription tier before AI query
if (tenant.subscription.tier === 'basic' && tenant.monthlyQueries >= 100) {
  throw new Error('Monthly query limit reached. Upgrade to Pro.');
}
```

---

### 3. Isolated User Data

**Users** are scoped to tenants:
- User on `jpsrealtor.com` cannot access `agent2.com`
- Each tenant manages their own users

**Exception**: ChatRealty admin users can access all tenants.

---

## Deployment Strategy

### Option 1: Shared Infrastructure (Current)

**All tenants** deployed from the same codebase.

**Pros**:
- Simple deployment
- Lower costs
- Centralized updates

**Cons**:
- Performance impact if one tenant has high traffic
- Shared rate limits

---

### Option 2: Per-Tenant Deployments (Future)

**Each tenant** gets their own Vercel deployment.

**Pros**:
- Isolated performance
- Per-tenant rate limits
- Custom scaling

**Cons**:
- Higher costs
- Complex deployment pipeline

---

## Database Schema Updates

### New Collections

**Tenants Collection**:
```typescript
{
  _id: ObjectId,
  tenantId: string (unique),
  domain: string (unique),
  cmsUrl: string,
  branding: { ... },
  subscription: { ... },
  createdAt: ISODate
}
```

---

### Modified Collections

**Add `tenantId` to**:
- `users`
- `chatMessages`
- `savedChats`
- `swipeReviewSessions`
- `contacts`
- `blogPosts`

**DO NOT add `tenantId` to**:
- `listings` (shared)
- `crmlsListings` (shared)
- `cities` (shared)
- `neighborhoods` (shared)

---

## Cross-References

- **Master Architecture**: See `MASTER_SYSTEM_ARCHITECTURE.md`
- **Auth Architecture**: See `AUTH_ARCHITECTURE.md`
- **Database Architecture**: See `DATABASE_ARCHITECTURE.md`

---

## Next Steps for Multi-Tenant Launch

1. Add `tenantId` field to all relevant collections
2. Implement tenant detection middleware
3. Create Tenants admin collection in PayloadCMS
4. Build tenant provisioning flow
5. Test with second agent domain

**Questions?** Refer to `DEVELOPER_ONBOARDING.md`.
