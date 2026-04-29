/**
 * POST /api/crm/contacts/backfill-address
 *
 * Backfills missing city/state on contacts using zip code lookup.
 * Can target specific contacts by IDs or all contacts missing city/state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Contact from '@/models/Contact';

// US zip code → city/state lookup (common Coachella Valley zips)
const ZIP_LOOKUP: Record<string, { city: string; state: string }> = {
  '92201': { city: 'Indio', state: 'CA' },
  '92202': { city: 'Indio', state: 'CA' },
  '92203': { city: 'Indio', state: 'CA' },
  '92210': { city: 'Indian Wells', state: 'CA' },
  '92211': { city: 'Palm Desert', state: 'CA' },
  '92234': { city: 'Cathedral City', state: 'CA' },
  '92236': { city: 'Coachella', state: 'CA' },
  '92240': { city: 'Desert Hot Springs', state: 'CA' },
  '92241': { city: 'Desert Hot Springs', state: 'CA' },
  '92253': { city: 'La Quinta', state: 'CA' },
  '92254': { city: 'Mecca', state: 'CA' },
  '92260': { city: 'Palm Desert', state: 'CA' },
  '92262': { city: 'Palm Springs', state: 'CA' },
  '92264': { city: 'Palm Springs', state: 'CA' },
  '92270': { city: 'Rancho Mirage', state: 'CA' },
  '92274': { city: 'Thermal', state: 'CA' },
  '92276': { city: 'Thousand Palms', state: 'CA' },
  '92282': { city: 'White Water', state: 'CA' },
};

/**
 * Look up city/state from a zip code.
 * First checks the local lookup table, then falls back to the zippopotam.us API.
 */
async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  const cleanZip = zip.replace(/\D/g, '').substring(0, 5);
  if (!cleanZip || cleanZip.length !== 5) return null;

  // Check local lookup first
  if (ZIP_LOOKUP[cleanZip]) {
    return ZIP_LOOKUP[cleanZip];
  }

  // Fall back to free API
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${cleanZip}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.places?.[0]) {
      return {
        city: data.places[0]['place name'],
        state: data.places[0]['state abbreviation'],
      };
    }
  } catch {
    // API timeout or error — skip
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const { contactIds } = body;

    // Build query: contacts with a zip but missing city or state
    const query: any = {
      userId,
      $or: [
        { 'address.zip': { $exists: true, $ne: '' }, $or: [{ 'address.city': { $in: [null, '', undefined] } }, { 'address.state': { $in: [null, '', undefined] } }] },
        { 'mailingAddress.zip': { $exists: true, $ne: '' }, $or: [{ 'mailingAddress.city': { $in: [null, '', undefined] } }, { 'mailingAddress.state': { $in: [null, '', undefined] } }] },
      ],
    };

    // Optionally scope to specific contacts
    if (contactIds?.length) {
      query._id = { $in: contactIds };
    }

    const contacts = await Contact.find(query).limit(1000);

    if (contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All contacts already have complete address data.',
        updated: 0,
      });
    }

    // Cache lookups to avoid duplicate API calls
    const zipCache: Record<string, { city: string; state: string } | null> = {};
    let updated = 0;
    let skipped = 0;

    for (const contact of contacts) {
      const updates: any = {};

      // Check address
      const addr = contact.address as any;
      if (addr?.zip && (!addr.city || !addr.state)) {
        if (!(addr.zip in zipCache)) {
          zipCache[addr.zip] = await lookupZip(addr.zip);
        }
        const lookup = zipCache[addr.zip];
        if (lookup) {
          if (!addr.city) updates['address.city'] = lookup.city;
          if (!addr.state) updates['address.state'] = lookup.state;
        }
      }

      // Check mailingAddress
      const mail = contact.mailingAddress as any;
      if (mail?.zip && (!mail.city || !mail.state)) {
        if (!(mail.zip in zipCache)) {
          zipCache[mail.zip] = await lookupZip(mail.zip);
        }
        const lookup = zipCache[mail.zip];
        if (lookup) {
          if (!mail.city) updates['mailingAddress.city'] = lookup.city;
          if (!mail.state) updates['mailingAddress.state'] = lookup.state;
        }
      }

      if (Object.keys(updates).length > 0) {
        await Contact.findByIdAndUpdate(contact._id, { $set: updates });
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`[backfill-address] Updated ${updated} contacts, skipped ${skipped}`);

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} contact${updated !== 1 ? 's' : ''} with city/state data.`,
      updated,
      skipped,
      total: contacts.length,
    });
  } catch (error: any) {
    console.error('[backfill-address] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to backfill addresses' },
      { status: 500 }
    );
  }
}
