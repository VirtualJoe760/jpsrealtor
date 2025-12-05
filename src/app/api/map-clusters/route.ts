// src/app/api/map-clusters/route.ts
// Server-side clustering API - Returns pre-aggregated clusters with accurate counts
// Uses MongoDB geospatial aggregation for performance

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import { City } from "@/models/cities";
import { County } from "@/models/counties";
import { REGION_BOUNDARIES } from "@/data/region-boundaries";
import { COUNTY_BOUNDARIES } from "@/data/county-boundaries";
import { CITY_BOUNDARIES } from "@/data/city-boundaries";

// AI Context for intent-aware clustering
interface MapRequestContext {
  source?: 'ai' | 'manual' | 'initial';
  intent?: 'explore' | 'specific_location' | 'filtered_search';
  expectedListingCount?: number;
  locationName?: string;
  locationType?: 'subdivision' | 'city' | 'county' | 'custom';
}

// Cluster grid sizes by zoom level (in degrees)
// Larger grid = fewer, more geographically focused clusters
// Based on Zillow/Redfin best practices for clear geographic grouping
function getClusterGridSize(zoom: number): number {
  if (zoom < 6) return 5.0;    // Regional - very large area (multiple states)
  if (zoom < 8) return 2.5;    // State level - group by major metro areas
  if (zoom < 10) return 1.0;   // Metro - group by cities/major areas
  if (zoom < 11) return 0.5;   // City - group by neighborhoods
  if (zoom < 12) return 0.25;  // Neighborhood - group by districts
  if (zoom < 13) return 0.1;   // Sub-neighborhood - smaller groups
  return 0.05;                 // Street-level (transition to listings)
}

// Context-aware clustering decision
// Respects AI intent to show specific locations without unnecessary clustering
function determineClusteringStrategy(
  zoom: number,
  context: MapRequestContext,
  actualListingCount: number
): boolean {
  console.log('🎯 Clustering decision context:', {
    zoom,
    source: context.source,
    intent: context.intent,
    expectedCount: context.expectedListingCount,
    actualCount: actualListingCount,
    locationName: context.locationName,
    locationType: context.locationType
  });

  // Rule 1: AI-driven specific location searches
  if (context.source === 'ai' && context.intent === 'specific_location') {
    // Show listings if count is reasonable
    const maxIndividualMarkers = 150;

    if (actualListingCount <= maxIndividualMarkers) {
      console.log(`✅ AI-driven search for ${context.locationName || 'location'} with ${actualListingCount} listings → SHOW LISTINGS`);
      return false; // Don't cluster
    }

    // Only cluster if there are MANY listings
    if (actualListingCount > maxIndividualMarkers) {
      console.log(`⚠️ AI-driven search but ${actualListingCount} listings (>${maxIndividualMarkers}) → SHOW CLUSTERS`);
      return true; // Cluster due to high density
    }
  }

  // Rule 2: Filtered searches (e.g., "4 bedroom homes under $800k")
  if (context.source === 'ai' && context.intent === 'filtered_search') {
    // Filtered searches usually have fewer results - show listings
    const maxForFiltered = 200;
    if (actualListingCount <= maxForFiltered) {
      console.log(`✅ AI-driven filtered search with ${actualListingCount} listings → SHOW LISTINGS`);
      return false; // Show listings
    }
  }

  // Rule 3: Manual exploration (user browsing map)
  if (context.source === 'manual') {
    // Hierarchical zoom strategy:
    // Zoom < 9: Counties
    // Zoom 9-11: Cities
    // Zoom 12+: Individual listings
    const shouldCluster = zoom < 12;
    console.log(`🖱️ Manual exploration at zoom ${zoom} → ${shouldCluster ? 'CLUSTERS' : 'LISTINGS'}`);
    return shouldCluster;
  }

  // Rule 4: Initial page load (no AI context yet)
  if (context.source === 'initial') {
    // Always cluster on initial load for performance
    console.log(`🏁 Initial load at zoom ${zoom} → SHOW CLUSTERS`);
    return true;
  }

  // Default: use hierarchical zoom-based decision
  // Zoom < 12: Show clusters (counties or cities)
  // Zoom 12+: Show individual listings
  const defaultDecision = zoom < 12;
  console.log(`🔄 Default clustering decision at zoom ${zoom} → ${defaultDecision ? 'CLUSTERS' : 'LISTINGS'}`);
  return defaultDecision;
}

// Legacy function - kept for backward compatibility
// Show listings at zoom 12+ for smoother UX
function shouldReturnClusters(zoom: number): boolean {
  return zoom < 12; // Below zoom 12, return clusters. At 12+, return individual listings
  // This matches industry standard (Zillow, Redfin) where users see listings at zoom 12
}

export async function GET(req: NextRequest) {
  await dbConnect();

  const url = req.nextUrl;
  const query = url.searchParams;

  // Get bounds and zoom
  const north = parseFloat(query.get("north") || "90");
  const south = parseFloat(query.get("south") || "-90");
  const east = parseFloat(query.get("east") || "180");
  const west = parseFloat(query.get("west") || "-180");
  const zoom = parseInt(query.get("zoom") || "8", 10);

  // Build base match stage for filtering
  const matchStage: Record<string, any> = {
    standardStatus: "Active",
    latitude: { $gte: south, $lte: north },
    longitude: { $gte: west, $lte: east },
    listPrice: { $ne: null, $gt: 0 },
  };

  // ==================== FILTERS ====================
  const listingType = query.get("listingType") || "sale";
  const propertyTypeCode =
    listingType === "rental" ? "B" :
    listingType === "multifamily" ? "C" :
    "A";
  matchStage.propertyType = propertyTypeCode;

  // Property type/subtype
  const queryPropertyType = query.get("propertyType");
  if (queryPropertyType) {
    matchStage.propertyType = queryPropertyType;
  }

  const propertySubType = query.get("propertySubType");
  if (propertySubType && propertySubType !== "all") {
    matchStage.propertySubType = { $regex: new RegExp(propertySubType, "i") };
  }

  // Price filters
  const minPrice = Number(query.get("minPrice") || "0");
  const maxPrice = Number(query.get("maxPrice") || "99999999");
  if (minPrice > 0 || maxPrice < 99999999) {
    matchStage.listPrice = {
      ...matchStage.listPrice,
      $gte: minPrice,
      $lte: maxPrice
    };
  }

  // Beds/baths
  const beds = Number(query.get("beds") || "0");
  if (beds > 0) {
    matchStage.$or = [
      { bedroomsTotal: { $gte: beds } },
      { bedsTotal: { $gte: beds } },
    ];
  }

  const baths = Number(query.get("baths") || "0");
  if (baths > 0) {
    matchStage.bathroomsTotalDecimal = { $gte: baths };
  }

  // Amenities
  const hasPool = query.get("pool");
  if (hasPool === "true") matchStage.poolYn = true;

  const hasSpa = query.get("spa");
  if (hasSpa === "true") matchStage.spaYn = true;

  // Location filters
  const city = query.get("city");
  if (city && city !== "all") {
    matchStage.city = { $regex: new RegExp(city, "i") };
  }

  const mlsSource = query.get("mlsSource");
  if (mlsSource) {
    const mlsSources = mlsSource.split(",");
    matchStage.mlsSource = { $in: mlsSources };
  }

  // ==================== AI CONTEXT PARAMETERS ====================
  // Parse context from query params for intent-aware clustering
  const context: MapRequestContext = {
    source: (query.get('source') as 'ai' | 'manual' | 'initial') || 'manual',
    intent: (query.get('intent') as 'explore' | 'specific_location' | 'filtered_search') || 'explore',
    expectedListingCount: parseInt(query.get('expectedCount') || '0'),
    locationName: query.get('locationName') || undefined,
    locationType: (query.get('locationType') as 'subdivision' | 'city' | 'county' | 'custom') || undefined
  };

  // Check if client wants polygon data (default: false for performance)
  // Polygons should only be requested on first load, then cached client-side
  const includePolygons = query.get('includePolygons') === 'true';

  try {
    // Skip expensive listing count for clustering levels - use pre-calculated counts from County/City models
    // Only count when we actually need individual listings (zoom 12+)
    let listingCount = 0;

    if (zoom >= 12) {
      // Only count listings when we're actually going to return them
      listingCount = await UnifiedListing.countDocuments(matchStage);
    }

    // Decide: clusters or individual listings using context-aware logic
    const returnClusters = determineClusteringStrategy(zoom, context, listingCount);

    if (returnClusters) {
      // ==================== SERVER-SIDE CLUSTERING ====================
      const gridSize = getClusterGridSize(zoom);

      // ==================== HIERARCHICAL ZOOM STRATEGY ====================
      // Zoom 5-6: Region-level clustering (Northern CA, Central CA, Southern CA)
      // Zoom 7-9: County-level clustering
      // Zoom 10-11: City-level clustering
      // Zoom 12: Individual listings (capped at 500)
      // Zoom 13+: All individual listings in viewport

      const useRegionClustering = zoom >= 5 && zoom <= 6;
      const useCountyClustering = zoom >= 7 && zoom <= 9;
      const useCityBasedClustering = zoom >= 10 && zoom <= 11;

      let clusterPipeline;
      let clusters; // Declare outside to be accessible throughout

      if (useRegionClustering) {
        // ==================== REGION-LEVEL CLUSTERING (ZOOM 6 AND BELOW) ====================
        // Group counties into 3 main California regions: Northern, Central, Southern
        console.log(`📊 Using region-level clustering for zoom ${zoom}`);

        // Helper function to map detailed regions to main regions
        const getMainRegion = (region: string): string => {
          if (region.includes('Northern') || region === 'Northern California') {
            return 'Northern California';
          }
          if (region.includes('Bay Area') || region.includes('Sacramento') ||
              region.includes('Central Valley') || region.includes('Central Coast') ||
              region.includes('Sierra')) {
            return 'Central California';
          }
          // Everything else is Southern California (LA, OC, SD, Inland Empire, etc.)
          return 'Southern California';
        };

        // Aggregate all counties by main region
        const counties = await County.find({
          isOcean: { $ne: true }
          // Removed listingCount filter to show all county boundaries
        })
        .select('name region listingCount cityCount coordinates avgPrice priceRange mlsSources')
        .lean();

        console.log(`📍 Found ${counties.length} counties, aggregating into 3 regions...`);

        // Group by main region
        const regionMap = new Map<string, {
          listingCount: number;
          countyCount: number;
          cityCount: number;
          avgPrices: number[];
          minPrice: number;
          maxPrice: number;
          latitudes: number[];
          longitudes: number[];
          mlsSources: Set<string>;
        }>();

        counties.forEach((county: any) => {
          const mainRegion = getMainRegion(county.region);

          if (!regionMap.has(mainRegion)) {
            regionMap.set(mainRegion, {
              listingCount: 0,
              countyCount: 0,
              cityCount: 0,
              avgPrices: [],
              minPrice: Infinity,
              maxPrice: 0,
              latitudes: [],
              longitudes: [],
              mlsSources: new Set()
            });
          }

          const region = regionMap.get(mainRegion)!;
          region.listingCount += county.listingCount;
          region.countyCount++;
          region.cityCount += county.cityCount || 0;
          region.avgPrices.push(county.avgPrice);
          region.minPrice = Math.min(region.minPrice, county.priceRange?.min || Infinity);
          region.maxPrice = Math.max(region.maxPrice, county.priceRange?.max || 0);

          if (county.coordinates?.latitude && county.coordinates?.longitude) {
            region.latitudes.push(county.coordinates.latitude);
            region.longitudes.push(county.coordinates.longitude);
          }

          (county.mlsSources || []).forEach((mls: string) => region.mlsSources.add(mls));
        });

        // Use accurate county-based region boundaries from GeoJSON data
        // Generated from official California county boundaries
        const regionBoundaries = REGION_BOUNDARIES;

        // Transform to cluster format with polygon boundaries
        clusters = Array.from(regionMap.entries()).map(([regionName, data]) => ({
          latitude: data.latitudes.length > 0
            ? data.latitudes.reduce((a, b) => a + b, 0) / data.latitudes.length
            : 37.0, // Fallback to central CA
          longitude: data.longitudes.length > 0
            ? data.longitudes.reduce((a, b) => a + b, 0) / data.longitudes.length
            : -119.0,
          count: data.listingCount,
          regionName,
          countyCount: data.countyCount,
          cityCount: data.cityCount,
          avgPrice: Math.round(data.avgPrices.reduce((a, b) => a + b, 0) / data.avgPrices.length),
          minPrice: data.minPrice === Infinity ? 0 : data.minPrice,
          maxPrice: data.maxPrice,
          mlsSources: Array.from(data.mlsSources),
          isCluster: true,
          clusterType: 'region',
          polygon: regionBoundaries[regionName] || null
        }));

        console.log(`✅ Created ${clusters.length} region clusters:`,
          clusters.map(c => `${c.regionName}: ${c.count} listings, ${c.countyCount} counties`));

        // Set clusterPipeline to null to skip additional aggregation
        clusterPipeline = null;

        return NextResponse.json(
          {
            type: "clusters",
            zoom,
            gridSize,
            clusteringMethod: 'region-based',
            clusters,
            totalCount: listingCount,
            clusterCount: clusters.length,
            context,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
              'CDN-Cache-Control': 'max-age=1800',
              'Vary': 'Accept-Encoding',
            }
          }
        );

      } else if (useCountyClustering) {
        // ==================== COUNTY-LEVEL CLUSTERING (FAST) ====================
        // Use static county boundaries as source of truth, enrich with MongoDB data
        console.log(`📊 Using county-level clustering for zoom ${zoom}`);

        // Get ALL counties from static boundaries
        const allCountyNames = Object.keys(COUNTY_BOUNDARIES);

        // Query County model for listing data (may not have all counties)
        const mongoCounties = await County.find({
          isOcean: { $ne: true } // Filter out ocean counties
        })
        .select('name listingCount cityCount coordinates avgPrice priceRange mlsSources')
        .lean();

        // Create lookup map for quick access
        const countyDataMap = new Map(
          mongoCounties.map((c: any) => [c.name, c])
        );

        console.log(`📍 Found ${allCountyNames.length} static counties, ${mongoCounties.length} in MongoDB`);

        // Calculate centroid for each county polygon for marker placement
        const calculateCentroid = (coords: any): { lat: number; lng: number } => {
          let totalLat = 0, totalLng = 0, pointCount = 0;

          const processCoords = (coordArray: any[]): void => {
            coordArray.forEach((item: any) => {
              if (Array.isArray(item) && typeof item[0] === 'number' && typeof item[1] === 'number') {
                totalLng += item[0];
                totalLat += item[1];
                pointCount++;
              } else if (Array.isArray(item)) {
                processCoords(item);
              }
            });
          };

          processCoords(coords);
          return {
            lat: pointCount > 0 ? totalLat / pointCount : 0,
            lng: pointCount > 0 ? totalLng / pointCount : 0
          };
        };

        // Build clusters from ALL counties
        clusters = allCountyNames.map((countyName: string) => {
          const mongoData = countyDataMap.get(countyName);
          const boundary = COUNTY_BOUNDARIES[countyName];
          const centroid = calculateCentroid(boundary.coordinates);

          return {
            latitude: mongoData?.coordinates?.latitude || centroid.lat,
            longitude: mongoData?.coordinates?.longitude || centroid.lng,
            count: mongoData?.listingCount || 0,
            countyName,
            cityCount: mongoData?.cityCount || 0,
            avgPrice: Math.round(mongoData?.avgPrice || 0),
            minPrice: mongoData?.priceRange?.min || 0,
            maxPrice: mongoData?.priceRange?.max || 0,
            mlsSources: mongoData?.mlsSources || [],
            isCluster: true,
            clusterType: 'county',
            polygon: boundary.coordinates
          };
        });

        // Filter to viewport
        clusters = clusters.filter((cluster: any) => {
          return cluster.latitude >= south && cluster.latitude <= north &&
                 cluster.longitude >= west && cluster.longitude <= east;
        });

        // Calculate total listing count
        listingCount = clusters.reduce((sum: number, county: any) => sum + (county.count || 0), 0);

        console.log(`📍 Showing ${clusters.length} counties in viewport (including ${clusters.filter((c: any) => c.count === 0).length} with zero listings)`);

        // Set clusterPipeline to null to skip additional aggregation
        clusterPipeline = null;

        return NextResponse.json(
          {
            type: "clusters",
            zoom,
            gridSize,
            clusteringMethod: 'county-based',
            clusters,
            totalCount: listingCount,
            clusterCount: clusters.length,
            context,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
              'CDN-Cache-Control': 'max-age=1800',
              'Vary': 'Accept-Encoding',
            }
          }
        );

      } else if (useCityBasedClustering) {

        // Query City model for all cities in viewport
        const cities = await City.find({
          isOcean: { $ne: true }, // Filter out ocean cities
          listingCount: { $gte: 1 }, // Minimum 1 listing per city
          'coordinates.latitude': { $gte: south, $lte: north },
          'coordinates.longitude': { $gte: west, $lte: east }
        })
        .select('name listingCount coordinates avgPrice priceRange mlsSources')
        .sort({ listingCount: -1 }) // Sort by population (listing count) descending
        .lean();

        console.log(`📍 Found ${cities.length} cities in viewport (zoom ${zoom}, showing all cities with boundaries)`);

        // Calculate total listing count from cities (avoid expensive UnifiedListing count)
        listingCount = cities.reduce((sum, city: any) => sum + (city.listingCount || 0), 0);

        // Transform City documents to cluster format
        clusters = cities.map((city: any) => ({
          latitude: city.coordinates?.latitude || 0,
          longitude: city.coordinates?.longitude || 0,
          count: city.listingCount,
          cityName: city.name,
          avgPrice: Math.round(city.avgPrice || 0),
          minPrice: city.priceRange?.min || 0,
          maxPrice: city.priceRange?.max || 0,
          propertyTypes: ['A'], // Simplified for now
          mlsSources: city.mlsSources || [],
          sampleListingIds: [], // Not needed for display
          photoUrl: null, // Photo lookup removed for performance
          isCluster: true,
          clusterType: 'city',
          polygon: CITY_BOUNDARIES[city.name]?.coordinates || null,
        }));

        // Set clusterPipeline to null to skip aggregation
        clusterPipeline = null;
      } else {
        // ==================== GRID-BASED CLUSTERING ====================
        // For zoomed-out views, use grid-based clustering
        clusterPipeline = [
          // Stage 1: Filter active listings in bounds
          { $match: matchStage },

          // Stage 2: Create geographic clusters using grid-based bucketing
          {
            $group: {
              _id: {
                // Round lat/lng to grid cells
                lat: { $multiply: [{ $round: { $divide: ["$latitude", gridSize] } }, gridSize] },
                lng: { $multiply: [{ $round: { $divide: ["$longitude", gridSize] } }, gridSize] }
              },
              // Count listings in this cluster
              count: { $sum: 1 },
              // Calculate average price
              avgPrice: { $avg: "$listPrice" },
              // Track property types in cluster
              propertyTypes: { $addToSet: "$propertyType" },
              // Track MLS sources
              mlsSources: { $addToSet: "$mlsSource" },
              // Get min/max for price range
              minPrice: { $min: "$listPrice" },
              maxPrice: { $max: "$listPrice" },
              // Sample listing IDs (for drilling down)
              sampleListingIds: { $push: { $toString: "$listingId" } }
            }
          },

          // Stage 3: Project cluster data
          {
            $project: {
              _id: 0,
              latitude: "$_id.lat",
              longitude: "$_id.lng",
              count: 1,
              avgPrice: { $round: "$avgPrice" },
              minPrice: 1,
              maxPrice: 1,
              propertyTypes: 1,
              mlsSources: 1,
              // Limit sample IDs to first 10
              sampleListingIds: { $slice: ["$sampleListingIds", 10] },
              // Mark as cluster
              isCluster: { $literal: true }
            }
          },

          // Stage 4: Sort by count (largest clusters first)
          { $sort: { count: -1 } },

          // Stage 5: Limit to prevent overload
          { $limit: 1000 }
        ];
      }

      // Run aggregation only if we don't already have clusters from City/County model
      if (clusterPipeline && !clusters) {
        clusters = await UnifiedListing.aggregate(clusterPipeline as any);
      }
      // Note: clusters variable is already set above for county/city clustering

      console.log(`📍 Generated ${clusters?.length || 0} ${useCountyClustering ? 'county-based' : useCityBasedClustering ? 'city-based' : 'grid-based'} clusters at zoom ${zoom}`);
      if (useCityBasedClustering && clusters && clusters.length > 0) {
        console.log(`🏙️ Cities: ${clusters.slice(0, 5).map((c: any) => c.cityName || 'Unknown').join(', ')}...`);
      }

      return NextResponse.json(
        {
          type: "clusters",
          zoom,
          gridSize,
          clusteringMethod: useCountyClustering ? 'county-based' : useCityBasedClustering ? 'city-based' : 'grid-based',
          clusters: clusters || [],
          totalCount: listingCount,
          clusterCount: clusters?.length || 0,
          context, // Include context for debugging
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'max-age=1800',
            'Vary': 'Accept-Encoding',
          }
        }
      );

    } else {
      // ==================== INDIVIDUAL LISTINGS (ZOOM 12+) ====================
      // Progressive listing display:
      // Zoom 12: Show up to 500 listings
      // Zoom 13+: Show ALL listings in viewport (no limit)

      const useUnlimitedListings = zoom >= 13;
      const limit = useUnlimitedListings ? 50000 : 500; // All listings at zoom 13+, max 500 at zoom 12

      // Check if client wants streaming response
      const streamParam = query.get("stream");
      const useStreaming = streamParam === "true" || streamParam === "1";

      console.log(`📍 Fetching individual listings (zoom ${zoom}, limit: ${limit}, streaming: ${useStreaming})`);

      if (useStreaming) {
        // ==================== STREAMING RESPONSE ====================
        // Stream listings in batches for progressive rendering
        const BATCH_SIZE = 50; // Send 50 listings at a time

        const encoder = new TextEncoder();
        let sentCount = 0;

        const stream = new ReadableStream({
          async start(controller) {
            try {
              // Send initial metadata
              const metadata = {
                type: "metadata",
                zoom,
                totalCount: listingCount,
                batchSize: BATCH_SIZE,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));

              // Create cursor for streaming results
              const cursor = UnifiedListing.find(matchStage)
                .select({
                  listingId: 1,
                  listingKey: 1,
                  slug: 1,
                  slugAddress: 1,
                  latitude: 1,
                  longitude: 1,
                  listPrice: 1,
                  bedroomsTotal: 1,
                  bedsTotal: 1,
                  bathroomsTotalDecimal: 1,
                  livingArea: 1,
                  address: 1,
                  unparsedAddress: 1,
                  city: 1,
                  propertyType: 1,
                  propertySubType: 1,
                  mlsSource: 1,
                  poolYn: 1,
                  spaYn: 1,
                  primaryPhotoUrl: 1,
                })
                .limit(limit)
                .lean()
                .cursor();

              let batch: any[] = [];

              for await (const listing of cursor) {
                batch.push(listing);

                // Send batch when it reaches BATCH_SIZE
                if (batch.length >= BATCH_SIZE) {
                  const chunk = {
                    type: "listings",
                    listings: batch,
                    count: batch.length,
                    totalSent: sentCount + batch.length,
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                  sentCount += batch.length;
                  batch = [];
                }
              }

              // Send remaining listings
              if (batch.length > 0) {
                const chunk = {
                  type: "listings",
                  listings: batch,
                  count: batch.length,
                  totalSent: sentCount + batch.length,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                sentCount += batch.length;
              }

              // Send completion message
              const complete = {
                type: "complete",
                totalSent: sentCount,
                totalCount: listingCount,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(complete)}\n\n`));

              console.log(`📍 Streamed ${sentCount} listings in batches of ${BATCH_SIZE}`);
              controller.close();
            } catch (error) {
              console.error("❌ Streaming error:", error);
              const errorMsg = {
                type: "error",
                message: "Failed to stream listings",
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`));
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });

      } else {
        // ==================== STANDARD JSON RESPONSE ====================
        const listings = await UnifiedListing.find(matchStage)
          .select({
            listingId: 1,
            listingKey: 1,
            slug: 1,
            slugAddress: 1,
            latitude: 1,
            longitude: 1,
            listPrice: 1,
            bedroomsTotal: 1,
            bedsTotal: 1,
            bathroomsTotalDecimal: 1,
            livingArea: 1,
            address: 1,
            unparsedAddress: 1,
            city: 1,
            propertyType: 1,
            propertySubType: 1,
            mlsSource: 1,
            poolYn: 1,
            spaYn: 1,
            primaryPhotoUrl: 1,
          })
          .limit(limit)
          .lean();

        console.log(`📍 Returning ${listings.length} listings (total in area: ${listingCount})`);

        return NextResponse.json(
          {
            type: "listings",
            zoom,
            listings,
            totalCount: listingCount,
            listingCount: listings.length,
            context, // Include context for debugging
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
              'CDN-Cache-Control': 'max-age=1800',
              'Vary': 'Accept-Encoding',
            }
          }
        );
      }
    }

  } catch (error) {
    console.error("❌ Failed to fetch clusters/listings:", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }
}
