export type ComparableSale = {
  listingKey: string; listingId?: string; address: string; closePrice?: number; closeDate?: string;
  bedsTotal?: number; bathroomsTotalDecimal?: number; bathroomsFull?: number; livingArea?: number;
  yearBuilt?: number; lotSizeAcres?: number; poolYN?: boolean; propertyType?: string; propertySubType?: string;
  distance?: number; mlsSource?: string; latitude?: number | string; longitude?: number | string;
  externalPhotos?: { url: string; caption?: string; sourcePage?: string; source?: string }[];
  primaryPhotoUrl?: string; publicRemarks?: string;
  media?: { Uri800?: string; Uri1024?: string; Uri640?: string; UriLarge?: string; MediaURL?: string; Order?: number; Caption?: string; ShortDescription?: string }[];
};
export function comparablePhotos(sale: ComparableSale) {
  const safe = (url?: string) => typeof url === 'string' && /^https?:\/\//i.test(url) ? url : undefined;
  const photos: { url: string; caption: string; sourcePage?: string; source?: string }[] = [...(sale.media || [])].sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0)).flatMap(row => {
    const url = [row.Uri800, row.Uri1024, row.Uri640, row.UriLarge, row.MediaURL].map(safe).find(Boolean);
    return url ? [{ url, caption: row.Caption || row.ShortDescription || sale.address }] : [];
  });
  const primary = safe(sale.primaryPhotoUrl);
  if (primary && !photos.some(photo => photo.url === primary)) photos.unshift({ url: primary, caption: sale.address });
  if (!photos.length) for (const photo of sale.externalPhotos || []) { const url = safe(photo.url); if (url) photos.push({ url, caption: photo.caption || sale.address, sourcePage: photo.sourcePage, source: photo.source }); }
  return photos.filter((photo, index) => photos.findIndex(item => item.url === photo.url) === index);
}
export function comparableFacts(sale: ComparableSale) {
  return [
    ['Sold price', typeof sale.closePrice === 'number' ? sale.closePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'Unavailable'],
    ['Sold date', sale.closeDate && Number.isFinite(Date.parse(sale.closeDate)) ? new Date(sale.closeDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'Unavailable'],
    ['Beds', sale.bedsTotal ?? 'Unavailable'], ['Baths', sale.bathroomsTotalDecimal ?? sale.bathroomsFull ?? 'Unavailable'],
    ['Living area', sale.livingArea !== undefined ? `${sale.livingArea.toLocaleString()} sq ft` : 'Unavailable'],
    ['Year built', sale.yearBuilt ?? 'Unavailable'], ['Lot size', sale.lotSizeAcres !== undefined ? `${sale.lotSizeAcres} acres` : 'Unavailable'],
    ['Pool', sale.poolYN === undefined ? 'Unavailable' : sale.poolYN ? 'Yes' : 'No'],
    ['Property type', sale.propertySubType || sale.propertyType || 'Unavailable'], ['MLS', sale.mlsSource || 'Unavailable'],
    ['Listing ID', sale.listingId || sale.listingKey],
  ] as const;
}
