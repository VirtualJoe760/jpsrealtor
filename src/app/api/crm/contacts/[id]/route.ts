/**
 * Contact API
 *
 * PATCH /api/crm/contacts/[id] - Update contact fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { contactDetailUpdates } from '@/lib/contact-edit';

export async function PATCH(
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
    if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: 'Invalid contact' }, { status: 400 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ success: false, error: 'Invalid contact update' }, { status: 400 });

    // Validate allowed fields to update
    const allowedFields = ['status', 'notes', 'tags'];
    let updates: Record<string, unknown>;
    try { updates = contactDetailUpdates(body); }
    catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Invalid details' }, { status: 400 }); }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const unset: Record<string, 1> = {};
    // Empty legacy phone values would collide with the sparse unique index.
    if (updates.phone === '') { delete updates.phone; unset.phone = 1; }
    // An edited address must never retain the previous home's map coordinates.
    if (updates.address) for (const field of ['latitude', 'longitude', 'lat', 'lng', 'long', 'externalPhotos']) unset[field] = 1;

    // Update contact
    const contact = await Contact.findOneAndUpdate(
      {
        _id: id,
        userId: session.user.id,
      },
      { $set: updates, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      // Legacy coordinate aliases are absent from the schema but must be unset too.
      // All update paths above are explicitly allowlisted before disabling strict mode.
      { new: true, runValidators: true, strict: false }
    );

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }



    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error: any) {
    if (error?.name === 'ValidationError') return NextResponse.json({ success: false, error: 'Check the contact details and try again' }, { status: 400 });
    if (error?.code === 11000) return NextResponse.json({ success: false, error: 'That primary phone already belongs to another contact' }, { status: 409 });
    console.error('[Contact API] Update failed:', error?.name);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
