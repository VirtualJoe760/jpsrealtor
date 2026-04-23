# Domain Provisioning System

Automated domain purchasing and provisioning for ChatRealty agent tenants via the Vercel Domains API.

## Architecture

```
Agent Dashboard                API Routes                    Vercel Domains API
     |                            |                               |
     |-- POST /api/domains/check -|-- GET /v4/domains/status -----|
     |                            |-- GET /v4/domains/price ------|
     |                            |                               |
     |-- POST /api/domains/purchase|-- POST /v5/domains/buy ------|
     |                            |-- POST /v10/projects/.../domains
     |                            |-- MongoDB: save customDomain  |
     |                            |                               |
     |-- GET /api/domains/list ---|-- GET /v10/projects/.../domains
```

## Environment Variables

| Variable | Description |
|---|---|
| `VERCEL_API_TOKEN` | Vercel personal access token or team token with domain management permissions |
| `VERCEL_PROJECT_ID` | The Vercel project ID to attach domains to (found in Project Settings > General) |

## Service Layer

**File:** `src/lib/vercel-domains.ts`

Six functions wrapping the Vercel REST API:

| Function | Vercel Endpoint | Description |
|---|---|---|
| `checkDomainAvailability(domain)` | `GET /v4/domains/status` | Check if a domain is available for registration |
| `getDomainPrice(domain)` | `GET /v4/domains/price` | Get the purchase price and period |
| `purchaseDomain(domain)` | `POST /v5/domains/buy` | Purchase a domain through Vercel Registrar |
| `addDomainToProject(domain)` | `POST /v10/projects/{id}/domains` | Connect a domain to the Vercel project for hosting |
| `removeDomainFromProject(domain)` | `DELETE /v10/projects/{id}/domains/{domain}` | Disconnect a domain from the project |
| `listProjectDomains()` | `GET /v10/projects/{id}/domains` | List all domains on the project |

## API Routes

### POST /api/domains/check

Check availability and price for a domain.

**Auth:** Any authenticated user.

**Request:**
```json
{ "domain": "example.com" }
```

**Response:**
```json
{
  "domain": "example.com",
  "available": true,
  "price": 9.99,
  "period": 1
}
```

### POST /api/domains/purchase

Purchase a domain, connect it to the Vercel project, and save it to the agent's profile.

**Auth:** Requires `admin` or `realEstateAgent` role.

**Request:**
```json
{ "domain": "myrealestatesite.com" }
```

**Response:**
```json
{
  "success": true,
  "domain": "myrealestatesite.com",
  "purchased": true,
  "connectedToProject": true,
  "savedToProfile": true
}
```

**Flow:**
1. Purchases the domain via Vercel Registrar (`/v5/domains/buy`)
2. Adds the domain to the Vercel project (`/v10/projects/{id}/domains`)
3. Saves the domain to `User.agentProfile.customDomain` in MongoDB

### GET /api/domains/list

List all domains attached to the Vercel project.

**Auth:** Any authenticated user.

**Response:**
```json
{
  "domains": [
    {
      "name": "jpsrealtor.com",
      "apexName": "jpsrealtor.com",
      "verified": true,
      "verification": [],
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000
    }
  ],
  "total": 1
}
```

## MongoDB Schema

The custom domain is stored in the existing User model at:

```
User.agentProfile.customDomain  // e.g., "josephsardella.com"
User.agentProfile.subdomain     // e.g., "joseph" (joseph.chatrealty.io)
```

Both fields are already indexed for fast lookup:
- `agentProfile.customDomain` -- custom domain resolution
- `agentProfile.subdomain` -- subdomain resolution

## DNS & Verification

After a domain is added to the Vercel project, DNS verification may be required. The `listProjectDomains` response includes a `verification` array with the DNS records the agent needs to configure if the domain was not purchased through Vercel (i.e., brought from an external registrar).

For domains purchased through Vercel Registrar, DNS is configured automatically.

## Future Enhancements

- **External domain support:** Accept domains the agent already owns (skip purchase, just add to project)
- **Domain removal:** API route to disconnect and optionally release a domain
- **SSL status:** Surface SSL certificate provisioning status from Vercel
- **Renewal tracking:** Monitor domain expiration dates and alert agents
