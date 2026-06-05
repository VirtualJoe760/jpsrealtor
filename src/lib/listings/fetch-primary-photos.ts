// src/lib/listings/fetch-primary-photos.ts
//
// Batched primary-photo lookup for listing cards/lists (chat preview,
// search-service, city listings, etc.).
//
// DB-FIRST (June 2026): the synced `unified_listings.media[]` is the primary
// source; the Spark Replication API is only a BACKUP for keys the DB can't
// resolve. Previously this was Spark-only, so a listing that went off-market
// (and thus dropped out of the live Spark feed) lost its card photo even though
// its photos were already synced. Reading media[] keeps card photos working
// after off-market — and cuts Spark traffic, since most keys resolve from Mongo.
//
// Spark batches group by MlsId and cap at 50 keys/request (~1s wall time), with
// a 1-hour Next cache.

import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

interface ListingForPhotoLookup {
  listingKey?: string;
  mlsId?: string;
}

const BATCH_SIZE = 50;

const safeHttp = (u: any): string | undefined =>
  typeof u === "string" && u.startsWith("http") ? u : undefined;

// Best primary photo URL from a stored media[] array (largest variant first).
function primaryFromMedia(media: any[]): string | undefined {
  if (!Array.isArray(media) || media.length === 0) return undefined;
  const primary =
    media.find(
      (m: any) => m?.MediaCategory === "Primary Photo" || m?.Order === 0
    ) || media[0];
  if (!primary) return undefined;
  return safeHttp(
    primary.Uri2048 ||
      primary.Uri1600 ||
      primary.Uri1280 ||
      primary.Uri1024 ||
      primary.UriLarge ||
      primary.Uri800 ||
      primary.MediaURL
  );
}

/**
 * Returns a Map<listingKey, photoUrl>. Resolves from the DB first, then Spark
 * for the remainder. Listings with no photo anywhere are absent from the map.
 */
export async function fetchPrimaryPhotos(
  listings: ListingForPhotoLookup[]
): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();
  if (listings.length === 0) return photoMap;

  const keys = listings
    .map((l) => l.listingKey)
    .filter((k): k is string => !!k);

  // 1) DB-FIRST — synced media[] / primaryPhotoUrl.
  if (keys.length > 0) {
    try {
      await dbConnect();
      const docs = await UnifiedListing.find({ listingKey: { $in: keys } })
        .select("listingKey media primaryPhotoUrl")
        .lean();
      for (const d of docs as any[]) {
        const url = primaryFromMedia(d.media) || safeHttp(d.primaryPhotoUrl);
        if (d.listingKey && url) photoMap.set(d.listingKey, url);
      }
    } catch (err: any) {
      console.error(
        "[fetchPrimaryPhotos] DB lookup failed:",
        err?.message || err
      );
    }
  }

  // 2) BACKUP — Spark, only for keys the DB couldn't resolve.
  const token = process.env.SPARK_ACCESS_TOKEN;
  const missing = listings.filter(
    (l) => l.listingKey && l.mlsId && !photoMap.has(l.listingKey)
  );
  if (!token || missing.length === 0) return photoMap;

  // Group missing keys by mlsId so each Spark filter targets the right MLS.
  const byMls = new Map<string, string[]>();
  for (const l of missing) {
    if (!byMls.has(l.mlsId!)) byMls.set(l.mlsId!, []);
    byMls.get(l.mlsId!)!.push(l.listingKey!);
  }

  const fetches: Promise<void>[] = [];
  for (const [mlsId, mlsKeys] of byMls) {
    for (let i = 0; i < mlsKeys.length; i += BATCH_SIZE) {
      const batch = mlsKeys.slice(i, i + BATCH_SIZE);
      const keyFilter = batch.map((k) => `ListingKey Eq '${k}'`).join(" Or ");
      const url = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And (${keyFilter})&_expand=Photos&_select=ListingKey&_limit=${batch.length}`;

      fetches.push(
        fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-SparkApi-User-Agent": "jpsrealtor.com",
            Accept: "application/json",
          },
          next: { revalidate: 3600 },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const results = data?.D?.Results || [];
            for (const result of results) {
              const lk = result?.StandardFields?.ListingKey;
              const photos = result?.StandardFields?.Photos || [];
              const primary =
                photos.find((p: any) => p.Primary === true || p.Order === 0) ||
                photos[0];
              if (lk && primary) {
                const photoUrl = safeHttp(
                  primary.Uri2048 ||
                    primary.Uri1600 ||
                    primary.Uri1280 ||
                    primary.Uri1024 ||
                    primary.UriLarge ||
                    primary.Uri800
                );
                if (photoUrl) photoMap.set(lk, photoUrl);
              }
            }
          })
          .catch((err) => {
            console.error(
              `[fetchPrimaryPhotos] Spark batch error for mlsId ${mlsId}:`,
              err?.message || err
            );
          })
      );
    }
  }

  await Promise.all(fetches);
  return photoMap;
}
