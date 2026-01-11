/**
 * Contact Property Images API
 *
 * Fetches property images for a contact's address from:
 * 1. Active MLS listings (unified_listings)
 * 2. Closed MLS listings (unified_closed_listings)
 * 3. Google Street View (fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import UnifiedListing from '@/models/unified-listing';
import UnifiedClosedListing from '@/models/unified-closed-listing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = await params;

    // Get contact
    const contact = await Contact.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Check if contact has address
    if (!contact.address?.street) {
      return NextResponse.json({
        success: true,
        images: [],
        source: 'none',
        message: 'Contact has no address',
      });
    }

    const images: any[] = [];
    let source = 'none';

    // Build address search patterns
    const street = contact.address.street;
    const city = contact.address.city || '';
    const state = contact.address.state || '';
    const zip = contact.address.zip || '';

    console.log('='.repeat(80));
    console.log(`[Property Images API] 📸 PHOTO FETCHING PROCESS FOR CONTACT ${id}`);
    console.log('='.repeat(80));
    console.log(`[Property Images API] Contact Address:`);
    console.log(`[Property Images API]   Street: ${street}`);
    console.log(`[Property Images API]   City:   ${city}`);
    console.log(`[Property Images API]   State:  ${state}`);
    console.log(`[Property Images API]   Zip:    ${zip}`);
    console.log('');
    console.log(`[Property Images API] 🔍 THREE-TIER SEARCH STRATEGY:`);
    console.log(`[Property Images API]   1. Active MLS Listings (unified_listings)`);
    console.log(`[Property Images API]   2. Closed MLS Listings (unified_closed_listings)`);
    console.log(`[Property Images API]   3. Google Street View (fallback)`);
    console.log('');

    // Strategy 1: Search active listings (unified_listings)
    console.log(`[Property Images API] ━━━ STRATEGY 1: Active MLS Listings ━━━`);
    console.log(`[Property Images API] Searching unified_listings collection...`);

    const activeListingQuery: any = {
      $or: [
        { unparsedAddress: { $regex: street, $options: 'i' } },
        { streetName: { $regex: street.split(' ').slice(1).join(' '), $options: 'i' } }
      ]
    };

    if (city) {
      activeListingQuery.city = { $regex: city, $options: 'i' };
    }
    if (state) {
      activeListingQuery.stateOrProvince = { $regex: state, $options: 'i' };
    }

    console.log(`[Property Images API] Query:`, JSON.stringify(activeListingQuery, null, 2));

    const activeListing = await UnifiedListing.findOne(activeListingQuery)
      .select({ media: 1, unparsedAddress: 1, listingKey: 1 })
      .lean();

    if (activeListing?.media && activeListing.media.length > 0) {
      console.log(`[Property Images API] ✅ SUCCESS: Found active listing!`);
      console.log(`[Property Images API]   Listing Key: ${activeListing.listingKey}`);
      console.log(`[Property Images API]   Address: ${activeListing.unparsedAddress}`);
      console.log(`[Property Images API]   Total Media Items: ${activeListing.media.length}`);
      source = 'active';

      // Extract images from media array, prefer larger sizes
      console.log(`[Property Images API] Extracting images from media array...`);
      activeListing.media.forEach((mediaItem: any, index: number) => {
        const imageUrl = mediaItem.Uri1280 ||
                        mediaItem.Uri1024 ||
                        mediaItem.Uri800 ||
                        mediaItem.Uri640 ||
                        mediaItem.MediaURL;

        if (imageUrl) {
          const selectedSize = mediaItem.Uri1280 ? '1280px' :
                              mediaItem.Uri1024 ? '1024px' :
                              mediaItem.Uri800 ? '800px' :
                              mediaItem.Uri640 ? '640px' : 'MediaURL';
          console.log(`[Property Images API]   Image ${index + 1}: Using ${selectedSize} version (Order: ${mediaItem.Order || 0})`);
          images.push({
            url: imageUrl,
            source: 'MLS Active',
            caption: mediaItem.Caption || mediaItem.ShortDescription || '',
            order: mediaItem.Order || 0,
          });
        }
      });
      console.log(`[Property Images API] ✅ Extracted ${images.length} images from active listing`);
    } else {
      console.log(`[Property Images API] ❌ No active listing found or no media available`);
    }

    // Strategy 2: If no active listing, search closed listings
    if (images.length === 0) {
      console.log('');
      console.log(`[Property Images API] ━━━ STRATEGY 2: Closed MLS Listings ━━━`);
      console.log(`[Property Images API] Searching unified_closed_listings collection...`);

      const closedListingQuery: any = {
        $or: [
          { unparsedAddress: { $regex: street, $options: 'i' } },
          { streetName: { $regex: street.split(' ').slice(1).join(' '), $options: 'i' } }
        ]
      };

      if (city) {
        closedListingQuery.city = { $regex: city, $options: 'i' };
      }
      if (state) {
        closedListingQuery.stateOrProvince = { $regex: state, $options: 'i' };
      }

      console.log(`[Property Images API] Query:`, JSON.stringify(closedListingQuery, null, 2));

      const closedListing = await UnifiedClosedListing.findOne(closedListingQuery)
        .select({ photos: 1, media: 1, unparsedAddress: 1, listingKey: 1 })
        .lean();

      if (closedListing) {
        console.log(`[Property Images API] ✅ SUCCESS: Found closed listing!`);
        console.log(`[Property Images API]   Listing Key: ${closedListing.listingKey}`);
        console.log(`[Property Images API]   Address: ${closedListing.unparsedAddress}`);
        source = 'closed';

        // Try media array first (newer format)
        if (closedListing.media && closedListing.media.length > 0) {
          console.log(`[Property Images API]   Format: Media array (newer format)`);
          console.log(`[Property Images API]   Total Media Items: ${closedListing.media.length}`);
          console.log(`[Property Images API] Extracting images from media array...`);
          closedListing.media.forEach((mediaItem: any, index: number) => {
            const imageUrl = mediaItem.Uri1280 ||
                            mediaItem.Uri1024 ||
                            mediaItem.Uri800 ||
                            mediaItem.Uri640 ||
                            mediaItem.MediaURL;

            if (imageUrl) {
              const selectedSize = mediaItem.Uri1280 ? '1280px' :
                                  mediaItem.Uri1024 ? '1024px' :
                                  mediaItem.Uri800 ? '800px' :
                                  mediaItem.Uri640 ? '640px' : 'MediaURL';
              console.log(`[Property Images API]   Image ${index + 1}: Using ${selectedSize} version (Order: ${mediaItem.Order || 0})`);
              images.push({
                url: imageUrl,
                source: 'MLS Closed',
                caption: mediaItem.Caption || mediaItem.ShortDescription || '',
                order: mediaItem.Order || 0,
              });
            }
          });
          console.log(`[Property Images API] ✅ Extracted ${images.length} images from closed listing`);
        }
        // Fall back to photos array (older format)
        else if ((closedListing as any).photos && Array.isArray((closedListing as any).photos)) {
          console.log(`[Property Images API]   Format: Photos array (older format)`);
          console.log(`[Property Images API]   Total Photos: ${(closedListing as any).photos.length}`);
          console.log(`[Property Images API] Extracting images from photos array...`);
          (closedListing as any).photos.forEach((photoUrl: string, index: number) => {
            if (photoUrl) {
              console.log(`[Property Images API]   Photo ${index + 1}: Direct URL`);
              images.push({
                url: photoUrl,
                source: 'MLS Closed',
                caption: '',
                order: index,
              });
            }
          });
          console.log(`[Property Images API] ✅ Extracted ${images.length} images from closed listing`);
        } else {
          console.log(`[Property Images API] ⚠️ Closed listing found but no media or photos available`);
        }
      } else {
        console.log(`[Property Images API] ❌ No closed listing found`);
      }
    }

    // Strategy 3: Google Street View fallback
    if (images.length === 0 && street && city && state) {
      console.log('');
      console.log(`[Property Images API] ━━━ STRATEGY 3: Google Street View Fallback ━━━`);
      console.log(`[Property Images API] No MLS images found, attempting Street View...`);
      const fullAddress = `${street}, ${city}, ${state} ${zip}`.trim();
      const encodedAddress = encodeURIComponent(fullAddress);
      console.log(`[Property Images API] Full Address: ${fullAddress}`);

      // NOTE: Requires GOOGLE_MAPS_API_KEY environment variable
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

      if (googleApiKey && googleApiKey !== 'your_google_maps_api_key_here') {
        console.log(`[Property Images API] ✅ Google Maps API key is configured`);
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=1200x800&location=${encodedAddress}&key=${googleApiKey}`;
        console.log(`[Property Images API] Generated Street View URL (key hidden for security)`);
        images.push({
          url: streetViewUrl,
          source: 'Google Street View',
          caption: fullAddress,
          order: 0,
        });
        source = 'streetview';
        console.log(`[Property Images API] ✅ Using Google Street View as fallback`);
      } else {
        console.log('[Property Images API] ❌ Google Maps API key not configured');
        console.log('[Property Images API] Set GOOGLE_MAPS_API_KEY environment variable to enable Street View fallback');
      }
    }

    // Sort images by order
    console.log('');
    console.log(`[Property Images API] 📊 FINAL RESULTS`);
    if (images.length > 0) {
      console.log(`[Property Images API] Sorting ${images.length} images by order...`);
      images.sort((a, b) => a.order - b.order);
      console.log(`[Property Images API] ✅ SUCCESS: Returning ${images.length} images from source: ${source.toUpperCase()}`);
      console.log(`[Property Images API] Images:`);
      images.forEach((img, idx) => {
        console.log(`[Property Images API]   ${idx + 1}. Source: ${img.source}, Order: ${img.order}, Caption: ${img.caption || '(none)'}`);
      });
    } else {
      console.log(`[Property Images API] ⚠️ NO IMAGES FOUND - All strategies exhausted`);
      console.log(`[Property Images API] Possible reasons:`);
      console.log(`[Property Images API]   • Address not found in MLS databases`);
      console.log(`[Property Images API]   • Property never listed or listing too old`);
      console.log(`[Property Images API]   • Google Maps API key not configured`);
    }
    console.log('='.repeat(80));

    return NextResponse.json({
      success: true,
      images,
      source,
      address: {
        street,
        city,
        state,
        zip,
      },
    });
  } catch (error: any) {
    console.error('[Property Images API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
