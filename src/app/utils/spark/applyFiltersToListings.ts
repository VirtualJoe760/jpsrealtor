import { MapListing } from "@/types/types";

type Filters = {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  pool?: boolean;
  spa?: boolean;
  associationFee?: number;
};

export function applyFiltersToListings(listings: MapListing[], filters: Filters): MapListing[] {
  return listings.filter((listing) => {
    if (filters.minPrice && listing.listPrice < filters.minPrice) return false;
    if (filters.maxPrice && listing.listPrice > filters.maxPrice) return false;
    if (filters.bedrooms && (listing.bedroomsTotal || 0) < filters.bedrooms) return false;
    if (filters.bathrooms && (listing.bathroomsFull || 0) < filters.bathrooms) return false;
    if (filters.propertyType && listing.propertyType !== filters.propertyType) return false;
    if (filters.pool && !listing.pool) return false;
    if (filters.spa && !listing.spa) return false;
    if (filters.associationFee && (listing.associationFee || 0) > filters.associationFee) return false;

    return true;
  });
}
