// src/utils/filterListings.ts

import { MapListing } from "@/types/types";

export interface ListingFilters {
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  baths?: string;
  propertyType?: string;
  pool?: boolean;
  spa?: boolean;
  hoa?: string;
  hasHOA?: boolean;
  minSqft?: string;
  maxSqft?: string;
  minLot?: string;
  maxLot?: string;
}

export function filterListings(
  listings: MapListing[],
  filters: ListingFilters
): MapListing[] {
  return listings.filter((listing) => {
    const {
      minPrice,
      maxPrice,
      beds,
      baths,
      propertyType,
      pool,
      spa,
      hoa,
      hasHOA,
      minSqft,
      maxSqft,
      minLot,
      maxLot,
    } = filters;

    const price = listing.listPrice;
    if (minPrice && price < parseInt(minPrice + "000")) return false;
    if (maxPrice && price > parseInt(maxPrice + "000")) return false;

    if (beds && (listing.bedroomsTotal || 0) < parseInt(beds)) return false;
    if (baths && (listing.bathroomsFull || 0) < parseInt(baths)) return false;

    if (propertyType && propertyType !== listing.propertyType) return false;

    if (typeof pool === "boolean" && pool && !listing.poolYn && !listing.pool) return false;
    if (typeof spa === "boolean" && spa && !listing.spaYn && !listing.spa) return false;

    if (hoa && (listing.associationFee || 0) > parseInt(hoa)) return false;
    if (hasHOA && !listing.associationFee) return false;

    if (minSqft && (listing.livingArea || 0) < parseInt(minSqft)) return false;
    if (maxSqft && (listing.livingArea || 0) > parseInt(maxSqft)) return false;

    if (minLot && (listing.lotSizeSqft || 0) < parseInt(minLot)) return false;
    if (maxLot && (listing.lotSizeSqft || 0) > parseInt(maxLot)) return false;

    return true;
  });
}
