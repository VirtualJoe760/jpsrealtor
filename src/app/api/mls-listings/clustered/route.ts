// src/app/api/mls-listings/clustered/route.ts
// Server-side clustering endpoint for optimal mobile performance

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
import Supercluster from "supercluster";

// Cluster radius by zoom level - more aggressive clustering at lower zooms
const getClusterRadius = (zoom: number): number => {
  if (zoom <= 8) return 120;
  if (zoom <= 10) return 80;
  if (zoom <= 12) return 60;
  return 40;
};

// Max points to return at each zoom level
const getMaxPoints = (zoom: number): number => {
  if (zoom <= 8) return 100;
  if (zoom <= 10) return 200;
  if (zoom <= 12) return 500;
  return 2000; // High zoom = more detail
};

export async function GET(req: NextRequest) {
  await dbConnect();

  const query = req.nextUrl.searchParams;

  const north = parseFloat(query.get("north") || "90");
  const south = parseFloat(query.get("south") || "-90");
  const east = parseFloat(query.get("east") || "180");
  const west = parseFloat(query.get("west") || "-180");
  const zoom = parseInt(query.get("zoom") || "10", 10);

  // At zoom 13+, return individual listings (no clustering)
  const shouldCluster = zoom < 13;

  // Build match stage for filters
  const listingType = query.get("listingType") || "sale";
  const propertyTypeCode =
    listingType === "rental" ? "B" :
    listingType === "multifamily" ? "C" :
    "A";

  const matchStage: Record<string, any> = {
    standardStatus: "Active",
    propertyType: propertyTypeCode,
    latitude: { $gte: south, $lte: north },
    longitude: { $gte: west, $lte: east },
    listPrice: { $ne: null },
  };

  // Apply filters
  const queryPropertyType = query.get("propertyType");
  if (queryPropertyType) matchStage.propertyType = queryPropertyType;

  const minPrice = Number(query.get("minPrice") || "0");
  const maxPrice = Number(query.get("maxPrice") || "99999999");
  matchStage.listPrice = { $gte: minPrice, $lte: maxPrice };

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

  try {
    // Fetch minimal data for clustering (just coordinates + essential fields)
    const projection = "_id listingId listingKey latitude longitude listPrice propertyType mlsSource slug slugAddress bedroomsTotal bathroomsTotalInteger livingArea";

    const maxPoints = getMaxPoints(zoom);

    // Fetch from both collections
    const [gpsListings, crmlsListings] = await Promise.all([
      Listing.find(matchStage, projection).limit(maxPoints).lean(),
      CRMLSListing.find(matchStage, projection).limit(maxPoints).lean(),
    ]);

    // Normalize listings
    const allListings = [
      ...gpsListings.map((l: any) => ({ ...l, mlsSource: "GPS", listingKey: l.listingKey })),
      ...crmlsListings.map((l: any) => ({ ...l, mlsSource: "CRMLS", listingKey: l.listingKey || l.listingId })),
    ].filter(l => l.latitude && l.longitude);

    // Get total counts
    const [gpsTotal, crmlsTotal] = await Promise.all([
      Listing.countDocuments({ standardStatus: "Active" }),
      CRMLSListing.countDocuments({ standardStatus: "Active" }),
    ]);

    // If not clustering (high zoom), return individual listings
    if (!shouldCluster) {
      return NextResponse.json({
        clusters: [],
        listings: allListings.slice(0, maxPoints),
        totalCount: { gps: gpsTotal, crmls: crmlsTotal, total: gpsTotal + crmlsTotal },
        zoom,
        clustered: false,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
      });
    }

    // Create Supercluster index
    const clusterIndex = new Supercluster({
      radius: getClusterRadius(zoom),
      maxZoom: 12,
      minPoints: 2,
    });

    // Convert to GeoJSON features
    const points = allListings.map((listing: any) => ({
      type: "Feature" as const,
      properties: {
        listingKey: listing.listingKey,
        listPrice: listing.listPrice,
        propertyType: listing.propertyType,
        mlsSource: listing.mlsSource,
        slug: listing.slug,
        slugAddress: listing.slugAddress,
        _id: listing._id?.toString(),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [listing.longitude, listing.latitude],
      },
    }));

    clusterIndex.load(points);

    // Get clusters for the viewport
    const bbox: [number, number, number, number] = [west, south, east, north];
    const clustersAndPoints = clusterIndex.getClusters(bbox, zoom);

    // Format response
    const clusters: any[] = [];
    const listings: any[] = [];

    for (const feature of clustersAndPoints) {
      const [lng, lat] = feature.geometry.coordinates;

      if (feature.properties.cluster) {
        // It's a cluster
        const clusterId = feature.properties.cluster_id;
        const pointCount = feature.properties.point_count;

        // Get expansion zoom for this cluster
        const expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId);

        // Get sample listings from cluster for price range
        const leaves = clusterIndex.getLeaves(clusterId, 10);
        const prices = leaves
          .map((l: any) => l.properties.listPrice)
          .filter((p: any) => p != null)
          .sort((a: number, b: number) => a - b);

        clusters.push({
          id: clusterId,
          latitude: lat,
          longitude: lng,
          count: pointCount,
          expansionZoom,
          minPrice: prices[0],
          maxPrice: prices[prices.length - 1],
          avgPrice: prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : null,
        });
      } else {
        // It's an individual point
        listings.push({
          _id: feature.properties._id,
          listingKey: feature.properties.listingKey,
          latitude: lat,
          longitude: lng,
          listPrice: feature.properties.listPrice,
          propertyType: feature.properties.propertyType,
          mlsSource: feature.properties.mlsSource,
          slug: feature.properties.slug,
          slugAddress: feature.properties.slugAddress,
        });
      }
    }

    return NextResponse.json({
      clusters,
      listings,
      totalCount: { gps: gpsTotal, crmls: crmlsTotal, total: gpsTotal + crmlsTotal },
      zoom,
      clustered: true,
      stats: {
        totalPoints: allListings.length,
        clustersReturned: clusters.length,
        listingsReturned: listings.length,
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error) {
    console.error("❌ Clustering error:", error);
    return NextResponse.json({ error: "Clustering failed" }, { status: 500 });
  }
}
