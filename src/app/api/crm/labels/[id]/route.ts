/**
 * Label API Endpoint (Individual)
 *
 * GET /api/crm/labels/[id] - Get label by ID
 * PATCH /api/crm/labels/[id] - Update label
 * DELETE /api/crm/labels/[id] - Delete label (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Label from '@/models/Label';
import Contact from '@/models/contact';
import dbConnect from '@/lib/db';

/**
 * GET /api/crm/labels/[id]
 * Get a specific label by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const label = await Label.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('Error fetching label:', error);
    return NextResponse.json(
      { error: 'Failed to fetch label', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/labels/[id]
 * Update a label
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, description, color, icon, isArchived } = body;

    // Find label and check ownership
    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const label = await Label.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // Prevent updating system labels
    if (label.isSystem && (name || isArchived !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot modify system labels' },
        { status: 403 }
      );
    }

    // Check for duplicate name if renaming
    if (name && name.trim() !== label.name) {
      // @ts-expect-error Mongoose typing issue with overloaded signatures
      const existingLabel = await Label.findOne({
        userId: session.user.id,
        name: name.trim(),
        isArchived: false,
        _id: { $ne: params.id },
      });

      if (existingLabel) {
        return NextResponse.json(
          { error: 'A label with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update fields
    if (name !== undefined) label.name = name.trim();
    if (description !== undefined) label.description = description?.trim();
    if (color !== undefined) label.color = color;
    if (icon !== undefined) label.icon = icon?.trim();
    if (isArchived !== undefined) label.isArchived = isArchived;

    await label.save();

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('Error updating label:', error);
    return NextResponse.json(
      { error: 'Failed to update label', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/labels/[id]
 * Delete a label (soft delete by archiving)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find label and check ownership
    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const label = await Label.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // Prevent deleting system labels
    if (label.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system labels' },
        { status: 403 }
      );
    }

    // Soft delete by archiving
    label.isArchived = true;
    await label.save();

    // Optionally: Remove this label from all contacts
    // await Contact.updateMany(
    //   { userId: session.user.id, labels: params.id },
    //   { $pull: { labels: params.id } }
    // );

    return NextResponse.json({
      success: true,
      message: 'Label archived successfully',
    });
  } catch (error: any) {
    console.error('Error deleting label:', error);
    return NextResponse.json(
      { error: 'Failed to delete label', details: error.message },
      { status: 500 }
    );
  }
}
