// src/lib/listings/dead-listing-redirect.ts
//
// What a /mls-listings/<slugAddress> URL needs once the listing is no longer in
// `unified_listings`: the location context for the off-market notice page.
//
// History: the detail page called `notFound()` (22,676 "Not found (404)" URLs in
// Search Console by 2026-10-24), then redirected to the city page (d2aa74c2:
// 308 when sold, 307 otherwise). Since 2026-11-02 it renders an off-market page
// instead (docs/listings/off-market-pages.md); the redirect resolver was removed
// with its last caller. The city-from-slug parsing below is what survived — it
// was verified 14/14 on live data.
//
// Note on relisting: the VPS pipeline runs `--purge` DISABLED since the
// 2026-04-06 incident, so a slug matching nothing may come back Active. The
// off-market page is a plain 200 with the listing page's short revalidate, so a
// relisting replaces it within minutes — nothing is cached permanently.
import { cache } from "react";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import UnifiedClosedListing from "@/models/unified-closed-listing";
import { createSlug } from "@/lib/utils/slug";

/** Most hyphen-tokens a California city slug is assumed to span. */
const MAX_CITY_TOKENS = 4;

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

/** Exported for tests: the pure slug→candidate-city parse. */
export const __cityCandidatesFromSlug = cityCandidatesFromSlug;

// ─── Off-market page context ────────────────────────────────────────────────
//
// Since 2026-11-02 a dead slug renders an off-market notice page instead of
// redirecting (docs/listings/off-market-pages.md). That page shows NO data
// about the property itself: MLS IDX rules (NAR model rules, adopted by CRMLS)
// prohibit displaying expired and withdrawn listings, and an unmatched slug may
// be either. The location below is used only to pick nearby ACTIVE listings
// and the community section — it is never rendered as the property's details.

export interface OffMarketContext {
  /** City display name, when known. Drives the nearby-listings query. */
  city: string | null;
  /** City page slug, only when that page renders (listingCount > 0). */
  citySlug: string | null;
  /** The community the address sits in, when we have a page for it. */
  subdivision: {
    name: string;
    cityId: string;
    slug: string;
    description?: string;
    listingCount?: number;
    medianPrice?: number;
    photo?: string;
  } | null;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function offMarketContext(slugAddress: string): Promise<OffMarketContext> {
  const empty: OffMarketContext = { city: null, citySlug: null, subdivision: null };
  try {
    await dbConnect();

    // Sold rows carry city + subdivision; unknown slugs only have the URL text.
    const closed: any = await UnifiedClosedListing.findOne({ slugAddress })
      .select("city subdivisionName")
      .lean();

    let city: string | null = closed?.city || null;
    let citySlug: string | null = null;

    if (city) {
      const slug = createSlug(city);
      if ((await liveCitySlugs([slug])).has(slug)) citySlug = slug;
    } else {
      const candidates = cityCandidatesFromSlug(slugAddress);
      const live = await liveCitySlugs(candidates);
      citySlug = candidates.find((c) => live.has(c)) || null;
      if (citySlug) {
        const row: any = await City.findOne({ slug: citySlug }).select("name").lean();
        city = row?.name || null;
      }
    }

    let subdivision: OffMarketContext["subdivision"] = null;
    const subName: string | undefined = closed?.subdivisionName;
    if (subName && city && !/^(none|n\/a|not applicable|other)$/i.test(subName.trim())) {
      const { default: Subdivision } = await import("@/models/subdivisions");
      const sub: any = await Subdivision.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(subName.trim())}$`, "i") },
        city: { $regex: new RegExp(`^${escapeRegex(city)}$`, "i") },
      })
        .select("name slug city description listingCount medianPrice photo")
        .lean();
      if (sub) {
        subdivision = {
          name: sub.name,
          cityId: createSlug(sub.city),
          slug: sub.slug,
          description: sub.description,
          listingCount: sub.listingCount,
          medianPrice: sub.medianPrice,
          photo: sub.photo,
        };
      }
    }

    return { city, citySlug, subdivision };
  } catch (err) {
    console.error(`[dead-listing] off-market context failed for ${slugAddress}:`, err);
    return empty;
  }
}

/** Per-request memoized: metadata and the page body share the lookups. */
export const resolveOffMarketContext = cache(offMarketContext);
