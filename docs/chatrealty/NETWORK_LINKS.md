# NetworkLinks — Cross-Domain SEO Component

## Overview

The NetworkLinks system renders contextual cross-links between agent domains in the ChatRealty network. It builds SEO authority through internal network linking while keeping the experience natural and non-spammy for users.

## Architecture

```
NetworkLinks.tsx (client component)
       |
       v
GET /api/network-links?domain=...&city=...
       |
       v
src/lib/network-links.ts
  - generateCrossLinks()    — scores + selects relevant links
  - getNetworkDomains()     — fetches agent domains from User model
```

## Files

| File | Purpose |
|------|---------|
| `src/app/components/NetworkLinks.tsx` | Client component rendering cross-links |
| `src/app/api/network-links/route.ts` | GET API endpoint returning scored links |
| `src/lib/network-links.ts` | Business logic for link selection and scoring |

## Component Usage

```tsx
import NetworkLinks from "@/app/components/NetworkLinks";

// Basic usage
<NetworkLinks currentDomain="jpsrealtor.com" />

// With context for better relevance
<NetworkLinks
  currentDomain="jpsrealtor.com"
  context={{
    city: "Palm Desert",
    neighborhood: "PGA West",
    propertyType: "Luxury Homes",
  }}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentDomain` | `string` | Yes | The domain to exclude from results (no self-links) |
| `context` | `object` | No | Contextual filters for relevance scoring |
| `context.city` | `string` | No | Current city for geographic matching |
| `context.neighborhood` | `string` | No | Current neighborhood/subdivision |
| `context.propertyType` | `string` | No | Property type specialization filter |
| `context.agentId` | `string` | No | Current agent ID to exclude |

## API Endpoint

### `GET /api/network-links`

**Query Parameters:**
- `domain` (required) — current domain to exclude
- `city` (optional) — city for geographic relevance
- `neighborhood` (optional) — neighborhood for exact match scoring
- `propertyType` (optional) — property type specialization filter

**Response:**
```json
{
  "success": true,
  "links": [
    {
      "name": "Jane Smith Realty",
      "domain": "janesmith.chatrealty.io",
      "url": "https://janesmith.chatrealty.io",
      "description": "Serving Palm Desert, La Quinta - Luxury Homes",
      "relevance": "exact"
    }
  ]
}
```

**Caching:** 1 hour CDN, 30 min client-side, 2 hour stale-while-revalidate.

## Relevance Scoring

Links are scored by contextual relevance:

| Signal | Score | Relevance Level |
|--------|-------|-----------------|
| Neighborhood match | +15 | `exact` |
| City match in service areas | +10 | `exact` |
| County-level overlap | +5 | `regional` |
| Property type specialization match | +3 | — |
| Network membership (base) | +1 | `network` |

The hub domain (`chatrealty.io`) is always included with an agent directory link, unless the current domain IS the hub.

Results are capped at 8 links max (7 agents + 1 hub).

## Relevance Indicators

The component uses colored dots to visually distinguish link relevance:
- **Green dot** — Exact match (serves same city/neighborhood)
- **Blue dot** — Regional match (same county)
- **Gray dot** — Network-level link

## Theme Support

The component uses `useThemeClasses()` from `ThemeContext` and adapts to both light gradient and dark (blackspace) themes. No additional theme configuration is needed.

## Data Source

Links are generated from the `User` model, specifically agents (`roles: "realEstateAgent"`) who have either:
- `agentProfile.customDomain` — a custom domain (e.g., `jpsrealtor.com`)
- `agentProfile.subdomain` — a subdomain (e.g., `joseph` becomes `joseph.chatrealty.io`)

Service areas and specializations stored on the agent profile drive the relevance scoring.

## Placement Recommendations

Place the component in locations where cross-links feel natural:
- Footer area of listing detail pages
- Bottom of neighborhood/city pages
- Below blog articles
- Agent landing page footers

Avoid placing it in high-conversion areas (search results, swipe interface) where it could distract from the primary user flow.
