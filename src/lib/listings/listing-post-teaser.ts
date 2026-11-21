// src/lib/listings/listing-post-teaser.ts
//
// The half of a listing post an UNREGISTERED visitor is allowed to receive.
//
// This is the security boundary for the registration gate. The overlay in
// ListingPostGate.tsx is presentation: it decides when the wall appears, and a
// determined visitor can remove it from the DOM in a second. What actually
// keeps the gated half private is that the server never puts it in the response
// — which is this file's job.
//
// So: the page loads the full record once (one in-process read we need anyway
// for the title, price and OG tags), then projects it down to `ListingPostTeaser`
// before handing anything to a client component. If a field is not named here,
// an unregistered visitor does not get it.
//
// Deliberately PUBLIC, because the gate must not cost us the SEO that fills it:
//   - address, price, beds/baths/sqft/lot/year/type   (the RealEstateListing JSON-LD)
//   - the open-house date and time                    (the Event JSON-LD)
//   - the first few photos                            (the og:image and the hook)
//   - MLS attribution and the agent's identity        (compliance — never gated)

import type {
  ListingPostData,
  ListingPostPhoto,
  ListingPostSubdivision,
  ListingPostCity,
} from "./listing-post";

/** Photos an unregistered visitor sees. The rest become "+N more". */
export const TEASER_PHOTO_COUNT = 5;

/** Characters of the listing's public remarks shown before the fade. */
const TEASER_REMARKS_CHARS = 260;

export interface TeaserListing {
  listingKey: string;
  unparsedAddress: string;
  unparsedFirstLineAddress: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  subdivisionName: string;
  listPrice: number | null;
  standardStatus: string;
  bedroomsTotal: number | null;
  bathroomsTotalInteger: number | null;
  livingArea: number | null;
  lotSizeSqft: number | null;
  yearBuilt: number | null;
  propertySubType: string;
  hoaFee: number | null;
  hoaFeeFrequency: string;
  /** Truncated at a word boundary; the full text is gated. */
  remarksTeaser: string;
  /** True when there is more to read, so the UI knows to fade. */
  remarksTruncated: boolean;
  // Attribution — required on screen whether or not the visitor registered.
  listingId: string;
  listOfficeName: string;
  listAgentFullName: string;
  mlsName: string;
}

export interface ListingPostTeaser {
  listing: TeaserListing;
  photos: ListingPostPhoto[];
  /** Total count, so the UI can say "+27 locked" without shipping 27 URLs. */
  photoCount: number;
  hasVideo: boolean;
  /** Names only — the stats behind them are gated. */
  subdivisionName: string | null;
  cityName: string | null;
}

/** Everything held back until the visitor registers. */
export interface ListingPostGated {
  listing: Record<string, unknown>;
  photos: ListingPostPhoto[];
  subdivision: ListingPostSubdivision | null;
  city: ListingPostCity | null;
  latitude: number | null;
  longitude: number | null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Cut at the last word boundary at or before `max`, so no half words. */
function truncate(text: string, max: number): { text: string; truncated: boolean } {
  const clean = text.trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return { text: (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd(), truncated: true };
}

export function toTeaser(data: ListingPostData, videoUrl?: string | null): ListingPostTeaser {
  const l = (data.listing || {}) as Record<string, unknown>;
  const remarks = truncate(str(l.publicRemarks), TEASER_REMARKS_CHARS);

  return {
    listing: {
      listingKey: str(l.listingKey),
      unparsedAddress: str(l.unparsedAddress) || str(l.unparsedFirstLineAddress) || str(l.address),
      unparsedFirstLineAddress: str(l.unparsedFirstLineAddress),
      city: str(l.city),
      stateOrProvince: str(l.stateOrProvince) || "CA",
      postalCode: str(l.postalCode),
      subdivisionName: str(l.subdivisionName),
      listPrice: num(l.listPrice),
      standardStatus: str(l.standardStatus),
      bedroomsTotal: num(l.bedroomsTotal) ?? num(l.bedsTotal),
      bathroomsTotalInteger: num(l.bathroomsTotalInteger) ?? num(l.bathsTotal),
      livingArea: num(l.livingArea),
      lotSizeSqft: num(l.lotSizeSqft) ?? num(l.lotSizeArea),
      yearBuilt: num(l.yearBuilt),
      propertySubType: str(l.propertySubType) || str(l.propertyTypeName),
      hoaFee: num(l.hoaFee),
      hoaFeeFrequency: str(l.hoaFeeFrequency),
      remarksTeaser: remarks.text,
      remarksTruncated: remarks.truncated,
      listingId: str(l.listingId) || str(l.listingKey),
      listOfficeName: str(l.listOfficeName),
      listAgentFullName: str(l.listAgentFullName),
      mlsName: str(l.mlsName) || str(l.originatingSystemName),
    },
    photos: (data.photos || []).slice(0, TEASER_PHOTO_COUNT),
    photoCount: (data.photos || []).length,
    hasVideo: !!videoUrl,
    subdivisionName: data.subdivision?.name || null,
    cityName: data.city?.name || null,
  };
}

export function toGated(data: ListingPostData): ListingPostGated {
  const l = (data.listing || {}) as Record<string, unknown>;
  const lat = Number(l.latitude);
  const lng = Number(l.longitude);
  return {
    listing: l,
    photos: data.photos || [],
    subdivision: data.subdivision,
    city: data.city,
    latitude: Number.isFinite(lat) && lat !== 0 ? lat : null,
    longitude: Number.isFinite(lng) && lng !== 0 ? lng : null,
  };
}
