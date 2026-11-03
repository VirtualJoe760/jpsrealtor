// src/lib/listings/listing-post.ts
//
// Server helpers for the CMS "listing blog post" (Article category
// `listing-post`, docs/cms/README.md → "Listing blog posts").
//
// A listing post stores only a reference to the listing (listingKey +
// slugAddress). Everything shown about the property is read here, live, from
// the synced MLS collections — photos straight from the listing's synced media
// (no Cloudinary rehost; the photos belong to the listing brokerage and are
// never altered), and sold comparables from unified_closed_listings, which is
// a DIFFERENT collection from the Active-only unified_listings.

import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import UnifiedClosedListing from "@/models/unified-closed-listing";
import Subdivision from "@/models/subdivisions";
import { City } from "@/models/cities";
import { getEnrichedListing, getListingPhotosFromListing } from "@/lib/listings/listing-detail";

export interface ListingSearchHit {
  listingKey: string;
  slugAddress: string;
  address: string;
  city: string;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  photo: string | null;
  openHouses: Array<{ date: string; startTime: string; endTime: string }>;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "123 Main St, Palm" → "123-main-st-palm" — the slugAddress shape. */
function toSlugPrefix(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
}

function primaryPhoto(media: any[] | undefined): string | null {
  const m = media || [];
  const p = m.find((x: any) => x.MediaCategory === "Primary Photo" || x.Order === 0) || m[0];
  return p?.Uri800 || p?.Uri640 || p?.Uri1024 || null;
}

function mapOpenHouses(list: any[] | undefined) {
  return (list || [])
    .filter((o: any) => o && o.Date)
    .map((o: any) => ({ date: String(o.Date), startTime: String(o.StartTime || ""), endTime: String(o.EndTime || "") }));
}

/**
 * Address autocomplete over ACTIVE listings. Anchored prefix on the indexed
 * `slugAddress` first (fast); falls back to a case-insensitive match on the
 * street line when the slug misses (e.g. a typed unit number or "#").
 */
export async function searchActiveListingsByAddress(q: string, limit = 8): Promise<ListingSearchHit[]> {
  const query = q.trim();
  if (query.length < 3) return [];
  await dbConnect();

  const projection = {
    listingKey: 1, slugAddress: 1, unparsedAddress: 1, unparsedFirstLineAddress: 1, city: 1,
    listPrice: 1, bedroomsTotal: 1, bedsTotal: 1, bathroomsTotalInteger: 1, bathsTotal: 1,
    "media.Uri800": 1, "media.Uri640": 1, "media.MediaCategory": 1, "media.Order": 1, OpenHouses: 1,
  };

  const slug = toSlugPrefix(query);
  let rows: any[] = slug
    ? await UnifiedListing.collection
        .find({ slugAddress: { $regex: "^" + escapeRegex(slug) }, standardStatus: "Active" }, { projection })
        .limit(limit)
        .toArray()
    : [];

  if (rows.length === 0) {
    rows = await UnifiedListing.collection
      .find(
        { unparsedAddress: { $regex: "^" + escapeRegex(query), $options: "i" }, standardStatus: "Active" },
        { projection }
      )
      .limit(limit)
      .toArray();
  }

  return rows.map((r) => ({
    listingKey: r.listingKey,
    slugAddress: r.slugAddress || r.listingKey,
    address: r.unparsedAddress || r.unparsedFirstLineAddress || "",
    city: r.city || "",
    listPrice: typeof r.listPrice === "number" ? r.listPrice : null,
    beds: r.bedroomsTotal ?? r.bedsTotal ?? null,
    baths: r.bathroomsTotalInteger ?? r.bathsTotal ?? null,
    photo: primaryPhoto(r.media),
    openHouses: mapOpenHouses(r.OpenHouses),
  }));
}

export interface ListingPostPhoto {
  type: "photo";
  src: string;
  alt: string;
}

export interface ListingPostSubdivision {
  name: string;
  slug: string;
  description?: string;
  listingCount?: number;
  medianPrice?: number;
  priceRange?: { min: number; max: number };
  communityType?: string;
  hoaMonthlyMin?: number;
  hoaMonthlyMax?: number;
  features?: string[];
}

export interface ListingPostCity {
  name: string;
  slug: string;
  description?: string;
  listingCount?: number;
  medianPrice?: number;
  subdivisionCount?: number;
  region?: string;
}

export interface ListingPostData {
  listing: any; // enriched listing (JSON-safe)
  photos: ListingPostPhoto[];
  subdivision: ListingPostSubdivision | null;
  city: ListingPostCity | null;
}

/**
 * Everything the public listing-post page renders, read in-process.
 * Returns null when the listing can no longer be found.
 */
export async function loadListingPostData(ref: { slugAddress?: string; listingKey: string }): Promise<ListingPostData | null> {
  const listing: any =
    (ref.slugAddress ? await getEnrichedListing(ref.slugAddress).catch(() => null) : null) ||
    (await getEnrichedListing(ref.listingKey).catch(() => null));
  if (!listing) return null;

  const fallback = listing.primaryPhotoUrl || "/images/no-photo.png";
  let photos: ListingPostPhoto[] = [];
  try {
    const res = await getListingPhotosFromListing(listing);
    photos = (res.photos || [])
      .map((p: any) => ({
        type: "photo" as const,
        src: p.uri2048 || p.uri1600 || p.uri1280 || p.uri1024 || p.uri800 || p.uriLarge || p.uriThumb || "",
        alt: p.caption || p.shortDescription || "Listing photo",
      }))
      .filter((p) => p.src);
  } catch (err) {
    console.error(`[listing-post] photos failed for ${listing.listingKey}:`, err);
  }
  if (photos.length === 0) photos = [{ type: "photo", src: fallback, alt: "Listing photo" }];

  await dbConnect();
  const [sub, city]: [any, any] = await Promise.all([
    listing.subdivisionName
      ? Subdivision.findOne({ name: listing.subdivisionName, ...(listing.city ? { city: listing.city } : {}) })
          .select("name slug description listingCount medianPrice priceRange features communityFacts.communityType communityFacts.hoaMonthlyMin communityFacts.hoaMonthlyMax")
          .lean()
      : null,
    listing.city
      ? City.findOne({ name: listing.city })
          .select("name slug description listingCount medianPrice subdivisionCount region")
          .lean()
      : null,
  ]);

  return JSON.parse(
    JSON.stringify({
      listing,
      photos,
      subdivision: sub
        ? {
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            listingCount: sub.listingCount,
            medianPrice: sub.medianPrice,
            priceRange: sub.priceRange,
            communityType: sub.communityFacts?.communityType,
            hoaMonthlyMin: sub.communityFacts?.hoaMonthlyMin,
            hoaMonthlyMax: sub.communityFacts?.hoaMonthlyMax,
            features: (sub.features || []).slice(0, 8),
          }
        : null,
      city: city
        ? {
            name: city.name,
            slug: city.slug,
            description: city.description,
            listingCount: city.listingCount,
            medianPrice: city.medianPrice,
            subdivisionCount: city.subdivisionCount,
            region: city.region,
          }
        : null,
    })
  );
}

export interface SoldComparable {
  address: string;
  closePrice: number | null;
  closeDate: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
}

/**
 * Recently sold comparables for a listing, from unified_closed_listings (the
 * closed collection). Same filters as the skill comparables route: same
 * property type, same subdivision (else city), ±20% of list price, ±1 bed/bath,
 * closed in the last 6 months. Newest first.
 */
export async function findRecentSoldComparables(listingKey: string, limit = 8): Promise<SoldComparable[]> {
  await dbConnect();
  const subject: any = await UnifiedListing.findOne({ listingKey })
    .select("listingKey city subdivisionName propertyType listPrice bedroomsTotal bedsTotal bathroomsTotalInteger bathsTotal")
    .lean();
  if (!subject) return [];

  const beds = subject.bedroomsTotal ?? subject.bedsTotal ?? null;
  const baths = subject.bathroomsTotalInteger ?? subject.bathsTotal ?? null;
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const q: Record<string, any> = { propertyType: subject.propertyType };
  if (subject.subdivisionName) q.subdivisionName = subject.subdivisionName;
  else if (subject.city) q.city = subject.city;
  if (typeof subject.listPrice === "number") {
    q.closePrice = { $gte: Math.floor(subject.listPrice * 0.8), $lte: Math.ceil(subject.listPrice * 1.2) };
  }
  // closeDate is a Date on some rows and an ISO day string on others.
  const and: any[] = [{ $or: [{ closeDate: { $gte: since } }, { closeDate: { $gte: since.toISOString().slice(0, 10) } }] }];
  if (beds != null) {
    const r = { $gte: beds - 1, $lte: beds + 1 };
    and.push({ $or: [{ bedroomsTotal: r }, { bedsTotal: r }] });
  }
  if (baths != null) {
    const r = { $gte: baths - 1, $lte: baths + 1 };
    and.push({ $or: [{ bathroomsTotalInteger: r }, { bathsTotal: r }] });
  }
  q.$and = and;

  const rows: any[] = await UnifiedClosedListing.collection
    .find(q, {
      projection: {
        unparsedAddress: 1, closePrice: 1, closeDate: 1, bedroomsTotal: 1, bedsTotal: 1,
        bathroomsTotalInteger: 1, bathsTotal: 1, livingArea: 1,
      },
    })
    .sort({ closeDate: -1 })
    .limit(limit)
    .toArray();

  return rows.map((c) => ({
    address: c.unparsedAddress || "",
    closePrice: typeof c.closePrice === "number" ? c.closePrice : null,
    closeDate: c.closeDate ? new Date(c.closeDate).toISOString().slice(0, 10) : null,
    beds: c.bedroomsTotal ?? c.bedsTotal ?? null,
    baths: c.bathroomsTotalInteger ?? c.bathsTotal ?? null,
    sqft: typeof c.livingArea === "number" ? c.livingArea : null,
  }));
}
