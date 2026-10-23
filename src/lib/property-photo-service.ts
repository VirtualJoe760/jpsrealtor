import crypto from 'node:crypto';
import type { Model } from 'mongoose';
import Contact from '@/models/Contact';
import UnifiedListing from '@/models/unified-listing';
import UnifiedClosedListing from '@/models/unified-closed-listing';
import PropertyPhotoCache from '@/models/PropertyPhotoCache';
import { addressKey, normalizedAddress, crawlPropertyPhotos, type PhotoAddress } from './property-photo-discovery';

let cacheIndex: Promise<unknown> | undefined;
async function ensureCacheIndex() {
  cacheIndex ||= PropertyPhotoCache.collection.createIndex({ addressKey: 1 }, { unique: true }).catch(error => { cacheIndex = undefined; throw error; });
  await cacheIndex;
}
type Target = { model: Model<any>; id: unknown; userId?: string };
function nativePhotos(listing: any) {
  const images = (listing.media || []).map((item: any, index: number) => ({ url: item.Uri1280 || item.Uri1024 || item.Uri800 || item.Uri640 || item.MediaURL, source: 'MLS', caption: item.Caption || listing.unparsedAddress || '', order: item.Order ?? index })).filter((item: any) => /^https?:\/\//.test(item.url || ''));
  if (!images.length && /^https?:\/\//.test(listing.primaryPhotoUrl || '')) images.push({ url: listing.primaryPhotoUrl, source: 'MLS', caption: listing.unparsedAddress || '', order: 0 });
  return images;
}
function exactListing(listing: any, address: PhotoAddress) {
  const street = listing.unparsedAddress?.split(',')[0] || [listing.streetNumber, listing.streetName, listing.streetSuffix, listing.unitNumber ? 'unit ' + listing.unitNumber : ''].filter(Boolean).join(' ');
  return normalizedAddress(street) === normalizedAddress(address.street || '') && normalizedAddress(listing.city || '') === normalizedAddress(address.city || '') && normalizedAddress(listing.stateOrProvince || '') === normalizedAddress(address.state || '') && (!address.zip || String(listing.postalCode || '').slice(0,5) === address.zip.slice(0,5));
}
async function seed(target: Target, photos: any[], key: string) {
  if (!photos.length) return;
  const filter: any = { _id: target.id, ...(target.userId ? { userId: target.userId } : {}) };
  // Re-read identity before caching: an address edit during the lookup must not receive the old home's photos.
  const latest: any = await target.model.findOne(filter).lean();
  if (!latest) return;
  const latestAddress = target.userId ? latest.address : listingAddress(latest);
  if (addressKey(latestAddress) !== key) return;
  const identity = target.userId ? { 'address.street': latest.address?.street, 'address.city': latest.address?.city, 'address.state': latest.address?.state, 'address.zip': latest.address?.zip } : { unparsedAddress: latest.unparsedAddress, streetNumber: latest.streetNumber, streetName: latest.streetName, unitNumber: latest.unitNumber, city: latest.city, stateOrProvince: latest.stateOrProvince, postalCode: latest.postalCode };
  await target.model.updateOne({ ...filter, ...identity }, { $set: { externalPhotos: photos } });
}
export function listingAddress(listing: any): PhotoAddress {
  return { street: listing.unparsedAddress?.split(',')[0] || [listing.streetNumber, listing.streetName, listing.streetSuffix, listing.unitNumber ? 'unit ' + listing.unitNumber : ''].filter(Boolean).join(' '), city: listing.city, state: listing.stateOrProvince, zip: listing.postalCode };
}
export async function resolvePropertyPhotos(address: PhotoAddress, target: Target, discover: boolean, sourceUrl?: string) {
  await ensureCacheIndex();
  const key = addressKey(address);
  if (!address.street || !address.city || !address.state) return { success: true, images: [], source: 'none', message: 'A complete street, city and state are needed for photo lookup.' };
  const cached = await PropertyPhotoCache.findOne({ addressKey: key }).lean() as any;
  if (cached?.photos?.length && !sourceUrl) { if (discover) await seed(target, cached.photos, key); return { success: true, images: cached.photos, source: 'web', cached: true, message: 'Cached address-matched photos.' }; }
  if (!sourceUrl && cached?.retryAfter > new Date()) return { success: true, images: [], source: 'none', message: cached.message, retryAfter: cached.retryAfter };
  // A house-number query narrows candidates; full normalized address verification happens before accepting any image.
  const number = address.street.trim().split(/\s+/)[0];
  const escaped = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cities = [...new Set([address.city, address.city.toUpperCase(), address.city.toLowerCase().replace(/\b\w/g, value => value.toUpperCase())])];
  const query = { city: { $in: cities }, $or: [{ streetNumber: number }, { unparsedAddress: { $regex: '^' + escaped + '(?:\\s|,)', $options: 'i' } }] };
  const sources: [Model<any>, string][] = [[UnifiedListing, 'active'], [UnifiedClosedListing, 'closed']];
  for (const [model, source] of sourceUrl ? [] : sources) {
    const candidates = await model.find(query).limit(20).select('unparsedAddress streetNumber streetName streetSuffix unitNumber city stateOrProvince postalCode primaryPhotoUrl media externalPhotos').maxTimeMS(1500).lean().catch((error: any) => { if (error.code === 50) return []; throw error; });
    for (const listing of candidates) if (exactListing(listing, address)) {
      const images = nativePhotos(listing);
      if (images.length) return { success: true, images, source, message: 'Address-matched MLS photos.' };
      if ((listing as any).externalPhotos?.length) { const photos = (listing as any).externalPhotos; if (discover) await seed(target, photos, key); return { success: true, images: photos, source: 'web', cached: true }; }
    }
  }
  if (!discover) return { success: true, images: [], source: 'none', message: cached?.message || 'No cached property photos yet.' };
  const now = new Date();
  await PropertyPhotoCache.updateOne({ addressKey: key }, { $setOnInsert: { addressKey: key } }, { upsert: true }).catch((error: any) => { if (error.code !== 11000) throw error; });
  const token = crypto.randomUUID();
  const lock = await PropertyPhotoCache.findOneAndUpdate({ addressKey: key, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }] }, { $set: { leaseUntil: new Date(Date.now()+120000), leaseToken: token } }, { new: true });
  if (!lock) return { success: true, images: [], source: 'none', message: 'A photo lookup is already running. Try again shortly.' };
  try {
    const result = await crawlPropertyPhotos(address, sourceUrl);
    const photos = result.photos.length ? result.photos : cached?.photos || [];
    await PropertyPhotoCache.updateOne({ addressKey: key, leaseToken: token }, { $set: { photos, message: result.message, checkedAt: new Date(), retryAfter: new Date(Date.now() + (photos.length ? 30*86400000 : 3600000)) }, $unset: { leaseUntil: 1, leaseToken: 1 } });
    await seed(target, photos, key);
    return { success: true, images: photos, source: photos.length ? 'web' : 'none', message: result.message };
  } finally { await PropertyPhotoCache.updateOne({ addressKey: key, leaseToken: token }, { $unset: { leaseUntil: 1, leaseToken: 1 } }); }
}
