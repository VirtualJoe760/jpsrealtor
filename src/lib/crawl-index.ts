// Data for the server-rendered crawl graph (see components/seo/CrawlableLinks).
//
// Scope deliberately mirrors sitemap-generator.ts: Southern California, CV
// first. A page linked here but absent from the sitemap (or vice versa) sends
// Google mixed signals, so both read the same City/Subdivision collections.

import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import UnifiedListing from "@/models/unified-listing";
import { CRMLSListing } from "@/models/crmls-listings";
import Subdivision from "@/models/subdivisions";
import { NON_PLACE_SUBDIVISION_NAMES } from "@/lib/neighborhoods-data";
import { FOR_SALE_PRICE_FLOOR } from "@/lib/market-stats";
import { CITY_MIN_ACTIVE } from "@/lib/indexability";
import type { CrawlLink } from "@/app/components/seo/CrawlableLinks";

const SOCAL_COUNTIES = [
  "Los Angeles", "Orange", "Riverside", "San Bernardino",
  "San Diego", "Ventura", "Imperial", "Santa Barbara",
];

/** Every SoCal city with inventory, busiest first. */
export async function getSoCalCityLinks(): Promise<CrawlLink[]> {
  try {
    await dbConnect();
    const rows = await City.find({
      listingCount: { $gt: 0 },
      county: { $in: SOCAL_COUNTIES },
    })
      .select("name slug listingCount")
      .sort({ listingCount: -1 })
      .lean();

    return (rows as any[])
      .filter((r) => r?.slug && r?.name)
      .map((r) => ({
        href: `/neighborhoods/${r.slug}`,
        label: r.name,
        meta: r.listingCount || undefined,
      }));
  } catch (error) {
    console.error("[CrawlIndex] getSoCalCityLinks failed:", error);
    return [];
  }
}

/**
 * Active listings in one city, as links. This is the edge that was missing
 * entirely: without it a listing page has no inbound internal link anywhere
 * on the site, so Google can only ever learn of it from the sitemap.
 */
export async function getCityListingLinks(
  cityName: string,
  limit = 250,
): Promise<CrawlLink[]> {
  if (!cityName) return [];
  try {
    await dbConnect();
    const filter = {
      standardStatus: "Active",
      propertyType: "A",
      city: cityName,
      slugAddress: { $exists: true, $ne: null },
    };
    const select = "slugAddress unparsedAddress listPrice";

    // NO .sort() here, deliberately. There is no compound index covering
    // {city, standardStatus, propertyType} + modificationTimestamp, so sorting
    // forces a full collection scan plus an in-memory sort: measured at 37.7s
    // for Los Angeles on 2026-10-11, which would make the page unusable and
    // get it abandoned by Googlebot. Unsorted, Mongo streams the first `limit`
    // matches and stops. Crawl links have no meaningful order, so this costs
    // nothing. Add that compound index and the sort can come back.
    const [gps, crmls] = await Promise.all([
      UnifiedListing.find(filter as any)
        .select(select).limit(limit).lean(),
      CRMLSListing.find(filter as any)
        .select(select).limit(limit).lean(),
    ]);

    const seen = new Set<string>();
    const links: CrawlLink[] = [];
    for (const l of [...gps, ...crmls] as any[]) {
      const slug = l?.slugAddress;
      if (!slug || seen.has(slug) || /[&<>"']/.test(slug)) continue;
      seen.add(slug);
      links.push({
        href: `/mls-listings/${slug}`,
        label: l.unparsedAddress || slug.replace(/-/g, " "),
      });
      if (links.length >= limit) break;
    }
    return links;
  } catch (error) {
    console.error("[CrawlIndex] getCityListingLinks failed:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────
// Lateral links (added 2026-10-14)
// ─────────────────────────────────────────────────────
//
// Until now the crawl graph was strictly vertical: hub → city → listing. A city
// page linked UP to its county and DOWN to its listings and never sideways, so
// a city with a weak inbound profile had exactly one path in. Lateral links
// between sibling places are what let authority spread across a region instead
// of pooling at the hub, and they are also the thing that makes "every
// indexable page reachable within 3 clicks of the homepage" true rather than
// aspirational.

/** Great-circle distance in miles. Cheap enough to run over ~1,000 city rows. */
function distanceMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 7917.5 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The nearest cities in the same marketing region that are worth linking to.
 *
 * "Worth linking to" is approximated by active residential inventory rather
 * than by calling getCityIndexability() on each candidate: the full gate needs
 * a closed-sales aggregation per city, and paying for six of those on every
 * city page render would cost more than the links are worth. One count
 * aggregation covers all candidates at once. A city that clears the active
 * threshold but fails the closed one still gets linked — it is live, it is
 * `follow`, and the link is not a claim that it is indexed.
 */
export async function getNearbyCityLinks(
  cityName: string,
  limit = 6,
): Promise<CrawlLink[]> {
  if (!cityName) return [];
  try {
    await dbConnect();
    const self: any = await City.findOne({ name: cityName })
      .select("name region coordinates")
      .lean();
    if (!self?.region || !self?.coordinates?.latitude) return [];

    const siblings = (await City.find({
      region: self.region,
      name: { $ne: cityName },
      listingCount: { $gt: 0 },
      "coordinates.latitude": { $exists: true },
    })
      .select("name slug coordinates")
      .lean()) as any[];

    // Over-fetch by 3x before the inventory filter so a run of thin neighbours
    // does not leave the block empty.
    const candidates = siblings
      .filter((c) => c?.slug && c?.coordinates?.latitude)
      .map((c) => ({ ...c, miles: distanceMiles(self.coordinates, c.coordinates) }))
      .sort((a, b) => a.miles - b.miles)
      .slice(0, limit * 3);
    if (!candidates.length) return [];

    const mongooseMod = await import("mongoose");
    const db = mongooseMod.default.connection.db;
    if (!db) return [];
    const counts = await db
      .collection("unified_listings")
      .aggregate([
        {
          $match: {
            city: { $in: candidates.map((c) => c.name) },
            standardStatus: "Active",
            propertyType: "A",
            listPrice: { $gte: FOR_SALE_PRICE_FLOOR },
          },
        },
        { $group: { _id: "$city", n: { $sum: 1 } } },
      ])
      .toArray();
    const countByCity = new Map(counts.map((c: any) => [String(c._id), c.n as number]));

    return candidates
      .filter((c) => (countByCity.get(c.name) || 0) >= CITY_MIN_ACTIVE)
      .slice(0, limit)
      .map((c) => ({
        href: `/neighborhoods/${c.slug}`,
        label: c.name,
        meta: countByCity.get(c.name),
      }));
  } catch (error) {
    console.error("[CrawlIndex] getNearbyCityLinks failed:", error);
    return [];
  }
}

/**
 * Other subdivisions in the same city.
 *
 * Subdivision pages had no sibling links at all: the only way between two
 * communities in Indio was back up through the city page. "Not Applicable" and
 * friends are excluded via the one shared list so this agrees with the
 * directory and the sitemap.
 */
export async function getSiblingSubdivisionLinks(
  cityName: string,
  citySlug: string,
  excludeSlug: string,
  limit = 12,
): Promise<CrawlLink[]> {
  if (!cityName) return [];
  try {
    await dbConnect();
    const rows = (await Subdivision.find({
      city: cityName,
      slug: { $ne: excludeSlug },
      listingCount: { $gt: 0 },
      name: { $nin: NON_PLACE_SUBDIVISION_NAMES },
    })
      .select("name slug listingCount")
      .sort({ listingCount: -1 })
      .limit(limit)
      .lean()) as any[];

    return rows
      .filter((r) => r?.slug && r?.name)
      .map((r) => ({
        href: `/neighborhoods/${citySlug}/${r.slug}`,
        label: r.name,
        meta: r.listingCount || undefined,
      }));
  } catch (error) {
    console.error("[CrawlIndex] getSiblingSubdivisionLinks failed:", error);
    return [];
  }
}

/**
 * Active listing links for one subdivision.
 *
 * The subdivision page rendered its listings entirely client-side under
 * "Available Homes", so Googlebot saw "Loading listings..." and no anchors at
 * all — unlike the city page, which at least had its link list. These are the
 * only inbound internal links a listing in a small community ever gets.
 */
export async function getSubdivisionListingLinks(
  subdivisionName: string,
  limit = 100,
): Promise<CrawlLink[]> {
  if (!subdivisionName) return [];
  try {
    await dbConnect();
    const rows = (await UnifiedListing.find({
      subdivisionName,
      standardStatus: "Active",
      propertyType: "A",
      slugAddress: { $exists: true, $ne: null },
    } as any)
      .select("slugAddress unparsedAddress listPrice")
      .limit(limit)
      .lean()) as any[];

    const seen = new Set<string>();
    const links: CrawlLink[] = [];
    for (const l of rows) {
      const slug = l?.slugAddress;
      if (!slug || seen.has(slug) || /[&<>"']/.test(slug)) continue;
      seen.add(slug);
      links.push({
        href: `/mls-listings/${slug}`,
        label: l.unparsedAddress || slug.replace(/-/g, " "),
      });
    }
    return links;
  } catch (error) {
    console.error("[CrawlIndex] getSubdivisionListingLinks failed:", error);
    return [];
  }
}
