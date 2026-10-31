// src/lib/listings/dead-listing-redirect.ts
//
// Where a /mls-listings/<slugAddress> URL should go once the listing is no
// longer in `unified_listings`.
//
// Why this exists: the detail page called `notFound()` for any slug it could
// not read, and Search Console had accumulated **22,676 "Not found (404)"**
// URLs under /mls-listings/ by 2026-10-24, first detected 2025-11-08. A hard
// 404 on a URL Google has crawled for months throws away whatever the page
// earned and keeps the crawler coming back to re-confirm the same error.
//
// Two distinct cases, which must NOT be answered the same way:
//
//   1. The property is in `unified_closed_listings` — it sold. That is
//      permanent, so a permanent redirect to the city page is honest and lets
//      Google consolidate. ~4 of 10 sampled 404s resolved this way.
//   2. The slug resolves nowhere. That is NOT proof the property is gone: the
//      VPS pipeline runs `--purge` DISABLED since the 2026-04-06 incident
//      (docs/listings/README.md), so rows leave Active only by status
//      transition. A slug matching nothing is more likely a slug-format drift
//      or a transient pipeline gap, and `readEnrichedListing` explicitly
//      prefers an Active row "when multiple exist for the same address
//      (relisting scenario)" — i.e. this exact slug can come back. A browser
//      caches a 308 indefinitely, so a permanent redirect here would shadow a
//      future relisting for anyone who ever hit the dead URL. Temporary.
//
// Either way the URL leaves the "Not found (404)" bucket: GSC files a redirect
// under "Page with redirect", which is an excluded state, not an error.
import { cache } from "react";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import UnifiedClosedListing from "@/models/unified-closed-listing";
import { createSlug } from "@/lib/utils/slug";

/** Always-valid fallback: the search index is a static route, never data-gated. */
const LISTINGS_INDEX = "/mls-listings";

/** Most hyphen-tokens a California city slug is assumed to span. */
const MAX_CITY_TOKENS = 4;

export interface DeadListingTarget {
  /** Path to send the client to. Never empty. */
  path: string;
  /**
   * `true` only when the property is confirmed sold. Drives 308 vs 307 — see
   * the header note on relisting.
   */
  permanent: boolean;
  /** Machine-readable cause, stable enough to group on in logs. */
  reason: string;
}

/**
 * A city page renders only when its `cities` row has `listingCount > 0` —
 * `getNeighborhoodsDirectory()` builds the directory from
 * `City.find({ listingCount: { $gt: 0 } })` and
 * `/neighborhoods/[cityId]` calls `notFound()` for anything absent from that
 * tree. Redirecting to a city page without this check would turn one 404 into
 * a redirect *chain* ending in a 404, which is strictly worse than the 404 we
 * are replacing.
 */
async function liveCitySlugs(candidates: string[]): Promise<Set<string>> {
  if (!candidates.length) return new Set();
  await dbConnect();
  const rows = await City.find({
    slug: { $in: candidates },
    listingCount: { $gt: 0 },
  })
    .select("slug")
    .lean();
  return new Set(rows.map((r: any) => r.slug));
}

/**
 * Trailing `-ca` / `-ca-92111` that the slug generator appends. Both shapes
 * are live in production data (`…-dana-point-ca` alongside
 * `…-san-diego-ca-92111`), so neither can be assumed.
 */
function stripStateAndZip(slug: string): string {
  return slug.replace(/-ca(-\d{5})?$/, "");
}

/**
 * Candidate city slugs from the tail of a listing slug, longest first.
 *
 * The slug is `<street-address>-<city>-ca[-<zip>]` with no delimiter between
 * street and city, so the split is recovered by matching the tail against real
 * city slugs. Longest-first matters: "north-tustin" and "la-quinta" must win
 * over "tustin" and "quinta".
 */
function cityCandidatesFromSlug(slugAddress: string): string[] {
  const tokens = stripStateAndZip(slugAddress).split("-").filter(Boolean);
  const out: string[] = [];
  const maxLen = Math.min(MAX_CITY_TOKENS, tokens.length - 1); // leave ≥1 token of street
  for (let len = maxLen; len >= 1; len--) {
    out.push(tokens.slice(tokens.length - len).join("-"));
  }
  return out;
}

async function resolve(slugAddress: string): Promise<DeadListingTarget> {
  // ── 1. Sold? The closed collection keeps `slugAddress` on every row (all
  // 1,108,779 of them carry it), so this is an indexed single-key lookup.
  let closedCity: string | null = null;
  try {
    await dbConnect();
    const closed: any = await UnifiedClosedListing.findOne({ slugAddress })
      .select("city")
      .lean();
    closedCity = closed?.city || null;
  } catch (err) {
    // A DB error must not turn into a redirect loop or a wrong permanent hop.
    console.error(`[dead-listing] closed lookup failed for ${slugAddress}:`, err);
    return { path: LISTINGS_INDEX, permanent: false, reason: "closed-lookup-error" };
  }

  if (closedCity) {
    const slug = createSlug(closedCity);
    const live = await liveCitySlugs([slug]);
    if (live.has(slug)) {
      return {
        path: `/neighborhoods/${slug}`,
        permanent: true,
        reason: `sold:${slug}`,
      };
    }
    // Sold, but its city page would 404. Permanent is still correct — the
    // property is gone for good; only the destination falls back.
    return { path: LISTINGS_INDEX, permanent: true, reason: `sold-city-not-live:${slug}` };
  }

  // ── 2. Unknown slug. Recover the city from the slug text itself; no DB row
  // is needed for the parse, only to confirm the destination renders.
  const candidates = cityCandidatesFromSlug(slugAddress);
  const live = await liveCitySlugs(candidates);
  for (const slug of candidates) {
    // `candidates` is already longest-first.
    if (live.has(slug)) {
      return {
        path: `/neighborhoods/${slug}`,
        permanent: false,
        reason: `unknown-slug-city:${slug}`,
      };
    }
  }

  return { path: LISTINGS_INDEX, permanent: false, reason: "unresolved" };
}

/**
 * Per-request memoized so `generateMetadata` and the page body — which both
 * miss the listing and both need a destination — share one pair of queries.
 */
export const resolveDeadListingTarget = cache(resolve);

/** Exported for tests: the pure slug→candidate-city parse. */
export const __cityCandidatesFromSlug = cityCandidatesFromSlug;
