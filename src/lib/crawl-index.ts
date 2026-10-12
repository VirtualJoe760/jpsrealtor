// Data for the server-rendered crawl graph (see components/seo/CrawlableLinks).
//
// Scope deliberately mirrors sitemap-generator.ts: Southern California, CV
// first. A page linked here but absent from the sitemap (or vice versa) sends
// Google mixed signals, so both read the same City/Subdivision collections.

import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import UnifiedListing from "@/models/unified-listing";
import { CRMLSListing } from "@/models/crmls-listings";
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
