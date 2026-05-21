# Buy Page Redesign — `/neighborhoods/[cityId]/buy`

## Overview

A brand-centric, data-driven, interactive landing page for buying a home with the primary agent. Each city in the system gets its own buy page (`/neighborhoods/indian-wells/buy`, `/neighborhoods/palm-springs/buy`, etc.).

The page is built for scale — driven by the `agentProfile` on the user model and the primary agent's domain, so it works for any agent on the platform.

## Data Sources

| Source | What it provides |
|---|---|
| `GET /api/agent/public` | Agent name, headshot, bio, phone, social links, brand colors, headline, tagline, specializations |
| City constants (`cities.ts`) | City name, population, coordinates, description, about text, keywords |
| `GET /api/cities/[cityId]/listings?limit=6` | Featured active listings for the city |
| `GET /api/cities/[cityId]/stats` | Market stats (median price, listing count, avg DOM) |
| `GET /api/subdivisions?city=[name]` | Popular subdivisions in the city |
| Cloudinary assets | Agent headshot, property photography, hero backgrounds |

## Page Sections (Scroll Sequence)

### 1. Hero — 3D Interactive Scene
**Full viewport height. Immersive.**

- Three.js canvas with a stylized 3D house model (low-poly or abstract)
- House rotates slowly, user can drag to rotate
- Parallax depth layers: mountains in back, desert landscape, house in center
- Overlay text: "{City Name}" (large), "Find Your Home with {Agent Name}" (subtitle)
- CTA buttons: "Browse Listings" + "Book Consultation"
- Agent headshot floating in bottom-right with name/title
- Scroll indicator arrow at bottom

**Fallback:** For low-powered devices, static hero image with parallax CSS

### 2. Market Snapshot — Animated Stats
**Visible on scroll, numbers count up.**

- Median Price (formatted, counts up from 0)
- Active Listings count
- Avg Days on Market
- Price per Sq Ft
- Data from `/api/cities/[cityId]/stats`

### 3. Featured Listings — Card Carousel
**Horizontal scroll, 3-6 listings.**

- Uses existing listing card pattern (photo, price, bed/bath/sqft)
- Data from `/api/cities/[cityId]/listings?limit=6`
- Links to individual listing pages
- "View All Listings →" CTA at end

### 4. Why Work With {Agent Name}
**Agent-driven content from agentProfile.**

- Agent headshot (large, with gradient background)
- Value propositions from `agentProfile.valuePropositions` (fallback to defaults)
- Specializations badges
- Years of experience / stats from `agentProfile.stats`
- Brief bio excerpt

### 5. Your Home-Buying Journey
**Interactive timeline/stepper.**

- 5 steps with scroll-reveal
- Each step has icon, title, description
- Steps: Consultation → Search → Analysis → Negotiation → Closing
- Clean numbered progression

### 6. Explore Neighborhoods
**Grid of top subdivisions in this city.**

- Data from subdivisions collection
- Each card: subdivision name, listing count, median price, photo
- Links to subdivision pages

### 7. About {City Name}
**City-specific content.**

- From city constants: description, about text
- Population, key highlights
- Lifestyle/community info

### 8. Contact CTA — Full Width
**Final conversion section.**

- Large agent photo
- "Ready to find your home in {City}?"
- Phone number (click-to-call)
- Book consultation button (TidyCal link)
- Social media links

## Technical Approach

### 3D Scene (`@react-three/fiber`)
```
src/app/components/buy/
├── BuyPageHero3D.tsx      — Three.js canvas with house model
├── HouseModel.tsx         — 3D house geometry (drei shapes, not GLTF)
├── DesertScene.tsx         — Background landscape
└── BuyPageHero2D.tsx      — Static fallback for low-power devices
```

Use `@react-three/drei` helpers: `OrbitControls`, `Environment`, `Float`, `Text3D`, `MeshWobbleMaterial`.

### Agent Data Hook
```typescript
// src/app/hooks/useAgentProfile.ts
// Fetches from /api/agent/public, caches in state
const { agent, loading } = useAgentProfile();
```

### Scroll Animations
Reuse `RevealSection` from CMA report (IntersectionObserver-based fade-in).

### Market Stats
Animated counter component that counts up when visible.

## File Structure

```
src/app/
├── neighborhoods/[cityId]/buy/
│   ├── page.tsx              — Server component (metadata, data fetching)
│   └── BuyPageClient.tsx     — Client component (full page)
├── components/buy/
│   ├── BuyPageHero3D.tsx     — Three.js interactive hero
│   ├── HouseModel.tsx        — 3D house model
│   ├── BuyPageHero2D.tsx     — Static fallback hero
│   ├── MarketSnapshot.tsx    — Animated stats counters
│   ├── FeaturedListings.tsx  — Listing card carousel
│   ├── AgentValueProps.tsx   — Agent highlights section
│   ├── BuyingJourney.tsx     — Step-by-step timeline
│   ├── NeighborhoodGrid.tsx  — Subdivision cards grid
│   └── ContactCTA.tsx        — Final CTA section
├── hooks/
│   └── useAgentProfile.ts   — Agent profile fetcher
```
