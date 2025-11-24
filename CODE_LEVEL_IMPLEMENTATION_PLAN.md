# CODE-LEVEL IMPLEMENTATION PLAN
## Complete File-by-File Refactor + Commit-by-Commit Reconstruction

> **Generated:** 2025-11-22
> **Purpose:** Convert rebuild plan into executable code changes with zero-downtime deployment strategy
> **Constraint:** System must remain deployable at every single step

---

## TABLE OF CONTENTS

1. [File-by-File Refactor Plan](#1-file-by-file-refactor-plan)
2. [Commit-by-Commit Git Reconstruction](#2-commit-by-commit-git-reconstruction)
3. [Step-Order Where Nothing Breaks](#3-step-order-where-nothing-breaks)
4. [Final GO/NO GO Checklist](#4-final-go-no-go-checklist)

---

# 1. FILE-BY-FILE REFACTOR PLAN

## 1.A. Backend Ingestion Scripts

### 1.A.1. Files to MODIFY

#### `src/scripts/mls/backend/seed.py`
**Current State:** Lines 1-350 (GPS ingestion, no mlsSource)
**Changes Required:**

```python
# LINE 31 - Add mlsSource field
collection = db.listings

# LINE 80 - After raw dict creation, ADD:
raw["mlsSource"] = "GPS"  # ✅ NEW: Match CRMLS pattern

# LINE 120 - Update upsert operation to ensure mlsSource
update_result = collection.bulk_write(operations, ordered=False)
```

**Reason:** GPS listings need mlsSource identifier for dual-MLS queries

---

#### `src/scripts/mls/backend/crmls/seed.py`
**Current State:** Lines 1-400 (CRMLS ingestion, has mlsSource)
**Changes Required:**

```python
# LINE 80 - VERIFY this line exists (already correct):
raw["mlsSource"] = "CRMLS"  # ✅ Already correct

# LINE 45 - Add field normalization for unified schema
raw["bedsTotal"] = raw.get("bedroomsTotal", None)  # ✅ NEW
raw["bathroomsTotalInteger"] = raw.get("bathsTotal", None)  # ✅ NEW
raw["bathroomsTotalDecimal"] = raw.get("bathsTotalDecimal", None)  # ✅ NEW

# Keep original fields too (don't delete them)
# This allows both field name patterns to work during transition
```

**Reason:** CRMLS uses different field names; normalize during ingestion for unified queries

---

#### `src/scripts/mls/map/generate-map-tiles.ts`
**Current State:** Lines 1-200 (GPS-only tiles, Supercluster v8)
**Complete Rewrite Required:**

```typescript
// LINE 1-10 - Import both models
import Listing from "@/models/Listing";  // GPS
import CRMLSListing from "@/models/CRMLSListing";  // CRMLS
import Supercluster from "supercluster";
import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";

// LINE 20-30 - Dual collection query
async function getAllListings() {
  await connectDB();

  const [gpsListings, crmlsListings] = await Promise.all([
    Listing.find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
    }).lean(),

    CRMLSListing.find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
    }).lean(),
  ]);

  // Normalize GPS listings
  const normalizedGPS = gpsListings.map(listing => ({
    ...listing,
    mlsSource: listing.mlsSource || "GPS",  // Fallback
    listingKey: listing.listingKey || listing.listingId,
    bedsTotal: listing.bedsTotal ?? listing.bedroomsTotal ?? null,
    bathroomsTotalInteger: listing.bathroomsTotalInteger ?? listing.bathsTotal ?? null,
  }));

  // Normalize CRMLS listings
  const normalizedCRMLS = crmlsListings.map(listing => ({
    ...listing,
    mlsSource: listing.mlsSource || "CRMLS",  // Fallback
    listingKey: listing.listingKey || listing.listingId,
    bedsTotal: listing.bedsTotal ?? listing.bedroomsTotal ?? null,
    bathroomsTotalInteger: listing.bathroomsTotalInteger ?? listing.bathsTotal ?? null,
  }));

  return [...normalizedGPS, ...normalizedCRMLS];
}

// LINE 50-80 - Generate GeoJSON features with mlsSource
function createGeoJSONFeatures(listings: any[]) {
  return listings.map(listing => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [listing.longitude, listing.latitude],
    },
    properties: {
      slug: listing.slug,
      listingKey: listing.listingKey,
      listingId: listing.listingId,
      listPrice: listing.listPrice,
      city: listing.city,
      beds: listing.bedsTotal,
      baths: listing.bathroomsTotalInteger ?? listing.bathroomsTotalDecimal,
      photo: listing.primaryPhotoUrl,
      subdivision: listing.subdivisionName,
      yearBuilt: listing.yearBuilt,
      mlsSource: listing.mlsSource,  // ✅ CRITICAL: Include MLS source
      cluster: false,
    },
  }));
}

// LINE 100-150 - Cluster generation (same algorithm, both MLSs)
function generateTiles(features: any[]) {
  const cluster = new Supercluster({
    radius: 80,
    maxZoom: 13,  // RAW_MARKER_ZOOM
    minPoints: 2,
    map: (props) => ({
      ...props,
      // Preserve mlsSource in cluster properties
    }),
    reduce: (accumulated, props) => {
      // Custom reduce to track MLS distribution
      accumulated.gpsCount = (accumulated.gpsCount || 0) + (props.mlsSource === "GPS" ? 1 : 0);
      accumulated.crmlsCount = (accumulated.crmlsCount || 0) + (props.mlsSource === "CRMLS" ? 1 : 0);
      return accumulated;
    },
  });

  cluster.load(features);

  const tiles: Record<string, any> = {};

  // Generate tiles for zoom levels 0-13
  for (let z = 0; z <= 13; z++) {
    const bbox = [-180, -85, 180, 85];  // World bounds
    const clusters = cluster.getClusters(bbox, z);

    clusters.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const { x, y } = lngLatToTile(lng, lat, z);
      const tileKey = `${z}/${x}/${y}`;

      if (!tiles[tileKey]) {
        tiles[tileKey] = {
          type: "FeatureCollection",
          features: [],
        };
      }

      tiles[tileKey].features.push(feature);
    });
  }

  return tiles;
}

// LINE 200-250 - Write tiles to disk
async function writeTilesToDisk(tiles: Record<string, any>) {
  const outputDir = path.join(process.cwd(), "public", "tiles");

  // Clear old tiles
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  let tileCount = 0;
  let gpsListingCount = 0;
  let crmlsListingCount = 0;

  for (const [tileKey, tileData] of Object.entries(tiles)) {
    const filePath = path.join(outputDir, `${tileKey}.json`);
    const dir = path.dirname(filePath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(tileData));

    tileCount++;

    // Count individual listings (not clusters)
    tileData.features.forEach((feature: any) => {
      if (!feature.properties.cluster) {
        if (feature.properties.mlsSource === "GPS") gpsListingCount++;
        if (feature.properties.mlsSource === "CRMLS") crmlsListingCount++;
      }
    });
  }

  console.log(`✅ Generated ${tileCount} tiles`);
  console.log(`✅ GPS listings: ${gpsListingCount}`);
  console.log(`✅ CRMLS listings: ${crmlsListingCount}`);
  console.log(`✅ Total unique listings: ${gpsListingCount + crmlsListingCount}`);
}

// LINE 300 - Main execution
async function main() {
  console.log("🔄 Fetching listings from both GPS and CRMLS...");
  const listings = await getAllListings();
  console.log(`✅ Fetched ${listings.length} total listings`);

  console.log("🔄 Creating GeoJSON features...");
  const features = createGeoJSONFeatures(listings);

  console.log("🔄 Generating tiles with Supercluster...");
  const tiles = generateTiles(features);

  console.log("🔄 Writing tiles to disk...");
  await writeTilesToDisk(tiles);

  await mongoose.disconnect();
  console.log("✅ Tile generation complete!");
}

main().catch(console.error);
```

**Reason:** Current tile generator only queries GPS; new version merges both MLSs

---

### 1.A.2. Files to CREATE (None)
All backend ingestion files already exist; we're only modifying them.

---

### 1.A.3. Files to DELETE (None)
Keep all ingestion scripts; they're working correctly aside from mlsSource field.

---

## 1.B. Backend API Routes

### 1.B.1. Files to MODIFY

#### `src/app/api/chat/search-listings/route.ts`
**Current State:** Lines 1-250 (CRMLS-only query)
**Changes Required:**

```typescript
// LINE 155-200 - Replace CRMLS-only query with dual collection query
export async function POST(req: Request) {
  // ... existing auth/parsing code ...

  // ❌ DELETE THIS (old CRMLS-only):
  // const listings = await CRMLSListing.find(query).sort({ listPrice: 1 }).lean();

  // ✅ ADD THIS (dual collection query):
  const [gpsListings, crmlsListings] = await Promise.all([
    Listing.find(query)
      .sort({ listPrice: 1 })
      .select("listingId listingKey listPrice bedsTotal bathroomsTotalInteger livingArea city primaryPhotoUrl subdivisionName slug slugAddress latitude longitude")
      .lean(),

    CRMLSListing.find(query)
      .sort({ listPrice: 1 })
      .select("listingId listingKey listPrice bedroomsTotal bathsTotal livingArea city primaryPhotoUrl subdivisionName slug slugAddress latitude longitude")
      .lean(),
  ]);

  // Normalize GPS listings
  const normalizedGPS = gpsListings.map(listing => ({
    id: listing.listingKey || listing.listingId,
    price: listing.listPrice,
    beds: listing.bedsTotal,
    baths: listing.bathroomsTotalInteger,
    sqft: listing.livingArea,
    city: listing.city,
    address: listing.unparsedAddress || listing.address,
    image: listing.primaryPhotoUrl,
    subdivision: listing.subdivisionName,
    slug: listing.slug,
    slugAddress: listing.slugAddress,
    latitude: listing.latitude,
    longitude: listing.longitude,
    mlsSource: "GPS",  // ✅ Add source identifier
  }));

  // Normalize CRMLS listings
  const normalizedCRMLS = crmlsListings.map(listing => ({
    id: listing.listingKey || listing.listingId,
    price: listing.listPrice,
    beds: listing.bedroomsTotal,  // Different field name
    baths: listing.bathsTotal,     // Different field name
    sqft: listing.livingArea,
    city: listing.city,
    address: listing.unparsedAddress || listing.address,
    image: listing.primaryPhotoUrl,
    subdivision: listing.subdivisionName,
    slug: listing.slug,
    slugAddress: listing.slugAddress,
    latitude: listing.latitude,
    longitude: listing.longitude,
    mlsSource: "CRMLS",  // ✅ Add source identifier
  }));

  // Merge and deduplicate
  const allListings = [...normalizedGPS, ...normalizedCRMLS];
  const uniqueListings = Array.from(
    new Map(allListings.map(item => [item.id, item])).values()
  );

  return NextResponse.json({ listings: uniqueListings });
}
```

**Reason:** Chat search currently excludes 100% of GPS listings

---

#### `src/app/api/cma/generate/route.ts`
**Current State:** Lines 1-300 (GPS-only comparables)
**Changes Required:**

```typescript
// LINE 30-40 - Import both models
import Listing from "@/models/Listing";
import CRMLSListing from "@/models/CRMLSListing";

// LINE 50-100 - Dual collection query for subject listing
const subjectListing = await Listing.findOne({ listingKey }).lean()
  || await CRMLSListing.findOne({ listingKey }).lean()
  || await CRMLSListing.findOne({ listingId: listingKey }).lean();

if (!subjectListing) {
  return NextResponse.json({ error: "Subject listing not found" }, { status: 404 });
}

// LINE 120-180 - Dual collection query for comparables
const [gpsComps, crmlsComps] = await Promise.all([
  Listing.find({
    city: subjectListing.city,
    listPrice: { $gte: minPrice, $lte: maxPrice },
    bedsTotal: { $gte: minBeds, $lte: maxBeds },
    bathroomsTotalInteger: { $gte: minBaths, $lte: maxBaths },
    livingArea: { $gte: minSqft, $lte: maxSqft },
    latitude: { $exists: true, $ne: null },
    longitude: { $exists: true, $ne: null },
  }).limit(100).lean(),

  CRMLSListing.find({
    city: subjectListing.city,
    listPrice: { $gte: minPrice, $lte: maxPrice },
    bedroomsTotal: { $gte: minBeds, $lte: maxBeds },  // Different field
    bathsTotal: { $gte: minBaths, $lte: maxBaths },    // Different field
    livingArea: { $gte: minSqft, $lte: maxSqft },
    latitude: { $exists: true, $ne: null },
    longitude: { $exists: true, $ne: null },
  }).limit(100).lean(),
]);

// Normalize GPS comparables
const normalizedGPS = gpsComps.map(comp => ({
  ...comp,
  mlsSource: "GPS",
  beds: comp.bedsTotal,
  baths: comp.bathroomsTotalInteger,
}));

// Normalize CRMLS comparables
const normalizedCRMLS = crmlsComps.map(comp => ({
  ...comp,
  mlsSource: "CRMLS",
  beds: comp.bedroomsTotal,
  baths: comp.bathsTotal,
}));

const allComparables = [...normalizedGPS, ...normalizedCRMLS];

// LINE 200-250 - Calculate distance using Haversine formula (unchanged)
// ... existing distance calculation code ...

// LINE 280-300 - Score and rank comparables (add MLS source weighting)
const scoredComps = allComparables.map(comp => {
  const distance = calculateDistance(
    subjectListing.latitude,
    subjectListing.longitude,
    comp.latitude,
    comp.longitude
  );

  const priceDiff = Math.abs(comp.listPrice - subjectListing.listPrice) / subjectListing.listPrice;
  const bedDiff = Math.abs(comp.beds - (subjectListing.bedsTotal || subjectListing.bedroomsTotal));
  const bathDiff = Math.abs(comp.baths - (subjectListing.bathroomsTotalInteger || subjectListing.bathsTotal));
  const sqftDiff = Math.abs(comp.livingArea - subjectListing.livingArea) / subjectListing.livingArea;

  // Same-MLS bonus (prefer comparables from same MLS as subject)
  const sameMlsBonus = comp.mlsSource === (subjectListing.mlsSource || "GPS") ? 0.05 : 0;

  const score = (
    distance * 0.3 +
    priceDiff * 0.25 +
    bedDiff * 0.15 +
    bathDiff * 0.15 +
    sqftDiff * 0.15 -
    sameMlsBonus  // Lower score is better
  );

  return { ...comp, distance, score };
});

// Return top 10 comparables
const topComps = scoredComps
  .sort((a, b) => a.score - b.score)
  .slice(0, 10);

return NextResponse.json({ subject: subjectListing, comparables: topComps });
```

**Reason:** CMA currently excludes all CRMLS comparables, limiting analysis accuracy

---

#### `src/app/api/subdivisions/[slug]/listings/route.ts`
**Current State:** Lines 1-150 (GPS-only subdivision listings)
**Changes Required:**

```typescript
// LINE 50-100 - Dual collection query
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.find({
    $or: [
      { subdivisionName: { $regex: new RegExp(`^${slug}$`, "i") } },
      { subdivisionName: { $regex: new RegExp(slug.replace(/-/g, " "), "i") } },
    ],
    standardStatus: "Active",
  })
    .sort({ listPrice: -1 })
    .limit(50)
    .lean(),

  CRMLSListing.find({
    $or: [
      { subdivisionName: { $regex: new RegExp(`^${slug}$`, "i") } },
      { subdivisionName: { $regex: new RegExp(slug.replace(/-/g, " "), "i") } },
    ],
    standardStatus: "Active",
  })
    .sort({ listPrice: -1 })
    .limit(50)
    .lean(),
]);

// Normalize and merge
const normalizedGPS = gpsListings.map(listing => ({
  ...listing,
  mlsSource: "GPS",
  beds: listing.bedsTotal,
  baths: listing.bathroomsTotalInteger,
}));

const normalizedCRMLS = crmlsListings.map(listing => ({
  ...listing,
  mlsSource: "CRMLS",
  beds: listing.bedroomsTotal,
  baths: listing.bathsTotal,
}));

const allListings = [...normalizedGPS, ...normalizedCRMLS];

// Deduplicate by listingKey
const uniqueListings = Array.from(
  new Map(allListings.map(item => [item.listingKey || item.listingId, item])).values()
);

return NextResponse.json({ listings: uniqueListings });
```

**Reason:** Subdivision pages should show all listings from both MLSs

---

#### `src/app/api/cities/[cityId]/stats/route.ts`
**Current State:** Lines 1-200 (GPS + CRMLS aggregation, needs verification)
**Changes Required:**

```typescript
// LINE 100-150 - Verify stats merge both collections correctly
const [gpsStats, crmlsStats] = await Promise.all([
  Listing.aggregate([
    { $match: { city: cityName, standardStatus: "Active" } },
    {
      $group: {
        _id: "$propertyType",
        count: { $sum: 1 },
        avgPrice: { $avg: "$listPrice" },
        minPrice: { $min: "$listPrice" },
        maxPrice: { $max: "$listPrice" },
        avgBeds: { $avg: "$bedsTotal" },
        avgBaths: { $avg: "$bathroomsTotalInteger" },
        avgSqft: { $avg: "$livingArea" },
      },
    },
  ]),

  CRMLSListing.aggregate([
    { $match: { city: cityName, standardStatus: "Active" } },
    {
      $group: {
        _id: "$propertyType",
        count: { $sum: 1 },
        avgPrice: { $avg: "$listPrice" },
        minPrice: { $min: "$listPrice" },
        maxPrice: { $max: "$listPrice" },
        avgBeds: { $avg: "$bedroomsTotal" },  // Different field
        avgBaths: { $avg: "$bathsTotal" },     // Different field
        avgSqft: { $avg: "$livingArea" },
      },
    },
  ]),
]);

// Merge stats by property type
const mergedStats = {};

[...gpsStats, ...crmlsStats].forEach(stat => {
  const type = stat._id;
  if (!mergedStats[type]) {
    mergedStats[type] = {
      propertyType: type,
      gpsCount: 0,
      crmlsCount: 0,
      totalCount: 0,
      avgPrice: 0,
      minPrice: Infinity,
      maxPrice: 0,
      avgBeds: 0,
      avgBaths: 0,
      avgSqft: 0,
    };
  }

  // Determine source
  const isGPS = gpsStats.includes(stat);

  if (isGPS) {
    mergedStats[type].gpsCount += stat.count;
  } else {
    mergedStats[type].crmlsCount += stat.count;
  }

  mergedStats[type].totalCount += stat.count;

  // Weighted average for price/beds/baths/sqft
  mergedStats[type].avgPrice = (
    (mergedStats[type].avgPrice * (mergedStats[type].totalCount - stat.count)) +
    (stat.avgPrice * stat.count)
  ) / mergedStats[type].totalCount;

  mergedStats[type].minPrice = Math.min(mergedStats[type].minPrice, stat.minPrice);
  mergedStats[type].maxPrice = Math.max(mergedStats[type].maxPrice, stat.maxPrice);

  // Similar weighted average for beds/baths/sqft
  // ... (same math pattern) ...
});

return NextResponse.json({ stats: Object.values(mergedStats) });
```

**Reason:** Ensure city stats accurately merge both MLS sources

---

### 1.B.2. Files to CREATE

#### `src/app/api/tiles/[z]/[x]/[y]/route.ts` (NEW)
**Purpose:** Serve pre-generated tiles via API endpoint
**Location:** New file
**Complete Implementation:**

```typescript
// src/app/api/tiles/[z]/[x]/[y]/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { z: string; x: string; y: string } }
) {
  const { z, x, y } = params;

  // Validate tile coordinates
  const zoom = parseInt(z, 10);
  const tileX = parseInt(x, 10);
  const tileY = parseInt(y, 10);

  if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  if (zoom < 0 || zoom > 13) {
    return NextResponse.json({ error: "Zoom level must be 0-13" }, { status: 400 });
  }

  // Construct file path
  const tilePath = path.join(
    process.cwd(),
    "public",
    "tiles",
    z,
    x,
    `${y}.json`
  );

  // Check if tile exists
  if (!fs.existsSync(tilePath)) {
    // Return empty tile instead of 404
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
    });
  }

  // Read and return tile
  const tileData = fs.readFileSync(tilePath, "utf-8");
  const tile = JSON.parse(tileData);

  return NextResponse.json(tile, {
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",  // Cache for 24 hours
      "Content-Type": "application/json",
    },
  });
}
```

**Reason:** Tiles are static files but need dynamic API endpoint for CORS/caching

---

### 1.B.3. Files to DELETE (None)
Keep all existing API routes; they may still be used by other parts of the system.

---

## 1.C. Frontend Components

### 1.C.1. Files to MODIFY

#### `src/app/components/LoadingProvider.tsx`
**Current State:** Lines 1-60 (forces 1.5s delay on ALL pages)
**Changes Required:**

```typescript
// LINE 1-10 - Add usePathname hook
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";  // ✅ ADD THIS
import GlobalLoader from "./GlobalLoader";

// LINE 17-45 - Conditional loading based on route
export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname?.startsWith('/map');  // ✅ NEW: Detect map page
  const isHomePage = pathname === '/';             // ✅ NEW: Detect home page

  // ✅ CHANGE: Only show loader on home page initial load
  const [isLoading, setIsLoading] = useState(() => isHomePage);
  const [showMapLoader, setShowMapLoader] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad) {
      if (isMapPage) {
        // ✅ Skip loader entirely for map pages (they have MapGlobeLoader)
        setIsLoading(false);
        setIsInitialLoad(false);
      } else if (isHomePage) {
        // Show globe loader only on home page
        const timer = setTimeout(() => {
          setIsLoading(false);
          setIsInitialLoad(false);
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        // ✅ All other pages: no artificial delay
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad, isMapPage, isHomePage]);

  const value = {
    isLoading,
    setIsLoading,
    showMapLoader,
    setShowMapLoader,
  };

  return (
    <LoadingContext.Provider value={value}>
      {(isLoading || showMapLoader) && <GlobalLoader />}
      {children}
    </LoadingContext.Provider>
  );
}
```

**Reason:** Removes 1.5-second artificial delay from map page (43% speed improvement)

---

#### `src/app/components/mls/MLSProvider.tsx`
**Current State:** Lines 1-400 (aggressive prefetching on every visibleListings change)
**Changes Required:**

```typescript
// LINE 227-265 - Defer prefetching for map pages
useEffect(() => {
  const pathname = window.location.pathname;
  const isMapPage = pathname.startsWith('/map');

  // ✅ Don't prefetch on map pages (wait until user clicks a listing)
  if (isMapPage) {
    return;
  }

  // ✅ Defer prefetching by 2 seconds to let map render first
  const timer = setTimeout(() => {
    const prefetchListings = async () => {
      const slugsToFetch = visibleListings
        .slice(0, 3)  // ✅ Reduce from 5 to 3
        .map((listing) => listing.slugAddress ?? listing.slug)
        .filter((slug) => slug && !listingCache[slug]);

      for (const slug of slugsToFetch) {
        try {
          const res = await fetch(`/api/mls-listings/${slug}`);
          if (res.ok) {
            const data = await res.json();
            setListingCache((prev) => ({ ...prev, [slug]: data }));
          }
        } catch (err) {
          console.error("Prefetch error:", err);
        }
      }
    };

    prefetchListings();
  }, 2000);  // ✅ NEW: Wait 2 seconds before prefetching

  return () => clearTimeout(timer);
}, [visibleListings]);
```

**Reason:** Reduces API spam from 5-9 calls to 0-3 calls, defers until map is loaded

---

#### `src/app/components/mls/map/MapView.tsx`
**Current State:** Lines 1-576 (client-side Supercluster, bounds-based API)
**Changes Required:**

```typescript
// LINE 1-20 - Add tileLoader import
import { loadTilesForView } from "@/app/lib/map-tiles/tileLoader";  // ✅ NEW
import { Map as MapLibreMap, Marker, Popup } from "@vis.gl/react-maplibre";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMLSContext } from "../MLSProvider";
// ❌ REMOVE: import Supercluster from "supercluster";

// LINE 100-150 - Replace Supercluster with tile-based loading
export default function MapView({
  bounds,
  onBoundsChange,
  listings,
  // ... other props
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: bounds?.center?.[0] || -116.5453,
    latitude: bounds?.center?.[1] || 33.8303,
    zoom: bounds?.zoom || 10,
  });

  const [tileFeatures, setTileFeatures] = useState<any[]>([]);
  const [isLoadingTiles, setIsLoadingTiles] = useState(false);

  // ❌ DELETE: Client-side Supercluster logic (Lines 276-300)
  // const clusterRef = useRef<Supercluster | null>(null);

  // ✅ NEW: Load tiles when viewport changes
  useEffect(() => {
    const loadTiles = async () => {
      setIsLoadingTiles(true);

      try {
        const mapBounds: [number, number, number, number] = [
          viewState.longitude - 1,  // west
          viewState.latitude - 0.5,  // south
          viewState.longitude + 1,   // east
          viewState.latitude + 0.5,  // north
        ];

        const features = await loadTilesForView(mapBounds, viewState.zoom);
        setTileFeatures(features);

        // Notify parent of bounds change
        if (onBoundsChange) {
          onBoundsChange({
            north: mapBounds[3],
            south: mapBounds[1],
            east: mapBounds[2],
            west: mapBounds[0],
            zoom: viewState.zoom,
            center: [viewState.longitude, viewState.latitude],
          });
        }
      } catch (err) {
        console.error("Error loading tiles:", err);
      } finally {
        setIsLoadingTiles(false);
      }
    };

    loadTiles();
  }, [viewState.zoom, viewState.longitude, viewState.latitude]);

  // LINE 200-300 - Render markers from tiles (not from listings prop)
  const markers = useMemo(() => {
    const zoom = viewState.zoom;
    const RAW_MARKER_ZOOM = 13;

    if (zoom >= RAW_MARKER_ZOOM) {
      // Show all individual markers (no clusters)
      return tileFeatures
        .filter(feature => !feature.properties.cluster)
        .map(feature => ({
          ...feature.properties,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        }));
    } else {
      // Show clusters + individual markers below cluster threshold
      return tileFeatures.map(feature => {
        if (feature.properties.cluster) {
          return {
            cluster: true,
            cluster_id: feature.properties.cluster_id,
            point_count: feature.properties.point_count,
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
          };
        } else {
          return {
            ...feature.properties,
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
          };
        }
      });
    }
  }, [tileFeatures, viewState.zoom]);

  // LINE 350-400 - Render MapLibre with markers
  return (
    <div className="relative w-full h-full">
      {isLoadingTiles && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg z-10">
          Loading tiles...
        </div>
      )}

      <MapLibreMap
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        {markers.map((marker, index) => {
          if (marker.cluster) {
            return (
              <Marker
                key={`cluster-${marker.cluster_id}`}
                longitude={marker.longitude}
                latitude={marker.latitude}
              >
                <AnimatedCluster count={marker.point_count} />
              </Marker>
            );
          } else {
            return (
              <Marker
                key={`listing-${marker.listingKey || index}`}
                longitude={marker.longitude}
                latitude={marker.latitude}
                onClick={() => handleMarkerClick(marker)}
              >
                <AnimatedMarker listing={marker} />
              </Marker>
            );
          }
        })}
      </MapLibreMap>
    </div>
  );
}
```

**Reason:** Removes redundant client-side clustering, uses pre-generated tiles instead

---

#### `src/app/utils/map/useListings.ts`
**Current State:** Lines 1-150 (bounds-based API calls)
**Changes Required:**

```typescript
// LINE 73-90 - Replace bounds API with tile loading
import { loadTilesForView } from "@/app/lib/map-tiles/tileLoader";  // ✅ NEW

export function useListings() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadListings = useCallback(async (
    bounds: MapBounds,
    filters: MapFilters
  ) => {
    setIsLoading(true);

    try {
      // ✅ Load from tiles instead of API
      const features = await loadTilesForView(
        [bounds.west, bounds.south, bounds.east, bounds.north],
        bounds.zoom
      );

      // Convert tile features to MapListing format
      const tileListings = features
        .filter(f => !f.properties.cluster)
        .map(f => ({
          _id: f.properties.listingKey,
          listingId: f.properties.listingId,
          listingKey: f.properties.listingKey,
          slug: f.properties.slug,
          slugAddress: f.properties.slug,
          primaryPhotoUrl: f.properties.photo,
          unparsedAddress: "",
          address: "",
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          listPrice: f.properties.listPrice,
          bedsTotal: f.properties.beds,
          bathroomsTotalInteger: f.properties.baths,
          livingArea: 0,
          city: f.properties.city,
          subdivisionName: f.properties.subdivision,
          mlsSource: f.properties.mlsSource,  // ✅ NEW: MLS source from tile
        }));

      setListings(tileListings);
    } catch (err) {
      console.error("Error loading tiles:", err);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { listings, isLoading, loadListings };
}
```

**Reason:** Switch from API-based loading to tile-based loading (40x faster)

---

#### `src/app/map/page.tsx`
**Current State:** Lines 1-300 (20% bounds threshold, resize dispatch)
**Changes Required:**

```typescript
// LINE 120-124 - Remove unnecessary resize dispatch
// ❌ DELETE THESE LINES:
// const timer = setTimeout(() => {
//   window.dispatchEvent(new Event('resize'));
// }, 100);
// MapLibre handles resize automatically

// LINE 153-166 - Reduce bounds change threshold from 20% to 5%
const hasSignificantChange = loadedBounds.length === 0 || loadedBounds.some(loaded => {
  const latDiff = Math.abs(bounds.north - loaded.north) + Math.abs(bounds.south - loaded.south);
  const lngDiff = Math.abs(bounds.east - loaded.east) + Math.abs(bounds.west - loaded.west);
  const latRange = Math.abs(loaded.north - loaded.south);
  const lngRange = Math.abs(loaded.east - loaded.west);

  return (latDiff / latRange > 0.05) || (lngDiff / lngRange > 0.05);  // ✅ Changed from 0.2 to 0.05
});

// OR BETTER: Load on every zoom level change
const lastZoom = useRef<number | null>(null);

useEffect(() => {
  if (bounds.zoom !== lastZoom.current) {
    lastZoom.current = bounds.zoom;
    loadListings(bounds, filters);  // Always load on zoom change
  }
}, [bounds.zoom]);
```

**Reason:** Lower threshold ensures tiles load on small pans/zooms

---

#### `src/app/components/chat/ListingCarousel.tsx`
**Current State:** Lines 1-281 (already supports mlsSource)
**Changes Required:** None (already correct)
**Verification Needed:** Ensure listings passed from chat search include mlsSource field

---

### 1.C.2. Files to CREATE (None)
All frontend components already exist; we're only modifying them.

---

### 1.C.3. Files to DELETE (None)
Keep all frontend components for backward compatibility.

---

## 1.D. Utilities and Libraries

### 1.D.1. Files to MODIFY

#### `src/app/lib/map-tiles/tileLoader.ts`
**Current State:** Lines 1-150 (complete, never imported)
**Changes Required:** None (already correct)
**Action Needed:** Import this file in MapView.tsx and useListings.ts (already covered above)

---

### 1.D.2. Files to CREATE

#### `src/lib/listing-normalizer.ts` (NEW)
**Purpose:** Centralized field normalization for GPS vs CRMLS
**Location:** New file
**Complete Implementation:**

```typescript
// src/lib/listing-normalizer.ts
export interface NormalizedListing {
  id: string;
  listingKey: string;
  listingId: string;
  slug: string;
  slugAddress: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  city: string;
  address: string;
  image: string | null;
  subdivision: string | null;
  latitude: number;
  longitude: number;
  mlsSource: "GPS" | "CRMLS";
  yearBuilt?: number;
  propertyType?: string;
  standardStatus?: string;
}

export function normalizeGPSListing(listing: any): NormalizedListing {
  return {
    id: listing.listingKey || listing.listingId || listing._id,
    listingKey: listing.listingKey || listing.listingId,
    listingId: listing.listingId,
    slug: listing.slug,
    slugAddress: listing.slugAddress || listing.slug,
    price: listing.listPrice,
    beds: listing.bedsTotal ?? listing.bedroomsTotal ?? 0,
    baths: listing.bathroomsTotalInteger ?? listing.bathroomsTotalDecimal ?? 0,
    sqft: listing.livingArea ?? 0,
    city: listing.city,
    address: listing.unparsedAddress || listing.address || "",
    image: listing.primaryPhotoUrl,
    subdivision: listing.subdivisionName,
    latitude: listing.latitude,
    longitude: listing.longitude,
    mlsSource: "GPS",
    yearBuilt: listing.yearBuilt,
    propertyType: listing.propertyType,
    standardStatus: listing.standardStatus,
  };
}

export function normalizeCRMLSListing(listing: any): NormalizedListing {
  return {
    id: listing.listingKey || listing.listingId || listing._id,
    listingKey: listing.listingKey || listing.listingId,
    listingId: listing.listingId,
    slug: listing.slug,
    slugAddress: listing.slugAddress || listing.slug,
    price: listing.listPrice,
    beds: listing.bedroomsTotal ?? listing.bedsTotal ?? 0,  // Different field order
    baths: listing.bathsTotal ?? listing.bathroomsTotalInteger ?? 0,  // Different field order
    sqft: listing.livingArea ?? 0,
    city: listing.city,
    address: listing.unparsedAddress || listing.address || "",
    image: listing.primaryPhotoUrl,
    subdivision: listing.subdivisionName,
    latitude: listing.latitude,
    longitude: listing.longitude,
    mlsSource: "CRMLS",
    yearBuilt: listing.yearBuilt,
    propertyType: listing.propertyType,
    standardStatus: listing.standardStatus,
  };
}

export function normalizeListings(
  gpsListings: any[],
  crmlsListings: any[]
): NormalizedListing[] {
  const normalized = [
    ...gpsListings.map(normalizeGPSListing),
    ...crmlsListings.map(normalizeCRMLSListing),
  ];

  // Deduplicate by listingKey
  const uniqueMap = new Map<string, NormalizedListing>();
  normalized.forEach(listing => {
    if (!uniqueMap.has(listing.listingKey)) {
      uniqueMap.set(listing.listingKey, listing);
    }
  });

  return Array.from(uniqueMap.values());
}
```

**Reason:** DRY principle - centralize field normalization logic used across all APIs

---

### 1.D.3. Files to DELETE (None)
Keep all utilities for backward compatibility.

---

## 1.E. MongoDB Models

### 1.E.1. Files to MODIFY

#### `src/models/Listing.ts` (GPS model)
**Current State:** Lines 1-200 (no mlsSource field)
**Changes Required:**

```typescript
// LINE 50 - Add mlsSource field to schema
const ListingSchema = new Schema({
  // ... existing fields ...
  mlsSource: {
    type: String,
    enum: ["GPS", "CRMLS"],
    default: "GPS",  // ✅ NEW: Default for GPS collection
  },
  // ... rest of fields ...
});

// LINE 180 - Add index on mlsSource for query performance
ListingSchema.index({ mlsSource: 1 });
ListingSchema.index({ city: 1, mlsSource: 1 });
ListingSchema.index({ subdivisionName: 1, mlsSource: 1 });
```

**Reason:** Enable MLS source filtering in unified queries

---

#### `src/models/CRMLSListing.ts` (CRMLS model)
**Current State:** Lines 1-200 (has mlsSource field, different field names)
**Changes Required:**

```typescript
// LINE 50-80 - Add normalized field aliases (keep original fields too)
const CRMLSListingSchema = new Schema({
  // Original CRMLS fields
  bedroomsTotal: { type: Number },
  bathsTotal: { type: Number },
  bathsTotalDecimal: { type: Number },

  // ✅ NEW: Normalized aliases (for backward compatibility)
  bedsTotal: { type: Number },
  bathroomsTotalInteger: { type: Number },
  bathroomsTotalDecimal: { type: Number },

  mlsSource: {
    type: String,
    enum: ["GPS", "CRMLS"],
    default: "CRMLS",  // Already correct
  },

  // ... rest of fields ...
});

// LINE 180 - Same indexes as GPS
CRMLSListingSchema.index({ mlsSource: 1 });
CRMLSListingSchema.index({ city: 1, mlsSource: 1 });
CRMLSListingSchema.index({ subdivisionName: 1, mlsSource: 1 });
```

**Reason:** Add normalized field names while preserving original CRMLS names

---

### 1.E.2. Files to CREATE (None)
Models already exist.

---

### 1.E.3. Files to DELETE (None)
Keep both models separate (dual collection architecture is intentional).

---

## 1.F. Documentation

### 1.F.1. Files to UPDATE

#### `LISTING_DATA_GLOBAL_ARCHITECTURE.md`
**Action:** Add section documenting tile system integration

```markdown
## 8. TILE SYSTEM INTEGRATION (Updated 2025-11-22)

### 8.1. Tile Generation
- **Script:** `src/scripts/mls/map/generate-map-tiles.ts`
- **Source:** Dual collection (GPS + CRMLS)
- **Output:** `public/tiles/{z}/{x}/{y}.json`
- **Status:** ✅ INTEGRATED (as of Phase 1)

### 8.2. Tile Loading
- **Loader:** `src/app/lib/map-tiles/tileLoader.ts`
- **Consumers:**
  - `src/app/components/mls/map/MapView.tsx`
  - `src/app/utils/map/useListings.ts`
- **Status:** ✅ ACTIVE

### 8.3. MLS Source Attribution
- All tiles include `mlsSource` property
- GPS listings: `mlsSource: "GPS"`
- CRMLS listings: `mlsSource: "CRMLS"`
- Enables filtering and analytics
```

---

#### `LISTING_DATA_END_TO_END_FLOW.md`
**Action:** Update Map View Flow section

```markdown
## 2. MAP VIEW FLOW (Updated 2025-11-22)

### 2.1. Initial Load (OPTIMIZED)
0ms     ✅ Map page renders immediately (no LoadingProvider delay)
100ms   ✅ MapView mounts
200ms   ✅ MapLibre initializes
300ms   ✅ onBoundsChange fires
300ms   🔄 Load tiles for current viewport
400ms   ✅ Tiles loaded from static files
500ms   ✅ Markers rendered (GPS + CRMLS)

**Total time to functional map: ~500ms** (was 3.5s before optimization)

### 2.2. Tile-Based Loading (NEW)
- Zoom level determines tile granularity
- Pre-generated tiles served from `public/tiles/`
- Deduplication at client (same listing in multiple tiles)
- No API calls during pan/zoom (instant response)

### 2.3. MLS Source Distribution
- GPS listings: ~70% of total
- CRMLS listings: ~30% of total
- Both visible on map with `mlsSource` attribution
```

---

### 1.F.2. Files to CREATE

#### `TILE_REGENERATION_GUIDE.md` (NEW)
**Purpose:** Step-by-step guide for regenerating tiles
**Complete Content:**

```markdown
# Tile Regeneration Guide

## When to Regenerate Tiles

Regenerate tiles whenever:
1. New listings added to either GPS or CRMLS collections
2. Listing data updated (price changes, status changes)
3. Schema changes affect tile properties
4. Weekly maintenance (recommended)

---

## Prerequisites

1. Both MongoDB collections populated:
   - `listings` (GPS) - check `db.listings.countDocuments()`
   - `crmls_listings` (CRMLS) - check `db.crmls_listings.countDocuments()`

2. Node.js environment configured
3. Sufficient disk space (~500MB for tiles)

---

## Step-by-Step Process

### Step 1: Connect to Production Database

```bash
# Set MongoDB connection string
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
```

### Step 2: Run Tile Generator

```bash
cd src/scripts/mls/map
npx tsx generate-map-tiles.ts
```

### Step 3: Verify Output

Expected console output:
```
🔄 Fetching listings from both GPS and CRMLS...
✅ Fetched 15000 total listings
🔄 Creating GeoJSON features...
🔄 Generating tiles with Supercluster...
🔄 Writing tiles to disk...
✅ Generated 22485 tiles
✅ GPS listings: 10500
✅ CRMLS listings: 4500
✅ Total unique listings: 15000
✅ Tile generation complete!
```

### Step 4: Validate Tile Content

```bash
# Check random tile has mlsSource
cat public/tiles/10/175/407.json | grep mlsSource
```

Should see:
```json
"mlsSource": "GPS"
"mlsSource": "CRMLS"
```

### Step 5: Deploy Tiles

```bash
# Commit and push to production
git add public/tiles/
git commit -m "chore: regenerate map tiles with dual MLS data"
git push origin main
```

### Step 6: Verify in Production

1. Visit `/map`
2. Zoom to level 13+
3. Check console for tile loading logs
4. Verify GPS and CRMLS listings both visible

---

## Troubleshooting

### Problem: "Fetched 0 total listings"
**Cause:** MongoDB connection failed or collections empty
**Fix:** Check `MONGODB_URI` and verify collections exist

### Problem: "GPS listings: 0"
**Cause:** GPS collection missing or no coordinates
**Fix:** Run GPS seed script: `python src/scripts/mls/backend/seed.py`

### Problem: "CRMLS listings: 0"
**Cause:** CRMLS collection missing or no coordinates
**Fix:** Run CRMLS seed script: `python src/scripts/mls/backend/crmls/seed.py`

### Problem: Tiles missing mlsSource
**Cause:** Old tile generator code
**Fix:** Pull latest `generate-map-tiles.ts` from main branch

---

## Maintenance Schedule

| Frequency | Task | Command |
|-----------|------|---------|
| Daily | Check tile freshness | `ls -lt public/tiles/13/` |
| Weekly | Regenerate tiles | `npx tsx generate-map-tiles.ts` |
| Monthly | Audit tile coverage | See GO/NO GO checklist |
| Quarterly | Full rebuild | Delete `public/tiles/` and regenerate |

---

## Performance Metrics

| Metric | Target | Command to Check |
|--------|--------|------------------|
| Total tiles | 20,000-25,000 | `find public/tiles -name "*.json" \| wc -l` |
| GPS listings | 8,000-12,000 | Check generator output |
| CRMLS listings | 3,000-6,000 | Check generator output |
| Tile size avg | 5-50KB | `du -sh public/tiles/` |
| Generation time | <5 minutes | Time the script |

---

## Emergency Rollback

If tiles cause issues:

```bash
# Restore from backup
git checkout HEAD~1 public/tiles/

# Or temporarily disable tile system
# Comment out tileLoader import in MapView.tsx
# Revert to bounds-based API
```
```

**Reason:** Operational guide for engineering team

---

## 1.G. Summary: Files Changed

### Modified Files (15)
1. `src/scripts/mls/backend/seed.py` - Add mlsSource to GPS
2. `src/scripts/mls/backend/crmls/seed.py` - Add field normalization
3. `src/scripts/mls/map/generate-map-tiles.ts` - Dual collection tiles
4. `src/app/api/chat/search-listings/route.ts` - Dual collection query
5. `src/app/api/cma/generate/route.ts` - Dual collection comparables
6. `src/app/api/subdivisions/[slug]/listings/route.ts` - Dual collection
7. `src/app/api/cities/[cityId]/stats/route.ts` - Verify merge math
8. `src/app/components/LoadingProvider.tsx` - Skip map page delay
9. `src/app/components/mls/MLSProvider.tsx` - Defer prefetching
10. `src/app/components/mls/map/MapView.tsx` - Use tiles, remove Supercluster
11. `src/app/utils/map/useListings.ts` - Load from tiles
12. `src/app/map/page.tsx` - Lower bounds threshold
13. `src/models/Listing.ts` - Add mlsSource field
14. `src/models/CRMLSListing.ts` - Add normalized field aliases
15. `LISTING_DATA_GLOBAL_ARCHITECTURE.md` - Document integration

### Created Files (3)
1. `src/app/api/tiles/[z]/[x]/[y]/route.ts` - Tile serving endpoint
2. `src/lib/listing-normalizer.ts` - Centralized field normalization
3. `TILE_REGENERATION_GUIDE.md` - Operational documentation

### Deleted Files (0)
None - maintain backward compatibility

---

# 2. COMMIT-BY-COMMIT GIT RECONSTRUCTION

## Overview

**Total Commits:** 12
**Total Phases:** 4
**Timeline:** 4 weeks
**Strategy:** Each commit keeps system deployable

---

## PHASE 1: BACKEND FOUNDATION (Week 1)

### Commit 1: Add mlsSource to GPS ingestion seed
**Branch:** `fix/gps-mls-source`
**Files Changed:** 1
**Breaking:** ❌ No

```bash
git checkout -b fix/gps-mls-source

# Modify seed.py
# Add line: raw["mlsSource"] = "GPS"

git add src/scripts/mls/backend/seed.py
git commit -m "fix(ingestion): add mlsSource field to GPS seed script

- Add mlsSource: GPS to all GPS listings during ingestion
- Matches CRMLS pattern (already has mlsSource)
- Enables dual-MLS queries and analytics
- Backward compatible (doesn't break existing data)

Related: #123"
```

**Validation:**
```bash
# Run seed script
python src/scripts/mls/backend/seed.py

# Check MongoDB
db.listings.findOne({}, { mlsSource: 1 })
# Should return: { mlsSource: "GPS" }
```

**Deploy:** ✅ Safe (only affects new listings, doesn't break existing queries)

---

### Commit 2: Add field normalization to CRMLS seed
**Branch:** `fix/gps-mls-source` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify crmls/seed.py
# Add normalized field aliases

git add src/scripts/mls/backend/crmls/seed.py
git commit -m "fix(ingestion): add normalized field aliases to CRMLS seed

- Map bedroomsTotal → bedsTotal
- Map bathsTotal → bathroomsTotalInteger
- Keep original fields for backward compatibility
- Enables unified query logic across GPS/CRMLS

Related: #123"
```

**Validation:**
```bash
python src/scripts/mls/backend/crmls/seed.py

db.crmls_listings.findOne({}, { bedsTotal: 1, bedroomsTotal: 1 })
# Should return both fields
```

**Deploy:** ✅ Safe (additive changes only)

---

### Commit 3: Add mlsSource field to Listing model
**Branch:** `fix/gps-mls-source` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/models/Listing.ts
# Add mlsSource field with default

git add src/models/Listing.ts
git commit -m "feat(models): add mlsSource field to Listing schema

- Add mlsSource enum field (GPS | CRMLS)
- Default to GPS for backward compatibility
- Add indexes for query performance
- Non-breaking change (field optional)

Related: #123"
```

**Validation:**
```bash
# No validation needed (schema change, no data migration)
```

**Deploy:** ✅ Safe (optional field with default)

---

### Commit 4: Add normalized field aliases to CRMLS model
**Branch:** `fix/gps-mls-source` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/models/CRMLSListing.ts
# Add bedsTotal, bathroomsTotalInteger aliases

git add src/models/CRMLSListing.ts
git commit -m "feat(models): add normalized field aliases to CRMLS schema

- Add bedsTotal as alias for bedroomsTotal
- Add bathroomsTotalInteger as alias for bathsTotal
- Keep original fields (non-breaking)
- Enables unified queries

Related: #123"
```

**Deploy:** ✅ Safe (additive schema changes)

---

### Commit 5: Merge Phase 1 to main
```bash
git checkout main
git merge fix/gps-mls-source
git push origin main
```

**Status Check:**
- ✅ GPS listings have mlsSource
- ✅ CRMLS listings have normalized fields
- ✅ Models support dual schema
- ✅ No breaking changes
- ✅ System fully deployable

---

## PHASE 2: TILE SYSTEM REBUILD (Week 2)

### Commit 6: Rebuild tile generator with dual MLS support
**Branch:** `feat/dual-mls-tiles`
**Files Changed:** 1
**Breaking:** ❌ No (tiles are static assets)

```bash
git checkout -b feat/dual-mls-tiles

# Complete rewrite of generate-map-tiles.ts
# (See file-by-file plan above for full code)

git add src/scripts/mls/map/generate-map-tiles.ts
git commit -m "feat(tiles): rebuild tile generator with dual MLS support

- Query both GPS and CRMLS collections
- Normalize field names during tile generation
- Include mlsSource in tile properties
- Generate tiles for zoom levels 0-13
- Output includes MLS distribution stats

Changes:
- Import both Listing and CRMLSListing models
- Merge listings with field normalization
- Preserve mlsSource in tile features
- Add cluster reduce to track MLS counts

Output example:
✅ Generated 22,485 tiles
✅ GPS listings: 10,500
✅ CRMLS listings: 4,500

Related: #124"
```

**Validation:**
```bash
# Generate tiles
cd src/scripts/mls/map
npx tsx generate-map-tiles.ts

# Check output
cat public/tiles/10/175/407.json | grep mlsSource
# Should show both "GPS" and "CRMLS"

# Verify tile count
find public/tiles -name "*.json" | wc -l
# Should be 20,000-25,000
```

**Deploy:** ✅ Safe (static files, doesn't affect runtime)

---

### Commit 7: Create listing normalizer utility
**Branch:** `feat/dual-mls-tiles` (same branch)
**Files Changed:** 1 (new file)
**Breaking:** ❌ No

```bash
# Create src/lib/listing-normalizer.ts
# (See file-by-file plan above for full code)

git add src/lib/listing-normalizer.ts
git commit -m "feat(utils): add centralized listing field normalizer

- Create NormalizedListing interface
- Implement normalizeGPSListing()
- Implement normalizeCRMLSListing()
- Implement normalizeListings() with deduplication
- DRY principle for field mapping logic

Usage:
const normalized = normalizeListings(gpsData, crmlsData);

Related: #124"
```

**Deploy:** ✅ Safe (new utility, no consumers yet)

---

### Commit 8: Create tile serving API endpoint
**Branch:** `feat/dual-mls-tiles` (same branch)
**Files Changed:** 1 (new file)
**Breaking:** ❌ No

```bash
# Create src/app/api/tiles/[z]/[x]/[y]/route.ts
# (See file-by-file plan above for full code)

git add src/app/api/tiles/[z]/[x]/[y]/route.ts
git commit -m "feat(api): add tile serving endpoint for pre-generated tiles

- Create dynamic route /api/tiles/:z/:x/:y
- Serve GeoJSON tiles from public/tiles/
- Add caching headers (24h immutable)
- Return empty FeatureCollection for missing tiles
- Validate tile coordinates (z: 0-13)

Example: GET /api/tiles/10/175/407
Returns: { type: \"FeatureCollection\", features: [...] }

Related: #124"
```

**Validation:**
```bash
# Start dev server
npm run dev

# Test tile endpoint
curl http://localhost:3000/api/tiles/10/175/407 | jq '.features | length'
# Should return number > 0

# Test invalid tile (returns empty)
curl http://localhost:3000/api/tiles/10/999/999 | jq '.features | length'
# Should return 0
```

**Deploy:** ✅ Safe (new endpoint, no existing consumers)

---

### Commit 9: Add tile regeneration guide
**Branch:** `feat/dual-mls-tiles` (same branch)
**Files Changed:** 1 (new file)
**Breaking:** ❌ No

```bash
# Create TILE_REGENERATION_GUIDE.md
# (See file-by-file plan above for full content)

git add TILE_REGENERATION_GUIDE.md
git commit -m "docs: add tile regeneration operational guide

- Document when to regenerate tiles
- Step-by-step regeneration process
- Troubleshooting common issues
- Maintenance schedule
- Performance metrics
- Emergency rollback procedure

Related: #124"
```

**Deploy:** ✅ Safe (documentation only)

---

### Commit 10: Merge Phase 2 to main
```bash
git checkout main
git merge feat/dual-mls-tiles
git push origin main

# Generate production tiles
npx tsx src/scripts/mls/map/generate-map-tiles.ts

# Commit tiles
git add public/tiles/
git commit -m "chore: regenerate map tiles with dual MLS data (22,485 tiles)"
git push origin main
```

**Status Check:**
- ✅ Tile generator queries both MLSs
- ✅ Tiles include mlsSource field
- ✅ Tile serving endpoint live
- ✅ 20,000+ tiles generated
- ✅ System fully deployable (tiles not yet used by frontend)

---

## PHASE 3: FRONTEND INTEGRATION (Week 3)

### Commit 11: Integrate tile system into MapView
**Branch:** `feat/tile-integration`
**Files Changed:** 3
**Breaking:** ❌ No (feature flag approach)

```bash
git checkout -b feat/tile-integration

# Modify:
# - src/app/components/mls/map/MapView.tsx (use tiles)
# - src/app/utils/map/useListings.ts (load from tiles)
# - src/app/map/page.tsx (lower bounds threshold)

git add src/app/components/mls/map/MapView.tsx \
       src/app/utils/map/useListings.ts \
       src/app/map/page.tsx

git commit -m "feat(map): integrate pre-generated tile system

MapView.tsx:
- Import loadTilesForView from tileLoader
- Remove client-side Supercluster clustering
- Load tiles on viewport change
- Render markers from tile features
- Support both clusters and individual markers

useListings.ts:
- Replace bounds API with tile loading
- Convert tile features to MapListing format
- Include mlsSource from tiles

page.tsx:
- Lower bounds change threshold from 20% to 5%
- Remove unnecessary resize dispatch
- Load tiles on every zoom level change

Performance improvement:
- 10-20x faster than bounds API
- 40x less network traffic
- Instant pan/zoom response

Related: #125"
```

**Validation:**
```bash
npm run dev

# Visit http://localhost:3000/map
# Open DevTools console
# Should see: "Loading tiles for zoom X..."
# Should see: "Loaded N features from M tiles"

# Test zoom levels:
# - Zoom 8: Clusters only
# - Zoom 11: Mix of clusters + markers
# - Zoom 13+: All individual markers

# Check network tab: No /api/mls-listings calls during pan/zoom
```

**Deploy:** ✅ Safe (map still renders, now using tiles)

---

### Commit 12: Fix LoadingProvider artificial delay
**Branch:** `feat/tile-integration` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/app/components/LoadingProvider.tsx

git add src/app/components/LoadingProvider.tsx
git commit -m "fix(loading): skip LoadingProvider delay for map pages

- Detect map pages with usePathname
- Skip 1.5s globe loader for /map routes
- Map has its own MapGlobeLoader (no double loader)
- Keep globe for home page (branding)
- All other pages: no artificial delay

Performance impact:
- Map loads 1.5s faster (43% improvement)
- Total map load time: 3.5s → 2.0s

Related: #125"
```

**Deploy:** ✅ Safe (reduces delay, no breaking changes)

---

### Commit 13: Defer MLSProvider prefetching
**Branch:** `feat/tile-integration` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/app/components/mls/MLSProvider.tsx

git add src/app/components/mls/MLSProvider.tsx
git commit -m "perf(mls): defer prefetching on map pages

- Skip prefetch on map pages (wait for user interaction)
- Defer prefetch by 2 seconds on other pages
- Reduce prefetch count from 5 to 3 listings
- Prevents API flood during map load

Impact:
- Reduces concurrent API calls from 9 to 0-3
- Map tiles load without network contention
- Prefetch still works for detail pages

Related: #125"
```

**Deploy:** ✅ Safe (improves performance, no functionality lost)

---

### Commit 14: Merge Phase 3 to main
```bash
git checkout main
git merge feat/tile-integration
git push origin main
```

**Status Check:**
- ✅ Map uses tile system (not bounds API)
- ✅ No artificial loading delays
- ✅ Reduced prefetch overhead
- ✅ 60% faster map load time
- ✅ System fully deployable

---

## PHASE 4: API DUAL-MLS INTEGRATION (Week 4)

### Commit 15: Update chat search to query both MLSs
**Branch:** `feat/dual-mls-apis`
**Files Changed:** 1
**Breaking:** ❌ No

```bash
git checkout -b feat/dual-mls-apis

# Modify src/app/api/chat/search-listings/route.ts

git add src/app/api/chat/search-listings/route.ts
git commit -m "feat(api): enable dual MLS queries in chat search

- Query both GPS and CRMLS collections
- Use listing-normalizer for field mapping
- Deduplicate results by listingKey
- Include mlsSource in response

Impact:
- Chat search now returns 100% of available listings
- Previously excluded all GPS listings
- No breaking changes to response format

Example response:
{
  listings: [
    { id: \"123\", mlsSource: \"GPS\", ... },
    { id: \"456\", mlsSource: \"CRMLS\", ... }
  ]
}

Related: #126"
```

**Validation:**
```bash
# Test chat search
curl -X POST http://localhost:3000/api/chat/search-listings \
  -H "Content-Type: application/json" \
  -d '{"city": "Palm Desert", "minPrice": 500000, "maxPrice": 1000000}' \
  | jq '.listings | group_by(.mlsSource) | map({mls: .[0].mlsSource, count: length})'

# Should return:
# [
#   { "mls": "GPS", "count": 15 },
#   { "mls": "CRMLS", "count": 8 }
# ]
```

**Deploy:** ✅ Safe (additive change, no breaking response format)

---

### Commit 16: Update CMA to query both MLSs
**Branch:** `feat/dual-mls-apis` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/app/api/cma/generate/route.ts

git add src/app/api/cma/generate/route.ts
git commit -m "feat(api): enable dual MLS queries in CMA generation

- Query both GPS and CRMLS for subject listing
- Query both collections for comparables
- Normalize field names for unified scoring
- Add same-MLS bonus to scoring algorithm
- Include mlsSource in comparable metadata

Impact:
- CMA comparables pool 2-3x larger
- More accurate valuation analysis
- Previously excluded all CRMLS comparables

Scoring changes:
- Same MLS as subject: -0.05 score bonus
- Still prioritizes distance, price, bed/bath match

Related: #126"
```

**Validation:**
```bash
# Test CMA generation
curl http://localhost:3000/api/cma/generate?listingKey=CA123456 \
  | jq '.comparables | length'
# Should return 8-10

curl http://localhost:3000/api/cma/generate?listingKey=CA123456 \
  | jq '.comparables | map(.mlsSource) | unique'
# Should return: ["GPS", "CRMLS"]
```

**Deploy:** ✅ Safe (improves CMA accuracy, no breaking changes)

---

### Commit 17: Update subdivision listings API
**Branch:** `feat/dual-mls-apis` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/app/api/subdivisions/[slug]/listings/route.ts

git add src/app/api/subdivisions/[slug]/listings/route.ts
git commit -m "feat(api): enable dual MLS queries in subdivision listings

- Query both GPS and CRMLS collections
- Match subdivision by name (case-insensitive, slug-aware)
- Normalize fields and deduplicate
- Sort by price (high to low)
- Include mlsSource in results

Impact:
- Subdivision pages show complete listing inventory
- Previously missed GPS listings in CRMLS subdivisions
- No UI changes needed

Related: #126"
```

**Deploy:** ✅ Safe (more complete data, no breaking changes)

---

### Commit 18: Verify city stats API dual MLS logic
**Branch:** `feat/dual-mls-apis` (same branch)
**Files Changed:** 1
**Breaking:** ❌ No

```bash
# Modify src/app/api/cities/[cityId]/stats/route.ts
# (Verify existing merge logic is correct)

git add src/app/api/cities/[cityId]/stats/route.ts
git commit -m "fix(api): verify and document city stats dual MLS merge

- Confirm both GPS and CRMLS are queried
- Verify weighted average math for merged stats
- Add comments explaining merge algorithm
- Track MLS distribution (gpsCount, crmlsCount)
- No functional changes (already correct)

Stats output:
{
  propertyType: \"Single Family\",
  totalCount: 150,
  gpsCount: 100,
  crmlsCount: 50,
  avgPrice: 750000,
  ...
}

Related: #126"
```

**Deploy:** ✅ Safe (verification + documentation)

---

### Commit 19: Update architecture documentation
**Branch:** `feat/dual-mls-apis` (same branch)
**Files Changed:** 2
**Breaking:** ❌ No

```bash
# Modify:
# - LISTING_DATA_GLOBAL_ARCHITECTURE.md
# - LISTING_DATA_END_TO_END_FLOW.md

git add LISTING_DATA_GLOBAL_ARCHITECTURE.md \
       LISTING_DATA_END_TO_END_FLOW.md

git commit -m "docs: update architecture docs with tile integration status

LISTING_DATA_GLOBAL_ARCHITECTURE.md:
- Add section 8: Tile System Integration
- Document dual MLS tile generation
- Update API endpoint dual-MLS status
- Mark tile system as ACTIVE

LISTING_DATA_END_TO_END_FLOW.md:
- Update Map View Flow with optimized timeline
- Document tile-based loading (was bounds-based)
- Show MLS source distribution stats
- Update load time: 3.5s → 0.5s

Related: #126"
```

**Deploy:** ✅ Safe (documentation only)

---

### Commit 20: Merge Phase 4 to main (FINAL)
```bash
git checkout main
git merge feat/dual-mls-apis
git push origin main
```

**Status Check:**
- ✅ All APIs query both GPS and CRMLS
- ✅ Chat search includes both MLSs
- ✅ CMA uses dual collection comparables
- ✅ Subdivision pages complete
- ✅ City stats accurate
- ✅ Documentation up to date
- ✅ System fully deployed

---

## Git Commit Summary

| Phase | Commits | Branches | Files Changed | Breaking |
|-------|---------|----------|---------------|----------|
| 1 | 1-5 | fix/gps-mls-source | 4 | ❌ No |
| 2 | 6-10 | feat/dual-mls-tiles | 4 (3 new) | ❌ No |
| 3 | 11-14 | feat/tile-integration | 4 | ❌ No |
| 4 | 15-20 | feat/dual-mls-apis | 6 | ❌ No |
| **Total** | **20** | **3** | **18 unique** | **❌ No** |

---

# 3. STEP-ORDER WHERE NOTHING BREAKS

## 3.1. Deployment Strategy

**Principle:** System must remain online and deployable after EVERY single commit.

**Validation:** After each commit:
1. Run build: `npm run build` (must succeed)
2. Run type check: `npx tsc --noEmit` (must pass)
3. Test critical path: Visit `/map`, search via chat, view subdivision
4. Check console: No errors
5. Verify backward compatibility: Old data still works

---

## 3.2. Safe Deployment Order

### Week 1: Backend Foundation (Non-Breaking)

**Day 1-2: Ingestion Scripts**
```bash
# Commit 1: Add mlsSource to GPS seed
python src/scripts/mls/backend/seed.py  # Run once
# ✅ Safe: Only affects NEW listings, old listings still work

# Commit 2: Add field normalization to CRMLS seed
python src/scripts/mls/backend/crmls/seed.py  # Run once
# ✅ Safe: Additive fields, original fields preserved
```

**Day 3-4: Model Updates**
```bash
# Commit 3: Add mlsSource to Listing model
# ✅ Safe: Optional field with default value

# Commit 4: Add normalized aliases to CRMLS model
# ✅ Safe: Additive schema, no data migration needed
```

**Day 5: Merge and Deploy**
```bash
# Commit 5: Merge Phase 1 to main
git push origin main
# Deploy to production
# ✅ Safe: All changes backward compatible
```

**Validation After Week 1:**
- [ ] New GPS listings have mlsSource: "GPS"
- [ ] New CRMLS listings have bedsTotal field
- [ ] Old listings still query correctly
- [ ] No console errors
- [ ] Build passes

---

### Week 2: Tile System (Static Assets)

**Day 1-2: Tile Generator**
```bash
# Commit 6: Rebuild tile generator
# ✅ Safe: Script changes, doesn't affect runtime

# Generate new tiles locally
npx tsx src/scripts/mls/map/generate-map-tiles.ts
# ✅ Safe: Static files, not used by frontend yet
```

**Day 3: Utilities and API**
```bash
# Commit 7: Create listing normalizer
# ✅ Safe: New utility, no consumers yet

# Commit 8: Create tile serving API
# ✅ Safe: New endpoint, no existing consumers

# Commit 9: Add tile regeneration guide
# ✅ Safe: Documentation only
```

**Day 4-5: Merge and Deploy Tiles**
```bash
# Commit 10: Merge Phase 2 to main
git push origin main

# Generate production tiles
npx tsx src/scripts/mls/map/generate-map-tiles.ts

# Commit tiles to repo
git add public/tiles/
git commit -m "chore: regenerate map tiles"
git push origin main

# ✅ Safe: Tiles available but not used by frontend
```

**Validation After Week 2:**
- [ ] 20,000+ tiles generated
- [ ] Tiles contain mlsSource field
- [ ] Tile API endpoint responds correctly
- [ ] Map still works (using old bounds API)
- [ ] No breaking changes

---

### Week 3: Frontend Integration (Gradual Rollout)

**Day 1-2: Map Component**
```bash
# Commit 11: Integrate tile system into MapView

# Test locally first
npm run dev
# Visit http://localhost:3000/map
# ✅ Verify: Map renders with tiles
# ✅ Verify: Zoom levels work (clusters → markers)
# ✅ Verify: Pan/zoom fast (no API calls)
```

**Day 3: Performance Fixes**
```bash
# Commit 12: Fix LoadingProvider delay
# ✅ Safe: Reduces delay, no functionality removed

# Commit 13: Defer MLSProvider prefetching
# ✅ Safe: Prefetch still works, just deferred
```

**Day 4-5: Merge and Deploy**
```bash
# Commit 14: Merge Phase 3 to main
git push origin main

# Monitor production
# ✅ Check: Map load time reduced
# ✅ Check: No errors in Sentry
# ✅ Check: Tile API latency < 50ms
```

**Rollback Plan (if needed):**
```bash
# If issues arise, temporarily revert MapView.tsx
git revert HEAD~3  # Revert commits 11-13
git push origin main
# Map falls back to bounds API (still works)
```

**Validation After Week 3:**
- [ ] Map loads in < 2 seconds
- [ ] Tiles render correctly at all zoom levels
- [ ] No LoadingProvider delay on /map
- [ ] Prefetching doesn't block map load
- [ ] Build passes

---

### Week 4: API Dual-MLS Integration (High Value)

**Day 1-2: Chat Search**
```bash
# Commit 15: Update chat search API

# Test locally
curl -X POST http://localhost:3000/api/chat/search-listings \
  -H "Content-Type: application/json" \
  -d '{"city": "Palm Desert"}'
# ✅ Verify: Results include both GPS and CRMLS
# ✅ Verify: mlsSource field present
```

**Day 3: CMA**
```bash
# Commit 16: Update CMA API

# Test locally
curl http://localhost:3000/api/cma/generate?listingKey=CA123456
# ✅ Verify: Comparables from both MLSs
# ✅ Verify: More comparables than before
```

**Day 4: Subdivision and City**
```bash
# Commit 17: Update subdivision API
# ✅ Safe: More complete listings

# Commit 18: Verify city stats API
# ✅ Safe: Documentation + verification
```

**Day 5: Documentation and Deploy**
```bash
# Commit 19: Update architecture docs
# ✅ Safe: Documentation only

# Commit 20: Merge Phase 4 to main
git push origin main
```

**Validation After Week 4:**
- [ ] Chat returns listings from both MLSs
- [ ] CMA has 2-3x more comparables
- [ ] Subdivision pages complete
- [ ] City stats accurate
- [ ] Documentation current

---

## 3.3. Backward Compatibility Matrix

| Component | Old Behavior | New Behavior | Breaking? |
|-----------|-------------|--------------|-----------|
| GPS Listings | No mlsSource | mlsSource: "GPS" | ❌ No (additive) |
| CRMLS Listings | bedroomsTotal | bedroomsTotal + bedsTotal | ❌ No (alias) |
| Map Load | Bounds API | Tile API | ❌ No (faster, same output) |
| Chat Search | CRMLS only | GPS + CRMLS | ❌ No (more results) |
| CMA | GPS only | GPS + CRMLS | ❌ No (better analysis) |
| LoadingProvider | 1.5s delay | 0s for /map | ❌ No (faster) |
| MLSProvider | Prefetch x5 | Prefetch x3 | ❌ No (less spam) |

**Conclusion:** ZERO breaking changes across all 20 commits.

---

## 3.4. Rollback Strategy (Per Phase)

### Phase 1 Rollback
```bash
# If ingestion breaks:
git revert <commit-1-to-5>
git push origin main

# Data: Run old seed scripts (no mlsSource)
# Impact: New listings lack mlsSource, but queries still work
```

### Phase 2 Rollback
```bash
# If tiles corrupt:
rm -rf public/tiles/
git checkout HEAD~1 public/tiles/  # Restore old tiles

# OR: Delete tiles entirely (frontend not using them yet)
```

### Phase 3 Rollback
```bash
# If map breaks:
git revert <commit-11-to-14>
git push origin main

# Impact: Map falls back to bounds API (slower but functional)
```

### Phase 4 Rollback
```bash
# If APIs break:
git revert <commit-15-to-20>
git push origin main

# Impact: APIs revert to single-MLS queries (less data but functional)
```

---

## 3.5. Testing Checklist (Per Phase)

### After Phase 1 (Backend)
- [ ] Run GPS seed script: `python src/scripts/mls/backend/seed.py`
- [ ] Run CRMLS seed script: `python src/scripts/mls/backend/crmls/seed.py`
- [ ] Check MongoDB: `db.listings.findOne({}, {mlsSource: 1})`
- [ ] Verify: mlsSource field exists on new listings
- [ ] Check CRMLS: `db.crmls_listings.findOne({}, {bedsTotal: 1, bedroomsTotal: 1})`
- [ ] Verify: Both fields present
- [ ] Build: `npm run build` ✅
- [ ] Type check: `npx tsc --noEmit` ✅

### After Phase 2 (Tiles)
- [ ] Generate tiles: `npx tsx src/scripts/mls/map/generate-map-tiles.ts`
- [ ] Verify output: "✅ Generated 22,485 tiles"
- [ ] Check GPS count: "✅ GPS listings: 10,500"
- [ ] Check CRMLS count: "✅ CRMLS listings: 4,500"
- [ ] Inspect tile: `cat public/tiles/10/175/407.json | grep mlsSource`
- [ ] Verify: Both "GPS" and "CRMLS" present
- [ ] Test API: `curl http://localhost:3000/api/tiles/10/175/407`
- [ ] Verify: Returns GeoJSON FeatureCollection
- [ ] Build: `npm run build` ✅

### After Phase 3 (Frontend)
- [ ] Start dev: `npm run dev`
- [ ] Visit: `http://localhost:3000/map`
- [ ] Check console: "Loading tiles for zoom..."
- [ ] Zoom to level 13: All individual markers visible
- [ ] Pan map: New tiles load instantly
- [ ] Network tab: No /api/mls-listings calls during pan/zoom
- [ ] Check load time: < 2 seconds
- [ ] No LoadingProvider globe on /map page
- [ ] Build: `npm run build` ✅

### After Phase 4 (APIs)
- [ ] Test chat search:
  ```bash
  curl -X POST http://localhost:3000/api/chat/search-listings \
    -H "Content-Type: application/json" \
    -d '{"city": "Palm Desert"}' \
    | jq '.listings | group_by(.mlsSource) | map({mls: .[0].mlsSource, count: length})'
  ```
- [ ] Verify: Results include both GPS and CRMLS
- [ ] Test CMA:
  ```bash
  curl http://localhost:3000/api/cma/generate?listingKey=CA123456 \
    | jq '.comparables | map(.mlsSource) | unique'
  ```
- [ ] Verify: ["GPS", "CRMLS"]
- [ ] Test subdivision API: Visit subdivision page
- [ ] Verify: Listings from both MLSs
- [ ] Build: `npm run build` ✅

---

# 4. FINAL GO/NO GO CHECKLIST

## 4.1. Pre-Deployment Validation

### 4.1.1. Tile Count Verification

**Reddit Tile Count:** [Reference from user's previous testing]

```bash
# Count total tiles
find public/tiles -name "*.json" | wc -l
# ✅ Target: 20,000-25,000 tiles

# Count tiles per zoom level
for z in {0..13}; do
  count=$(find public/tiles/$z -name "*.json" 2>/dev/null | wc -l)
  echo "Zoom $z: $count tiles"
done

# ✅ Expected distribution:
# Zoom 0-5: Few tiles (world view)
# Zoom 6-10: Hundreds of tiles (regional)
# Zoom 11-13: Thousands of tiles (local)
```

**Go/No Go Criteria:**
- ✅ GO: 20,000-30,000 tiles generated
- ❌ NO GO: < 10,000 tiles (missing data)
- ❌ NO GO: > 50,000 tiles (duplication issue)

---

### 4.1.2. DB Completeness Verification

**GPS Collection:**
```bash
# Total GPS listings with coordinates
db.listings.countDocuments({
  latitude: { $exists: true, $ne: null },
  longitude: { $exists: true, $ne: null }
})
# ✅ Target: 8,000-12,000 listings

# GPS listings with mlsSource field
db.listings.countDocuments({ mlsSource: "GPS" })
# ✅ Target: Should match total above

# GPS listings missing mlsSource (old data)
db.listings.countDocuments({ mlsSource: { $exists: false } })
# ⚠️ Acceptable: Historical data may lack field
```

**CRMLS Collection:**
```bash
# Total CRMLS listings with coordinates
db.crmls_listings.countDocuments({
  latitude: { $exists: true, $ne: null },
  longitude: { $exists: true, $ne: null }
})
# ✅ Target: 3,000-6,000 listings

# CRMLS listings with mlsSource field
db.crmls_listings.countDocuments({ mlsSource: "CRMLS" })
# ✅ Target: Should match total above

# CRMLS listings with normalized fields
db.crmls_listings.countDocuments({ bedsTotal: { $exists: true } })
# ✅ Target: Should match total above
```

**Go/No Go Criteria:**
- ✅ GO: GPS count 8,000-12,000, CRMLS count 3,000-6,000
- ❌ NO GO: GPS < 5,000 (incomplete ingestion)
- ❌ NO GO: CRMLS < 1,000 (incomplete ingestion)
- ❌ NO GO: mlsSource coverage < 90% (re-run seeds)

---

### 4.1.3. Accuracy of Merged MLS Records

**Field Normalization Audit:**
```bash
# Sample GPS listing with normalized fields
db.listings.findOne(
  { bedsTotal: { $exists: true } },
  { bedsTotal: 1, bedroomsTotal: 1, bathroomsTotalInteger: 1, mlsSource: 1 }
)
# ✅ Expect: bedsTotal populated, mlsSource: "GPS"

# Sample CRMLS listing with both original and normalized fields
db.crmls_listings.findOne(
  { bedsTotal: { $exists: true } },
  { bedsTotal: 1, bedroomsTotal: 1, bathsTotal: 1, bathroomsTotalInteger: 1, mlsSource: 1 }
)
# ✅ Expect: Both bedsTotal AND bedroomsTotal populated, mlsSource: "CRMLS"
```

**Deduplication Check:**
```bash
# Check for duplicate listingKeys across collections
# (Should be rare - same property in both MLSs)

# GPS listingKeys
gps_keys=$(db.listings.distinct("listingKey"))

# CRMLS listingKeys
crmls_keys=$(db.crmls_listings.distinct("listingKey"))

# Intersection (duplicates)
# Should be < 1% of total
```

**Go/No Go Criteria:**
- ✅ GO: All GPS listings have bedsTotal (normalized)
- ✅ GO: All CRMLS listings have both bedsTotal and bedroomsTotal
- ✅ GO: Duplicate listingKeys < 1%
- ❌ NO GO: Normalized fields missing on > 10% of listings

---

### 4.1.4. Map Tile Coverage Accuracy

**Spatial Coverage Verification:**
```bash
# Check tiles cover Coachella Valley (primary service area)
# Bounding box: lat 33.4-34.0, lng -117.0 to -116.0

# Calculate which tiles should exist for zoom 10
# Using Web Mercator math:
# - Tile X range: 162-186
# - Tile Y range: 390-410

# Count tiles in coverage area
find public/tiles/10/ -name "*.json" | \
  awk -F'/' '{print $4, $5}' | \
  awk '$1 >= 162 && $1 <= 186 && $2 >= 390 && $2 <= 410' | \
  wc -l

# ✅ Target: 400-500 tiles for zoom 10 in Coachella Valley
```

**Listing Distribution Verification:**
```bash
# Sample random tile and check MLS distribution
cat public/tiles/10/175/407.json | \
  jq '.features | group_by(.properties.mlsSource) | map({mls: .[0].properties.mlsSource, count: length})'

# ✅ Expected output:
# [
#   { "mls": "GPS", "count": 35 },
#   { "mls": "CRMLS", "count": 15 }
# ]
# (Roughly 70% GPS, 30% CRMLS)
```

**Go/No Go Criteria:**
- ✅ GO: Tiles cover primary service area (Coachella Valley)
- ✅ GO: MLS distribution in tiles matches DB distribution (~70/30)
- ❌ NO GO: Large gaps in tile coverage (missing zoom levels)
- ❌ NO GO: Tiles only contain one MLS (generator bug)

---

### 4.1.5. Chat Search Correctness

**Dual MLS Query Test:**
```bash
# Test 1: Search by city (should return both MLSs)
curl -X POST http://localhost:3000/api/chat/search-listings \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Palm Desert",
    "minPrice": 500000,
    "maxPrice": 1000000
  }' | jq '{
    total: .listings | length,
    gps: [.listings[] | select(.mlsSource == "GPS")] | length,
    crmls: [.listings[] | select(.mlsSource == "CRMLS")] | length
  }'

# ✅ Expected: { total: 23, gps: 15, crmls: 8 }
# ❌ FAIL: crmls: 0 (API not updated)
# ❌ FAIL: gps: 0 (API broken)
```

**Field Normalization Test:**
```bash
# Test 2: Verify normalized fields in response
curl -X POST http://localhost:3000/api/chat/search-listings \
  -H "Content-Type: application/json" \
  -d '{"city": "Rancho Mirage"}' | \
  jq '.listings[0] | {beds, baths, mlsSource}'

# ✅ Expected: { beds: 3, baths: 2, mlsSource: "GPS" }
# (Not bedroomsTotal or bathsTotal)
```

**Go/No Go Criteria:**
- ✅ GO: Chat search returns listings from BOTH MLSs
- ✅ GO: Response includes mlsSource field
- ✅ GO: Fields normalized (beds, baths, not bedroomsTotal)
- ❌ NO GO: Only one MLS returned
- ❌ NO GO: mlsSource field missing

---

### 4.1.6. Listing Parity Verification

**City Page Listing Count:**
```bash
# Test: Visit city page (e.g., Palm Desert)
# Count listings displayed

# API test
curl http://localhost:3000/api/cities/palm-desert/listings | \
  jq '{
    total: .listings | length,
    gps: [.listings[] | select(.mlsSource == "GPS")] | length,
    crmls: [.listings[] | select(.mlsSource == "CRMLS")] | length
  }'

# ✅ Expected: Roughly 70% GPS, 30% CRMLS
```

**Subdivision Page Listing Count:**
```bash
# Test: Visit subdivision page (e.g., Palm Desert Country Club)
curl http://localhost:3000/api/subdivisions/palm-desert-country-club/listings | \
  jq '{
    total: .listings | length,
    mlsSources: [.listings[].mlsSource] | unique
  }'

# ✅ Expected: { total: 12, mlsSources: ["GPS", "CRMLS"] }
# (Both MLSs if subdivision crosses MLS boundaries)
```

**Go/No Go Criteria:**
- ✅ GO: City pages show listings from both MLSs
- ✅ GO: Subdivision pages show listings from both MLSs
- ✅ GO: Total listing count matches DB count
- ❌ NO GO: One MLS missing from any page

---

### 4.1.7. CMA Accuracy Audit

**Comparable Count Increase:**
```bash
# Test: Generate CMA for sample listing
curl http://localhost:3000/api/cma/generate?listingKey=CA123456 | \
  jq '{
    subjectMLS: .subject.mlsSource,
    comparableCount: .comparables | length,
    mlsDistribution: .comparables | group_by(.mlsSource) | map({mls: .[0].mlsSource, count: length})
  }'

# ✅ Expected output:
# {
#   "subjectMLS": "GPS",
#   "comparableCount": 10,
#   "mlsDistribution": [
#     { "mls": "GPS", "count": 6 },
#     { "mls": "CRMLS", "count": 4 }
#   ]
# }
```

**Scoring Verification:**
```bash
# Test: Verify same-MLS bonus is applied
curl http://localhost:3000/api/cma/generate?listingKey=CA123456 | \
  jq '.comparables | sort_by(.score) | .[0:3] | map({listingKey, mlsSource, score})'

# ✅ Expected: Top comparables include both MLSs
# ✅ Expected: Same-MLS comps have slightly lower scores (bonus applied)
```

**Go/No Go Criteria:**
- ✅ GO: CMA returns comparables from both MLSs
- ✅ GO: Comparable count increased by 50-100% vs old system
- ✅ GO: Same-MLS bonus visible in scoring
- ❌ NO GO: Only one MLS in comparables
- ❌ NO GO: Comparable count same as before (API not updated)

---

## 4.2. Performance Benchmarks

### 4.2.1. Map Load Time

**Before Optimization:**
- Home page → Map navigation: ~3.5 seconds
- Direct /map visit: ~3.5 seconds

**After Optimization:**
- Home page → Map navigation: < 1.0 seconds (tiles preloaded)
- Direct /map visit: < 2.0 seconds (no LoadingProvider delay)

**Test:**
```bash
# Use browser DevTools Performance tab
# 1. Clear cache
# 2. Visit http://localhost:3000/map
# 3. Measure "Time to Interactive"

# ✅ Target: < 2000ms
# ❌ FAIL: > 3000ms (optimization not working)
```

**Go/No Go Criteria:**
- ✅ GO: Map loads in < 2 seconds (direct visit)
- ✅ GO: Map loads in < 1 second (from home page)
- ❌ NO GO: Load time > 3 seconds (no improvement)

---

### 4.2.2. Tile API Latency

**Test:**
```bash
# Measure tile endpoint response time
time curl -s http://localhost:3000/api/tiles/10/175/407 > /dev/null

# ✅ Target: < 50ms (local)
# ✅ Target: < 200ms (production with CDN)
```

**Go/No Go Criteria:**
- ✅ GO: Tile API < 50ms local, < 200ms production
- ❌ NO GO: Tile API > 500ms (caching broken)

---

### 4.2.3. API Call Reduction

**Before (Bounds API):**
- Pan map: 1 API call per pan
- Zoom map: 1 API call per zoom level
- Load 1000 listings: ~40KB payload

**After (Tile System):**
- Pan map: 0-2 tile loads (cached)
- Zoom map: 0-5 tile loads (cached)
- Load 1000 listings: ~5KB total (tiles cached)

**Test:**
```bash
# 1. Open DevTools Network tab
# 2. Visit /map
# 3. Pan around for 30 seconds
# 4. Count /api/mls-listings calls

# ✅ Expected: 0 calls (tiles used)
# ❌ FAIL: > 5 calls (tile system not integrated)
```

**Go/No Go Criteria:**
- ✅ GO: Zero /api/mls-listings calls during pan/zoom
- ✅ GO: Only /api/tiles/ calls (cached)
- ❌ NO GO: Still calling /api/mls-listings (bounds API)

---

## 4.3. Data Integrity Checks

### 4.3.1. Photo Linkage Verification

**Test:**
```bash
# Verify photos collection links work for both MLSs

# GPS listing with photo
curl http://localhost:3000/api/mls-listings/gps-listing-slug | \
  jq '.photos | length'
# ✅ Expected: > 0 (photos found)

# CRMLS listing with photo
curl http://localhost:3000/api/mls-listings/crmls-listing-slug | \
  jq '.photos | length'
# ✅ Expected: > 0 (photos found)
```

**Go/No Go Criteria:**
- ✅ GO: Photos linked for both GPS and CRMLS listings
- ❌ NO GO: One MLS missing photos (linkage broken)

---

### 4.3.2. Slug Uniqueness

**Test:**
```bash
# Check for slug collisions across MLSs
db.listings.aggregate([
  { $group: { _id: "$slug", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
# ✅ Expected: [] (no duplicates within GPS)

db.crmls_listings.aggregate([
  { $group: { _id: "$slug", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
# ✅ Expected: [] (no duplicates within CRMLS)

# Cross-collection slug check
# (Rare: same property in both MLSs)
# Acceptable if < 1% overlap
```

**Go/No Go Criteria:**
- ✅ GO: No slug duplicates within each MLS
- ✅ GO: Cross-MLS slug overlap < 1%
- ❌ NO GO: Slug duplicates > 5% (data quality issue)

---

## 4.4. Final Decision Matrix

### 4.4.1. Critical GO Criteria (All Must Pass)

| # | Check | Target | Test | Status |
|---|-------|--------|------|--------|
| 1 | Tile count | 20,000-30,000 | `find public/tiles -name "*.json" \| wc -l` | [ ] |
| 2 | GPS DB completeness | 8,000-12,000 | `db.listings.countDocuments({latitude: {$exists: true}})` | [ ] |
| 3 | CRMLS DB completeness | 3,000-6,000 | `db.crmls_listings.countDocuments({latitude: {$exists: true}})` | [ ] |
| 4 | mlsSource coverage | > 90% | `db.listings.countDocuments({mlsSource: "GPS"})` | [ ] |
| 5 | Tile MLS distribution | ~70% GPS, ~30% CRMLS | Sample tile analysis | [ ] |
| 6 | Chat dual MLS | Both MLSs in response | POST /api/chat/search-listings | [ ] |
| 7 | CMA dual MLS | Both MLSs in comparables | GET /api/cma/generate | [ ] |
| 8 | Map load time | < 2 seconds | DevTools Performance | [ ] |
| 9 | Tile API latency | < 200ms | `time curl /api/tiles/10/175/407` | [ ] |
| 10 | Build success | No errors | `npm run build` | [ ] |

### 4.4.2. Important GO Criteria (Should Pass)

| # | Check | Target | Test | Status |
|---|-------|--------|------|--------|
| 11 | Field normalization | All listings | Sample DB queries | [ ] |
| 12 | Photo linkage | Both MLSs | API tests | [ ] |
| 13 | Subdivision dual MLS | Both MLSs | GET /api/subdivisions/{slug}/listings | [ ] |
| 14 | City dual MLS | Both MLSs | GET /api/cities/{id}/listings | [ ] |
| 15 | API call reduction | 0 bounds calls | DevTools Network tab | [ ] |
| 16 | Slug uniqueness | < 1% overlap | DB aggregation | [ ] |
| 17 | Type check | No errors | `npx tsc --noEmit` | [ ] |
| 18 | Console errors | None | Browser console | [ ] |

### 4.4.3. Optional GO Criteria (Nice to Have)

| # | Check | Target | Test | Status |
|---|-------|--------|------|--------|
| 19 | Tile cache hit rate | > 90% | CDN analytics | [ ] |
| 20 | CMA comp count increase | +50% | Compare old vs new | [ ] |
| 21 | Chat result count increase | +30% | Compare old vs new | [ ] |
| 22 | Lighthouse score | > 80 | Lighthouse audit | [ ] |

---

## 4.5. Final GO/NO GO Decision

### GO Decision Criteria:
✅ **ALL 10 critical checks pass**
✅ **At least 15/18 total checks pass**
✅ **Zero breaking changes in production**
✅ **Rollback plan tested and ready**

### NO GO Decision Criteria:
❌ **Any critical check fails**
❌ **< 12/18 total checks pass**
❌ **Breaking changes detected**
❌ **Rollback plan not tested**

---

## 4.6. Post-Deployment Monitoring

### Week 1 After Deploy:
- [ ] Monitor Sentry for errors (target: < 10 errors/day)
- [ ] Check tile API cache hit rate (target: > 90%)
- [ ] Verify map load time in production (target: < 2s)
- [ ] Monitor API response times (target: p95 < 500ms)
- [ ] Check user engagement metrics (map session duration)

### Week 2-4 After Deploy:
- [ ] Run GO/NO GO checklist again (verify sustained)
- [ ] Gather user feedback on map performance
- [ ] Audit chat search accuracy (user satisfaction)
- [ ] Review CMA accuracy vs external valuations
- [ ] Plan weekly tile regeneration schedule

---

## 4.7. Success Metrics

**Key Performance Indicators:**

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Map load time | 3.5s | < 2s | _____ |
| Tile API latency | N/A | < 200ms | _____ |
| Chat result count | 4,500 | 6,000+ | _____ |
| CMA comparable count | 6 | 10+ | _____ |
| API calls during pan/zoom | 20 | 0 | _____ |
| Listings with mlsSource | 30% | 100% | _____ |
| Total tile count | 0 (unused) | 22,000+ | _____ |

**User Experience Metrics:**

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Map session duration | 45s | 90s+ | _____ |
| Bounce rate on /map | 40% | < 20% | _____ |
| Chat search satisfaction | 70% | 85%+ | _____ |
| CMA downloads | 10/mo | 20/mo+ | _____ |

---

## 4.8. Final Sign-Off

**Engineering Lead:** _____________________ Date: _______
**Product Owner:** _____________________ Date: _______
**QA Lead:** _____________________ Date: _______

**Decision:** [ ] GO  [ ] NO GO

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

# END OF CODE-LEVEL IMPLEMENTATION PLAN

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Total Pages:** 50+
**Total Commits:** 20
**Total Files Modified:** 18
**Estimated Implementation Time:** 4 weeks
**Breaking Changes:** ZERO

---

**Next Steps:**
1. Review this plan with team
2. Create GitHub project with 20 issues (one per commit)
3. Assign issues to sprint backlog
4. Begin Phase 1 (Week 1)
5. Run GO/NO GO checklist after each phase
6. Deploy to production incrementally
7. Monitor and iterate

---

**Questions or Issues:**
Contact: Engineering Team
Slack: #mls-platform-rebuild
Jira: PROJECT-123
