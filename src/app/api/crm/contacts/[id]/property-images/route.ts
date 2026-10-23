import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import UnifiedClosedListing from '@/models/unified-closed-listing';
import { allowedPropertyPage } from '@/lib/property-photo-discovery';
import { listingAddress, resolvePropertyPhotos } from '@/lib/property-photo-service';
export const maxDuration = 60;
async function handle(request: NextRequest, context: { params: Promise<{ id: string }> }, discover: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: 'Invalid contact' }, { status: 400 });
    await dbConnect();
    const contact = await Contact.findOne({ _id: id, userId: session.user.id }).lean();
    if (!contact) return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    const body = discover ? await request.json().catch(() => null) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ success: false, error: 'Invalid lookup' }, { status: 400 });
    if (body.sourceUrl !== undefined && (typeof body.sourceUrl !== 'string' || !allowedPropertyPage(body.sourceUrl))) return NextResponse.json({ success: false, error: 'Use an HTTPS Zillow, Redfin or Realtor.com property-page URL' }, { status: 400 });
    const listingKey = discover ? body.listingKey : request.nextUrl.searchParams.get('listingKey');
    let address = contact.address || {};
    let target: any = { model: Contact, id: contact._id, userId: session.user.id };
    if (listingKey) {
      if (typeof listingKey !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(listingKey)) return NextResponse.json({ success: false, error: 'Invalid listing' }, { status: 400 });
      const listing = await UnifiedClosedListing.findOne({ listingKey }).lean();
      if (!listing) return NextResponse.json({ success: false, error: 'Closed listing not found' }, { status: 404 });
      address = listingAddress(listing); target = { model: UnifiedClosedListing, id: listing._id };
    }
    return NextResponse.json(await resolvePropertyPhotos(address, target, discover, body.sourceUrl), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ success: false, error: 'Property photo lookup failed. Please try again later.' }, { status: 503 }); }
}
export function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) { return handle(request, context, false); }
export function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) { return handle(request, context, true); }
