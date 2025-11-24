// src/app/utils/mls/normalizeListing.ts
// Normalizes GPS and CRMLS listings to a unified format matching tile properties

export interface NormalizedListing {
  listingKey: string;
  slug: string;
  listPrice: number;
  city?: string;
  beds?: number;
  baths?: number;
  propertyType?: string;
  propertySubType?: string;
  livingArea?: number;
  poolYn?: boolean;
  spaYn?: boolean;
  associationFee?: number;
  unparsedAddress?: string;
  mlsSource: 'GPS' | 'CRMLS';
  latitude: number;
  longitude: number;
}

export function normalizeListing(listing: any, mlsSource: 'GPS' | 'CRMLS'): NormalizedListing {
  return {
    listingKey: listing.listingKey || listing.listingId || '',
    slug: listing.slug || listing.listingKey || listing.listingId || '',
    listPrice: listing.listPrice || 0,
    city: listing.city,
    beds: listing.bedroomsTotal || listing.bedsTotal,
    baths: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger,
    propertyType: listing.propertyType,
    propertySubType: listing.propertySubType,
    livingArea: listing.livingArea,
    poolYn: listing.poolYn || listing.pool,
    spaYn: listing.spaYn || listing.spa,
    associationFee: listing.associationFee,
    unparsedAddress: listing.unparsedAddress || listing.address,
    mlsSource,
    latitude: listing.latitude,
    longitude: listing.longitude,
  };
}

export function normalizeListings(
  gpsListings: any[],
  crmlsListings: any[]
): NormalizedListing[] {
  const gpsNormalized = gpsListings.map((l) => normalizeListing(l, 'GPS'));
  const crmlsNormalized = crmlsListings.map((l) => normalizeListing(l, 'CRMLS'));

  // Merge and deduplicate by listingKey
  const listingMap = new Map<string, NormalizedListing>();

  [...gpsNormalized, ...crmlsNormalized].forEach((listing) => {
    if (listing.listingKey && !listingMap.has(listing.listingKey)) {
      listingMap.set(listing.listingKey, listing);
    }
  });

  return Array.from(listingMap.values());
}
