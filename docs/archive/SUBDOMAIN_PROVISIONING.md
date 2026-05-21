# Subdomain Provisioning — Agent Onboarding Flow

**Created:** April 29, 2026
**Branch:** `admin-dash`

---

## Overview

Every agent gets a subdomain (`johndoe.chatrealty.io`) automatically when their application is approved. The subdomain renders their branded homepage but only becomes active once they subscribe to a paid tier.

## Flow

```
User applies as agent
    ↓
Admin reviews in /admin/applications/agents
    ↓
Admin clicks "Approve"
    ↓
API: POST /api/admin/applications/agents (action: approve)
    ↓
1. Grant realEstateAgent role
2. Generate subdomain from name ("John Doe" → "johndoe")
3. Check for conflicts (johndoe taken → johndoe2)
4. Save to user.agentProfile.subdomain
5. Register {subdomain}.chatrealty.io with Vercel
6. Send welcome email with subdomain info
    ↓
Agent logs in → sees subdomain in Domain & SEO settings
    ↓
Agent subscribes to Beginner/Experienced/Top Agent tier
    ↓
Subdomain becomes active and resolves to their branded page
```

## Subdomain Generation

**Input:** User's `name` field (falls back to email prefix)
**Output:** lowercase alphanumeric slug

| Name | Subdomain |
|------|-----------|
| John Doe | johndoe |
| María García | maraagarca |
| Bob Smith Jr. | bobsmithjr |
| (no name, email: agent@gmail.com) | agent |

**Conflict resolution:** If `johndoe` is taken, tries `johndoe2`, `johndoe3`, etc.

## Subdomain Activation

The subdomain is registered with Vercel immediately on approval, but the middleware/routing only serves content when:
1. Agent has `realEstateAgent` role
2. Agent has an active subscription (`AgentSubscription.status === "active"`)
3. Agent's `agentProfile` has content to render (at minimum: name)

Without a subscription, visiting `johndoe.chatrealty.io` shows a "Coming Soon" or upgrade prompt.

## Implementation Files

| File | Purpose |
|------|---------|
| `src/app/api/admin/applications/agents/route.ts` | Subdomain generated on approval |
| `src/lib/vercel-domains.ts` | `addDomainToProject()` registers with Vercel |
| `src/models/User.ts` | `agentProfile.subdomain` stores the slug |
| `src/middleware.ts` | Route subdomain requests to agent's page (TODO) |
| `src/app/api/agent/public/route.ts` | Serves agent profile data for subdomain rendering |

## Middleware Routing (TODO)

The middleware needs to detect subdomain requests and route them:

```typescript
// In middleware.ts
const hostname = request.headers.get("host") || "";
const subdomain = hostname.split(".chatrealty.io")[0];

if (subdomain && subdomain !== "www" && subdomain !== "chatrealty") {
  // Look up agent by subdomain
  // Rewrite to agent's branded page
  // Check subscription status
}
```

## DNS Configuration

All `*.chatrealty.io` subdomains are handled by Vercel's wildcard DNS. Individual subdomains are registered via `addDomainToProject()` for SSL certificate provisioning.

## Agent Settings Integration

The agent sees their subdomain in the Domain & SEO settings step:
- Read-only display of `{subdomain}.chatrealty.io`
- Can't change subdomain (admin-assigned)
- Can add custom domain that points to the subdomain
- SEO fields (meta title, description, keywords) customize the subdomain's page

## Email Notifications

On approval, agent receives email with:
- Welcome message
- Their subdomain URL
- Next steps: subscribe to activate, customize settings
- Link to agent dashboard

## TODO

- [ ] Middleware subdomain routing
- [ ] "Coming Soon" page for unsubscribed agent subdomains
- [ ] Subdomain change request flow (agent requests, admin approves)
- [ ] Welcome email with subdomain info on approval
- [ ] Wildcard SSL via Vercel for *.chatrealty.io
