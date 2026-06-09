import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/listings/[listingKey]/photos
 *
 * Photos are served DB-FIRST from the synced `unified_listings.media[]` array,
 * with the Spark Replication API as a BACKUP only when the DB has no stored
 * media. This is deliberate: when a listing comes off the market it disappears
 * from the live Spark feed, so a Spark-only fetch returns zero photos and the
 * listing shows a "no photo" placeholder — even though we already synced its
 * photos. Reading the stored media[] keeps photos working after off-market.
 *
 * Response: { listingKey, mlsSource, mlsId?, count, photos[], source }
 *   source = "db" | "spark" | "primaryPhotoUrl" | "none"
 *   photos[]: { mediaKey, order, caption, uri300..uri2048, uriThumb, uriLarge, primary }
 */

// Spark sometimes returns relative paths ("/v1/listings/...") instead of
// absolute CDN URLs; those resolve against our own host and 404. Keep http only.
const safeUri = (uri: any) =>
  typeof uri === "string" && uri.startsWith("http") ? uri : undefined;

const PHOTO_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, max-age=3600",
  "Vercel-CDN-Cache-Control": "public, max-age=3600",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// Map a synced media[] entry (PascalCase, from Spark _expand=Media) to the
// lowercase photo shape the frontend consumes.
function transformMedia(media: any[]) {
  return media
    .filter(
      (m: any) =>
        m &&
        (m.Uri800 || m.Uri1024 || m.Uri640 || m.UriLarge || m.Uri1280 || m.MediaURL)
    )
    .map((m: any, index: number) => ({
      mediaKey: m.MediaKey || m.Id || String(index),
      order: m.Order ?? index,
      caption: m.Caption || m.ShortDescription || "",
      uri300: safeUri(m.Uri300),
      uri640: safeUri(m.Uri640),
      uri800: safeUri(m.Uri800),
      uri1024: safeUri(m.Uri1024),
      uri1280: safeUri(m.Uri1280),
      uri1600: safeUri(m.Uri1600),
      uri2048: safeUri(m.Uri2048),
      uriThumb: safeUri(m.UriThumb),
      uriLarge: safeUri(m.UriLarge) || safeUri(m.MediaURL),
      primary:
        m.MediaCategory === "Primary Photo" || m.Order === 0 || index === 0,
    }))
    .sort((a: any, b: any) => a.order - b.order);
}

// BACKUP path: live Spark Replication fetch (used only when media[] is empty).
async function fetchFromSpark(
  mlsId: string,
  listingKey: string
): Promise<any[] | null> {
  const accessToken = process.env.SPARK_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[photos API] SPARK_ACCESS_TOKEN not configured");
    return null;
  }

  const url = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And ListingKey Eq '${listingKey}'&_expand=Photos&_limit=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-SparkApi-User-Agent": "jpsrealtor.com",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    console.error(
      `[photos API] Replication API error: ${response.status} for ${listingKey}`
    );
    return null;
  }

  const data = await response.json();
  const results = data?.D?.Results || [];
  if (results.length === 0) return null;

  const photosArray = results[0]?.StandardFields?.Photos || [];
  return photosArray
    .filter((p: any) => p.Id)
    .map((p: any, index: number) => ({
      mediaKey: p.Id,
      order: p.Order ?? index,
      caption: p.Caption || p.Name || "",
      uri300: safeUri(p.Uri300),
      uri640: safeUri(p.Uri640),
      uri800: safeUri(p.Uri800),
      uri1024: safeUri(p.Uri1024),
      uri1280: safeUri(p.Uri1280),
      uri1600: safeUri(p.Uri1600),
      uri2048: safeUri(p.Uri2048),
      uriThumb: safeUri(p.UriThumb),
      uriLarge: safeUri(p.UriLarge),
      primary: p.Primary === true || p.Order === 0,
    }))
    .sort((a: any, b: any) => a.order - b.order);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  const { listingKey } = await params;
  try {
    if (!listingKey) {
      return NextResponse.json(
        { error: "listingKey is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const listing = await UnifiedListing.findOne({ listingKey })
      .select("mlsSource mlsId listingKey media primaryPhotoUrl")
      .lean();

    const mlsSource = (listing as any)?.mlsSource || "Unknown";

    // 1) DB-FIRST — serve the synced media[]. Survives off-market.
    const media: any[] = (listing as any)?.media || [];
    if (media.length > 0) {
      const photos = transformMedia(media);
      if (photos.length > 0) {
        return NextResponse.json(
          {
            listingKey,
            mlsSource,
            mlsId: (listing as any)?.mlsId,
            count: photos.length,
            photos,
            source: "db",
          },
          { headers: PHOTO_HEADERS }
        );
      }
    }

    // 2) BACKUP — live Spark fetch only when nothing is stored.
    const mlsId = (listing as any)?.mlsId;
    if (mlsId) {
      const sparkPhotos = await fetchFromSpark(mlsId, listingKey);
      if (sparkPhotos && sparkPhotos.length > 0) {
        return NextResponse.json(
          {
            listingKey,
            mlsSource,
            mlsId,
            count: sparkPhotos.length,
            photos: sparkPhotos,
            source: "spark",
          },
          { headers: PHOTO_HEADERS }
        );
      }
    }

    // 3) Last resort — a single primaryPhotoUrl if one is stored, else empty.
    const primary = safeUri((listing as any)?.primaryPhotoUrl);
    return NextResponse.json({
      listingKey,
      mlsSource,
      count: primary ? 1 : 0,
      photos: primary
        ? [
            {
              mediaKey: "primary",
              order: 0,
              caption: "",
              uri800: primary,
              uriLarge: primary,
              primary: true,
            },
          ]
        : [],
      source: primary ? "primaryPhotoUrl" : "none",
    });
  } catch (error) {
    console.error("[photos API] Error:", error);
    return NextResponse.json({
      listingKey,
      mlsSource: "Unknown",
      count: 0,
      photos: [],
      source: "error",
    });
  }
}
