/**
 * Contacts API
 *
 * CRUD operations for CRM contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import mongoose from 'mongoose';

// ============================================================================
// GET /api/crm/contacts
// Fetch all contacts with optional filtering
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    // Query parameters
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const tag = searchParams.get('tag');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Convert userId to ObjectId for proper matching (like stats API does)
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Build query - ALWAYS filter by userId
    const query: any = { userId: userObjectId };

    if (status) {
      query.status = status;
    }

    if (tag) {
      // Filter by tag
      query.tags = tag;
    }

    if (search) {
      // Text search across multiple fields
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch contacts
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Contact.countDocuments(query);

    return NextResponse.json({
      success: true,
      contacts,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[Contacts API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/crm/contacts
// Create a new contact
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.phone) {
      return NextResponse.json(
        { success: false, error: 'firstName, lastName, and phone are required' },
        { status: 400 }
      );
    }

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Check if contact with same phone already exists FOR THIS USER
    const existing = await Contact.findOne({
      userId: userObjectId,
      phone: body.phone
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Contact with this phone number already exists' },
        { status: 409 }
      );
    }

    // Create contact with userId
    const contact = await Contact.create({
      ...body,
      userId: userObjectId,
    });

    console.log(`[Contacts API] Created contact: ${contact._id}`);

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Contacts API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/crm/contacts
// Update an existing contact
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { _id, ...updates } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Update contact - ONLY if it belongs to this user
    const contact = await Contact.findOneAndUpdate(
      { _id, userId: userObjectId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[Contacts API] Updated contact: ${contact._id}`);

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact updated successfully',
    });
  } catch (error: any) {
    console.error('[Contacts API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/crm/contacts
// Delete contact(s) - single or bulk
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids'); // Comma-separated IDs for bulk delete
    const deleteAll = searchParams.get('deleteAll'); // Delete all contacts

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Bulk delete ALL contacts for this user
    if (deleteAll === 'true') {
      const result = await Contact.deleteMany({ userId: userObjectId });
      console.log(`[Contacts API] Deleted ALL contacts: ${result.deletedCount} contacts`);

      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} contact${result.deletedCount !== 1 ? 's' : ''}`,
      });
    }

    // Bulk delete specific contacts
    if (ids) {
      const idArray = ids.split(',').map(id => id.trim()).filter(id => id);

      if (idArray.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid contact IDs provided' },
          { status: 400 }
        );
      }

      const result = await Contact.deleteMany({
        _id: { $in: idArray },
        userId: userObjectId
      });

      console.log(`[Contacts API] Bulk deleted ${result.deletedCount} contacts`);

      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} contact${result.deletedCount !== 1 ? 's' : ''}`,
      });
    }

    // Single delete
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Delete contact - ONLY if it belongs to this user
    const contact = await Contact.findOneAndDelete({
      _id: id,
      userId: userObjectId
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[Contacts API] Deleted contact: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    console.error('[Contacts API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
