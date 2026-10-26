// src/lib/listings/listing-detail.ts
//
// Shared server-side reads for one listing + its photos. The detail page,
// its OG image, and the public /api routes all call these directly.
//
// Why this exists: until 2026-10-25 the detail page fetched its own public API
// over HTTP (`${NEXT_PUBLIC_BASE_URL}/api/mls-listings/…` and
// `/api/listings/…/photos`, both `cache: "no-store"`). Every page render was
// therefore THREE function invocations plus two extra middleware passes, and
// the self-fetches went out with Node's default `User-Agent: node` — the
// pattern behind ~30k API + ~20k photo invocations per 12h next to ~29k page
// renders. Calling the DB in-process removes both hops.
//
// Freshness: listing rows change once a day (VPS pipeline 06:00/07:00, photos
// 09:00–09:30 — see crontab.vps), so a 10-minute data cache is far inside the
// real update cadence. Nothing here is per-user or per-host, so the cache is
// safe to share across every tenant domain.
import { cache } from "react";
import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/** Seconds a cached listing / photo set may be served before re-reading Mongo. */
export const LISTING_REVALIDATE_SECONDS = 600;
export const PHOTOS_REVALIDATE_SECONDS = 3600;

/** Cache tags, for an on-demand `revalidateTag()` if a writer ever needs one. */
export const listingTag = (slugOrKey: string) => `listing:${slugOrKey}`;
export const listingPhotosTag = (listingKey: string) => `listing-photos:${listingKey}`;

// Spark sometimes returns relative paths ("/v1/listings/...") instead of
// absolute CDN URLs; those resolve against our own host and 404. Keep http only.
const safeUri = (uri: any) =>
  typeof uri === "string" && uri.startsWith("http") ? uri : undefined;

// ---------------------------------------------------------------------------
// Listing detail
// ---------------------------------------------------------------------------

async function readEnrichedListing(slugAddress: string): Promise<any | null> {
  await dbConnect();

  // Prefer Active listing when multiple exist for the same address (relisting scenario).
  // Fall back to any status if no Active listing exists.
  let listing: any = await UnifiedListing.findOne({
    slugAddress,
    standardStatus: "Active",
  }).lean();

  if (!listing) {
    listing = await UnifiedListing.findOne({ slugAddress }).lean();
  }

  // If not found by slugAddress, try by listingKey
  if (!listing) {
    listing = await UnifiedListing.findOne({ listingKey: slugAddress }).lean();
  }

  if (!listing) return null;

  const media = listing.media || [];
  const primaryPhoto =
    media.find((m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0) || media[0];

  const enriched = {
    ...listing,
    mlsSource: listing.mlsSource || "UNKNOWN",
    primaryPhotoUrl: primaryPhoto?.Uri800 || primaryPhoto?.Uri640 || "/images/no-photo.png",
    openHouses: listing.OpenHouses || [],
  };

  // JSON round-trip = exactly the shape the HTTP API used to hand the page
  // (ObjectId/Date → string), which is also what a Client Component prop and
  // the data cache both require.
  return JSON.parse(JSON.stringify(enriched));
}

/**
 * One listing by slugAddress (Active preferred) or listingKey, enriched with
 * primaryPhotoUrl/openHouses. `null` when not found. Throws on DB error so the
 * API route can still answer 500.
 *
 * `cache()` dedupes generateMetadata + page within one render; unstable_cache
 * shares the result across requests for LISTING_REVALIDATE_SECONDS.
 */
export const getEnrichedListing = cache((slugAddress: string) =>
  unstable_cache(() => readEnrichedListing(slugAddress), ["listing-detail", slugAddress], {
    revalidate: LISTING_REVALIDATE_SECONDS,
    tags: [listingTag(slugAddress)],
  })()
);

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export interface ListingPhoto {
  mediaKey: string;
  order: number;
  caption: string;
  uri300?: string;
  uri640?: string;
  uri800?: string;
  uri1024?: string;
  uri1280?: string;
  uri1600?: string;
  uri2048?: string;
  uriThumb?: string;
  uriLarge?: string;
  primary: boolean;
}

export interface ListingPhotosResult {
  listingKey: string;
  mlsSource: string;
  mlsId?: string;
  count: number;
  photos: ListingPhoto[];
  source: "db" | "spark" | "primaryPhotoUrl" | "none";
}

// Map a synced media[] entry (PascalCase, from Spark _expand=Media) to the
// lowercase photo shape the frontend consumes.
export function transformMedia(media: any[]): ListingPhoto[] {
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
      primary: m.MediaCategory === "Primary Photo" || m.Order === 0 || index === 0,
    }))
    .sort((a, b) => a.order - b.order);
}

// BACKUP path: live Spark Replication fetch (used only when media[] is empty).
async function fetchFromSpark(mlsId: string, listingKey: string): Promise<ListingPhoto[] | null> {
  const accessToken = process.env.SPARK_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[photos] SPARK_ACCESS_TOKEN not configured");
    return null;
  }

  const url = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And ListingKey Eq '${listingKey}'&_expand=Photos&_limit=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-SparkApi-User-Agent": "jpsrealtor.com",
      Accept: "application/json",
    },
    next: { revalidate: PHOTOS_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    console.error(`[photos] Replication API error: ${response.status} for ${listingKey}`);
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
    .sort((a: ListingPhoto, b: ListingPhoto) => a.order - b.order);
}

/**
 * Photos, DB-FIRST from the synced `media[]`, Spark Replication only when
 * nothing is stored (off-market listings vanish from the live feed, so a
 * Spark-only fetch would blank their photos).
 *
 * Pass `preloaded` (a listing already read) to skip the DB round-trip — the
 * detail page has the full row, media included, before it needs photos.
 */
async function readListingPhotos(listingKey: string, preloaded?: any): Promise<ListingPhotosResult> {
  let listing = preloaded;
  if (!listing) {
    await dbConnect();
    listing = await UnifiedListing.findOne({ listingKey })
      .select("mlsSource mlsId listingKey media primaryPhotoUrl")
      .lean();
  }

  const mlsSource = listing?.mlsSource || "Unknown";
  const mlsId = listing?.mlsId;

  // 1) DB-FIRST — serve the synced media[]. Survives off-market.
  const media: any[] = listing?.media || [];
  if (media.length > 0) {
    const photos = transformMedia(media);
    if (photos.length > 0) {
      return { listingKey, mlsSource, mlsId, count: photos.length, photos, source: "db" };
    }
  }

  // 2) BACKUP — live Spark fetch only when nothing is stored.
  if (mlsId) {
    const sparkPhotos = await fetchFromSpark(mlsId, listingKey);
    if (sparkPhotos && sparkPhotos.length > 0) {
      return { listingKey, mlsSource, mlsId, count: sparkPhotos.length, photos: sparkPhotos, source: "spark" };
    }
  }

  // 3) Last resort — a single primaryPhotoUrl if one is stored, else empty.
  const primary = safeUri(listing?.primaryPhotoUrl);
  return {
    listingKey,
    mlsSource,
    count: primary ? 1 : 0,
    photos: primary
      ? [{ mediaKey: "primary", order: 0, caption: "", uri800: primary, uriLarge: primary, primary: true }]
      : [],
    source: primary ? "primaryPhotoUrl" : "none",
  };
}

/** Photos for the API route (no preloaded row): data-cached per listingKey. */
export const getListingPhotos = cache((listingKey: string) =>
  unstable_cache(() => readListingPhotos(listingKey), ["listing-photos", listingKey], {
    revalidate: PHOTOS_REVALIDATE_SECONDS,
    tags: [listingPhotosTag(listingKey)],
  })()
);

/**
 * Photos from a listing row the caller already holds (no extra DB read).
 * Only short-circuits when that row carries media[]: getEnrichedListing
 * overwrites primaryPhotoUrl, so the stored-URL fallback (step 3) needs the
 * raw row and goes through getListingPhotos instead.
 */
export function getListingPhotosFromListing(listing: any): Promise<ListingPhotosResult> {
  if (Array.isArray(listing?.media) && listing.media.length > 0) {
    return readListingPhotos(listing.listingKey, listing);
  }
  return getListingPhotos(listing.listingKey);
}
