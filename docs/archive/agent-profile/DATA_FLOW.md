# Agent Profile — Data Flow

End-to-end: how a field travels from MongoDB to a rendered pixel on the buy/sell pages.

## The four layers

```
┌─────────────────────────┐
│  MongoDB                │  users collection → User document → agentProfile subdoc
│  src/models/User.ts     │
└────────────┬────────────┘
             │ User.findOne({ email: PRIMARY_AGENT_EMAIL })
             ▼
┌─────────────────────────────────────┐
│  Public Read API                    │  GET /api/agent/public
│  src/app/api/agent/public/route.ts  │  Caches: public, max-age=300
└────────────┬────────────────────────┘
             │ NextResponse.json({ profile: publicProfile })   ← envelope!
             ▼
┌──────────────────────────────────────┐
│  Hook                                │  useAgentProfile()
│  src/app/hooks/useAgentProfile.ts    │  Module-level cache + state
└────────────┬─────────────────────────┘
             │ const { agent } = useAgentProfile()
             ▼
┌──────────────────────────────────────┐
│  Component                           │  agent.headshot, agent.brandColor, ...
│  e.g. SellPageHero3D, BuyIntakeCTA   │  All wrapped in `{agent.x && <...>}`
└──────────────────────────────────────┘
```

## Field-by-field mapping table

This is the **canonical source** for what name a field has at each layer. If
you ever see a field rendering as fallback or undefined, walk this table.

| Hook field (`agent.X`) | Component reads as | Hook reads from | Route returns at | DB lives at |
|---|---|---|---|---|
| `name` | `agent.name` | `data.name` | `profile.name` | `User.name` |
| `email` | `agent.email` | `data.email` | `profile.email` | `User.email` |
| `phone` | `agent.phone` | `data.phone` \|\| `ap.cellPhone` \|\| `ap.phone` | `profile.phone` (and `profile.agentProfile.phone`) | `User.phone` \|\| `User.agentProfile.cellPhone` \|\| `User.agentProfile.officePhone` |
| `brokerageName` | `agent.brokerageName` | `data.brokerageName` \|\| `ap.brokerageName` | `profile.brokerageName` | `User.brokerageName` \|\| `User.agentProfile.brokerageName` |
| `licenseNumber` | `agent.licenseNumber` | `data.licenseNumber` \|\| `ap.licenseNumber` | `profile.licenseNumber` | `User.licenseNumber` \|\| `User.agentProfile.licenseNumber` |
| `headshot` | `agent.headshot` | `ap.headshot` | `profile.agentProfile.headshot` | `User.agentProfile.headshot` |
| `heroPhoto` | `agent.heroPhoto` | `ap.heroPhoto` | `profile.agentProfile.heroPhoto` | `User.agentProfile.heroPhoto` |
| `bio` | `agent.bio` | `ap.bio` | `profile.agentProfile.bio` | `User.agentProfile.bio` |
| `headline` | `agent.headline` | `ap.heroHeadline` \|\| `ap.headline` | `profile.agentProfile.heroHeadline` | `User.agentProfile.headline` |
| `tagline` | `agent.tagline` | `ap.tagline` | `profile.agentProfile.tagline` | `User.agentProfile.tagline` |
| `brandColor` | `agent.brandColor` | `ap.brandColor` | `profile.agentProfile.brandColor` (flattened) | `User.agentProfile.brandColors.primary` |
| `secondaryColor` | `agent.secondaryColor` | `ap.secondaryColor` | `profile.agentProfile.secondaryColor` (flattened) | `User.agentProfile.brandColors.secondary` |
| `customDomain` | `agent.customDomain` | `ap.customDomain` | `profile.agentProfile.customDomain` | `User.agentProfile.customDomain` |
| `subdomain` | `agent.subdomain` | `ap.subdomain` | `profile.agentProfile.subdomain` | `User.agentProfile.subdomain` |
| `socialMedia.instagram` | `agent.socialMedia.instagram` | `ap.instagram` \|\| `ap.socialMedia?.instagram` | `profile.agentProfile.instagram` (flattened) | `User.agentProfile.socialMedia.instagram` |
| `socialMedia.facebook` | `agent.socialMedia.facebook` | `ap.facebook` \|\| `ap.socialMedia?.facebook` | `profile.agentProfile.facebook` (flattened) | `User.agentProfile.socialMedia.facebook` |
| `socialMedia.linkedin` | `agent.socialMedia.linkedin` | `ap.linkedin` \|\| `ap.socialMedia?.linkedin` | `profile.agentProfile.linkedin` (flattened) | `User.agentProfile.socialMedia.linkedin` |
| `socialMedia.twitter` | `agent.socialMedia.twitter` | `ap.twitter` \|\| `ap.socialMedia?.twitter` | `profile.agentProfile.twitter` (flattened) | `User.agentProfile.socialMedia.twitter` |
| `socialMedia.youtube` | `agent.socialMedia.youtube` | `ap.youtube` \|\| `ap.socialMedia?.youtube` | *(not currently exposed by route)* | `User.agentProfile.socialMedia.youtube` |
| `valuePropositions` | `agent.valuePropositions` | `ap.valuePropositions` | *(not currently exposed)* | `User.agentProfile.valuePropositions` |
| `stats` | `agent.stats` | `ap.stats` | *(not currently exposed)* | `User.agentProfile.stats` |
| `specializations` | `agent.specializations` | `ap.specializations` | *(not currently exposed)* | `User.agentProfile.specializations` |
| `serviceAreas` | `agent.serviceAreas` | `ap.serviceAreas?.map(a => a.name \|\| a)` | *(not currently exposed)* | `User.agentProfile.serviceAreas[].name` |

> The "*not currently exposed*" rows mean the public route hasn't been updated
> to forward those fields yet. The hook falls back to the hardcoded `FALLBACK`
> object when the API doesn't return them. **If you need any of these on a
> public page, the route is the place to add them.**

## The envelope gotcha

The route returns:

```json
{
  "profile": {
    "name": "Joseph Sardella",
    "email": "...",
    "phone": "...",
    "agentProfile": {
      "headshot": "...",
      "headshot": "...",
      "brandColor": "...",
      ...
    }
  }
}
```

So in the hook, the **first thing** to do is unwrap the envelope:

```ts
const data = raw.profile || raw;     // unwrap
const ap = data.agentProfile || {};  // shorthand for the inner object
```

**Forgetting to unwrap was the bug we hit on 2026-04-07.** Every field silently
fell through to its hardcoded fallback because the hook was reading
`raw.agentProfile?.X` (always undefined) instead of `raw.profile.agentProfile?.X`.

## Field flattening at the route

Some nested DB fields get **flattened to top-level keys** on the route response
for ergonomic access. The hook handles both shapes for forward compatibility,
but the canonical "API shape" is the flattened one:

| DB nested path | API flat key |
|---|---|
| `brandColors.primary` | `brandColor` |
| `brandColors.secondary` | `secondaryColor` |
| `socialMedia.instagram` | `instagram` |
| `socialMedia.facebook` | `facebook` |
| `socialMedia.linkedin` | `linkedin` |
| `socialMedia.twitter` | `twitter` |
| `headline` | `heroHeadline` *(renamed)* |

If you're adding a new nested field to the schema and want it on public pages,
**flatten it in the route**. Don't make every consumer dig through the nested
shape.

## Caching

| Layer | Mechanism | Lifetime | Invalidation |
|---|---|---|---|
| Route response | HTTP `Cache-Control: public, max-age=300, stale-while-revalidate=60` | 5 min | Time-based |
| Hook | Module-level `let cachedProfile` | Lifetime of the JS module (until full page load / hard reload) | None — only reset on a fresh page load |

The hook cache is the one that bites you. After saving a new field via the
dashboard, you need to either:

1. Hard-reload the public page (Ctrl+Shift+R), OR
2. Wait for HMR to clear the module if dev server picks up changes, OR
3. Restart `npm run dev`

There is **no live cache invalidation** between the dashboard PUT and the
public-page hook. If you want one, the simplest approach is a Mongo change
stream or a websocket nudge — neither is implemented yet.
