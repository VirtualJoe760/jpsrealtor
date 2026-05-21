# Agent Directory

The Agent Directory at `/directory` is the public-facing SEO cross-linking hub for the ChatRealty network. It replaces the removed NetworkLinks concept by providing a discoverable page where each agent's card links directly to their custom domain or subdomain, creating natural cross-links between chatrealty.io and tenant sites.

## Architecture

```
/directory (page.tsx)           Server component with SEO metadata
  └─ DirectoryClient.tsx        Client component with search/filter/grid
      └─ AgentCard.tsx           Reusable card component (theme-aware)

/api/agents/directory (route.ts) Public GET endpoint, no auth required
```

## API: GET /api/agents/directory

Public endpoint that queries the User model for agents with `realEstateAgent` role and a populated `agentProfile` (must have at least a headshot or headline).

### Query Parameters

| Param            | Description                                    |
|------------------|------------------------------------------------|
| `city`           | Filter by service area name (case-insensitive) |
| `specialization` | Filter by specialization (case-insensitive)    |
| `search`         | Partial name match (case-insensitive)          |

### Response Shape

```json
{
  "success": true,
  "agents": [
    {
      "id": "...",
      "name": "Jane Doe",
      "headshot": "https://res.cloudinary.com/...",
      "headline": "Your Trusted Partner",
      "tagline": "Serving OC Since 2015",
      "serviceAreas": [{ "name": "Irvine", "type": "city" }],
      "specializations": ["Luxury Homes"],
      "customDomain": "janedoe.com",
      "subdomain": "jane",
      "socialMedia": { "instagram": "..." },
      "certifications": [{ "name": "CLHMS", "issuedBy": "ILHM", "year": 2022 }]
    }
  ],
  "filters": {
    "cities": ["Irvine", "Newport Beach"],
    "specializations": ["Luxury Homes", "First-Time Buyers"]
  }
}
```

### Caching

Response includes `Cache-Control: public, max-age=3600, stale-while-revalidate=300` (1 hour cache, 5 min stale window).

## Page Features

- **Hero section** with "Find Your Local Expert" headline
- **Search bar** with 300ms debounce for name/area search
- **Filter pills** auto-populated from the API response (cities + specializations)
- **Responsive grid**: 1 column on mobile, 2 on tablet (sm), 3 on desktop (lg)
- **Loading skeletons** during data fetch
- **Empty state** with contextual messaging
- **Footer link** back to chatrealty.io

## AgentCard Component

Located at `src/app/components/directory/AgentCard.tsx`. Displays:

- Headshot image with fallback initials avatar
- Name, headline, tagline
- Service area pills (blue, max 5 shown)
- Specialization pills (emerald, max 4 shown)
- Certification names
- "Visit Website" CTA linking to `customDomain` or `subdomain.chatrealty.io`

Fully theme-aware using `useThemeClasses()` with `isLight` conditional styling.

## SEO Value

Each agent card's "Visit Website" link is the cross-link that connects chatrealty.io to tenant domains. The page has:

- Static metadata (title, description, keywords, OpenGraph, Twitter cards)
- Semantic HTML (h1, h3 headings, proper alt text)
- Clean URL at `/directory`

## Files

| File | Purpose |
|------|---------|
| `src/app/api/agents/directory/route.ts` | Public API endpoint |
| `src/app/directory/page.tsx` | Server component with metadata |
| `src/app/directory/DirectoryClient.tsx` | Client component with UI |
| `src/app/components/directory/AgentCard.tsx` | Reusable agent card |
