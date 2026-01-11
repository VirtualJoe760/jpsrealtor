/**
 * Contact Notes API
 *
 * Manages timestamped notes for contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import mongoose from 'mongoose';

// ============================================================================
// POST /api/crm/contacts/[id]/notes - Add a new note
// ============================================================================

export async function POST(
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
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Note content is required' },
        { status: 400 }
      );
    }

    const contact = await Contact.findOneAndUpdate(
      {
        _id: id,
        userId: session.user.id,
      },
      {
        $push: {
          noteHistory: {
            content: content.trim(),
            createdAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    console.log(`[Notes API] Added note to contact ${id}`);

    return NextResponse.json({
      success: true,
      noteHistory: contact.noteHistory,
    });
  } catch (error: any) {
    console.error('[Notes API] Error adding note:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/crm/contacts/[id]/notes - Update an existing note
// ============================================================================

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
    const { noteId, content } = await request.json();

    if (!noteId || !content || content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Note ID and content are required' },
        { status: 400 }
      );
    }

    const contact = await Contact.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Find and update the specific note
    const note = contact.noteHistory?.find(
      (n: any) => n._id.toString() === noteId
    );

    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    note.content = content.trim();
    note.updatedAt = new Date();

    await contact.save();

    console.log(`[Notes API] Updated note ${noteId} for contact ${id}`);

    return NextResponse.json({
      success: true,
      noteHistory: contact.noteHistory,
    });
  } catch (error: any) {
    console.error('[Notes API] Error updating note:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/crm/contacts/[id]/notes - Delete a note
// ============================================================================

export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const contact = await Contact.findOneAndUpdate(
      {
        _id: id,
        userId: session.user.id,
      },
      {
        $pull: {
          noteHistory: { _id: noteId },
        },
      },
      { new: true }
    );

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    console.log(`[Notes API] Deleted note ${noteId} from contact ${id}`);

    return NextResponse.json({
      success: true,
      noteHistory: contact.noteHistory,
    });
  } catch (error: any) {
    console.error('[Notes API] Error deleting note:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
