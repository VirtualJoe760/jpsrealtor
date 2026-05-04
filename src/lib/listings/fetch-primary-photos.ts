// src/lib/listings/fetch-primary-photos.ts
//
// Batched Spark Replication API fetch for primary listing photos. Originally
// inlined in /api/cities/[cityId]/listings/route.ts; extracted so other
// surfaces (chat-v2 preview, search-service, etc.) can reuse the same
// batching strategy.
//
// Why this matters: unified_listings.media[] is populated by a separate
// cron and lags behind incoming MLS data. unified_listings.primaryPhotoUrl
// isn't reliably set across all sources. The Spark Replication API is the
// canonical photo source, but per-listing fetches are 200–500ms each. This
// helper groups listings by MlsId and batches up to 50 keys per Spark
// request, capping total wall time at ~1 second for any reasonable list
// of listings.
//
// 1-hour Next cache (revalidate: 3600) means subsequent fetches for the
// same listing key are free.

interface ListingForPhotoLookup {
  listingKey?: string;
  mlsId?: string;
}

const BATCH_SIZE = 50;

/**
 * Returns a Map<listingKey, photoUrl> for as many of the input listings
 * as Spark could resolve. Listings without an mlsId or photoless listings
 * are silently absent from the map.
 */
export async function fetchPrimaryPhotos(
  listings: ListingForPhotoLookup[]
): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token || listings.length === 0) return photoMap;

  // Group by mlsId so each Spark filter targets the right MLS association.
  const byMls = new Map<string, string[]>();
  for (const l of listings) {
    const mlsId = l.mlsId;
    const key = l.listingKey;
    if (!mlsId || !key) continue;
    if (!byMls.has(mlsId)) byMls.set(mlsId, []);
    byMls.get(mlsId)!.push(key);
  }

  const fetches: Promise<void>[] = [];

  for (const [mlsId, keys] of byMls) {
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
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
                const photoUrl =
                  primary.Uri2048 ||
                  primary.Uri1600 ||
                  primary.Uri1280 ||
                  primary.Uri1024 ||
                  primary.UriLarge ||
                  primary.Uri800;
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
