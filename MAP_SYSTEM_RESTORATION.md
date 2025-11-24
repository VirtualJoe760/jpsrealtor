# Map System Restoration Guide

## Background

Building a nationwide real-estate map system in Next.js using MapLibre and MongoDB.

**Goal**: Rebuild the entire tile-based clustering pipeline from scratch.

---

## PROMPT 1 — Architecture Overview

### How the Map System Works

#### PHASE 1 — Basic Bounding-Box Queries
- Query MongoDB by lat/lng within map bounds
- **Status**: Slow at scale, only used temporarily

#### PHASE 2 — API-Side Supercluster
- API loaded all listings into Supercluster per request
- **Problem**: Too much CPU, no caching

#### PHASE 3 — FINAL ARCHITECTURE: STATIC TILE-BASED CLUSTERING
**This is the system we are rebuilding.**

The system consists of:

**Script: `generate-map-tiles.ts`**
- Fetches all MLS listings from MongoDB
- Converts them to simple points `{ lat, lng, listingKey }`
- Loops zoom levels 0→15
- Uses tile math to compute (x, y) tile coordinates
- Feeds these po... *(incomplete - waiting for rest)*

---

## PROMPT 2 — Folder Structure

Create the following directories:

```
/scripts/map-tiling/
/public/tiles/                                    ← empty at first
/src/app/api/map-tiles/[z]/[x]/[y]/
/src/app/lib/map-tiles/
/src/app/utils/tileMath/
```

---

## PROMPT 3 — Build tileMath.ts

Write `src/app/utils/tileMath/tileMath.ts` in full.

Must include:
- `lngLatToTile(lng: number, lat: number, zoom: number)`
- `tileToBounds(x: number, y: number, zoom: number)`
- `toRadians`
- `fromRadians`
- Web Mercator helpers
- **Match Mapbox's tile math exactly**

Output entire file, no placeholders.

---

## PROMPT 4 — Build the Tile Generator Script

Write `scripts/map-tiling/generate-map-tiles.ts`

**Requirements:**
- Connect to MongoDB
- Load all listings
- Transform to `{ listingKey, lat, lng }`
- Build a Supercluster instance
- For zoom levels 0 through 15:
  - Compute tile ranges
  - Get clusters for each tile
  - Write JSON to: `public/tiles/${z}/${x}/${y}.json`
- Ensure directories exist before writing
- Use Node FS
- Use TypeScript
- **Write entire script start to finish**

---

## PROMPT 5 — Build the API Route

Write `src/app/api/map-tiles/[z]/[x]/[y]/route.ts`

**Requirements:**
- Extract params from URL
- Read file from `/public/tiles/${z}/${x}/${y}.json`
- If missing, return empty array
- Add caching headers:
  ```
  Cache-Control: public, max-age=31536000, immutable
  ```
- Return JSON
- **Output complete file**

---

## PROMPT 6 — Write the MapLibre Tile Loader

Write the client-side tile loader function for `MapView.tsx`

**Requirements:**
- Accept parameters: map instance, onSelectListing, selectedListing
- Load appropriate tiles based on:
  - zoom
  - bounds → convert to required tiles
- Fetch tiles from `/api/map-tiles/${z}/${x}/${y}`
- Render clusters & individual listing markers
- Use Supercluster's properties exactly the same way Mapbox does
- **Output entire loader function with TypeScript types**

---

## OPTIONAL PROMPTS (Advanced Features)

### Incremental Tile Regeneration
Write `regenerate-tiles.ts` that recalculates only the tiles containing listings that changed since the last run.

### Tile Math Tests
Generate a test file verifying all tile math calculations work correctly.

### Visualization Helper
Generate a debug script that draws all tile boundaries on a canvas for verification.

---

**END OF PROMPTS - Ready to begin implementation**
