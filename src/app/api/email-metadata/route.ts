/**
 * Email Metadata API
 *
 * Manage email state (read/unread, favorite, tags, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import EmailMetadata from '@/models/email-metadata';
import Contact from '@/models/contact';

// GET: Fetch metadata for emails
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const emailIds = searchParams.get('emailIds')?.split(','); // Comma-separated list

    if (!emailIds || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs required' }, { status: 400 });
    }

    // Fetch metadata for all requested emails
    // @ts-expect-error Mongoose typing issue with overloaded find() signatures
    const metadata = await EmailMetadata.find({
      userId: session.user.id,
      resendEmailId: { $in: emailIds },
    }).populate('contactId', 'firstName lastName photo email');

    // Convert to a map for easy lookup
    const metadataMap: Record<string, any> = {};
    metadata.forEach((meta) => {
      metadataMap[meta.resendEmailId] = meta;
    });

    return NextResponse.json({ metadata: metadataMap });
  } catch (error: any) {
    console.error('[Email Metadata GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Update or create metadata
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      resendEmailId,
      folder,
      isRead,
      isFavorite,
      isArchived,
      isDeleted,
      tags,
      senderEmail,
    } = body;

    if (!resendEmailId) {
      return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
    }

    // Try to find matching contact by email
    let contactId = null;
    let cachedSenderName = null;
    let cachedSenderEmail = null;
    let cachedSenderPhoto = null;

    if (senderEmail) {
      // @ts-expect-error Mongoose typing issue with overloaded findOne() signatures
      const contact = await Contact.findOne({
        userId: session.user.id,
        $or: [
          { email: senderEmail.toLowerCase() },
          { alternateEmails: senderEmail.toLowerCase() },
        ],
      });

      if (contact) {
        contactId = contact._id;
        cachedSenderName = `${contact.firstName} ${contact.lastName}`.trim();
        cachedSenderEmail = senderEmail;
        cachedSenderPhoto = contact.photo;
      }
    }

    // Upsert metadata
    const update: any = {
      userId: session.user.id,
      folder: folder || 'inbox',
    };

    if (isRead !== undefined) {
      update.isRead = isRead;
      if (isRead) update.readAt = new Date();
    }
    if (isFavorite !== undefined) {
      update.isFavorite = isFavorite;
      if (isFavorite) update.favoritedAt = new Date();
    }
    if (isArchived !== undefined) {
      update.isArchived = isArchived;
      if (isArchived) update.archivedAt = new Date();
    }
    if (isDeleted !== undefined) {
      update.isDeleted = isDeleted;
      if (isDeleted) update.deletedAt = new Date();
    }
    if (tags !== undefined) update.tags = tags;

    if (contactId) {
      update.contactId = contactId;
      update.cachedSenderName = cachedSenderName;
      update.cachedSenderEmail = cachedSenderEmail;
      update.cachedSenderPhoto = cachedSenderPhoto;
    }

    // @ts-expect-error Mongoose typing issue with overloaded findOneAndUpdate() signatures
    const metadata = await EmailMetadata.findOneAndUpdate(
      {
        userId: session.user.id,
        resendEmailId,
      },
      update,
      { new: true, upsert: true }
    ).populate('contactId', 'firstName lastName photo email');

    return NextResponse.json({ metadata });
  } catch (error: any) {
    console.error('[Email Metadata POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Bulk update metadata
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { emailIds, updates } = body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs array required' }, { status: 400 });
    }

    // Build update object
    const updateFields: any = {};
    if (updates.isRead !== undefined) {
      updateFields.isRead = updates.isRead;
      if (updates.isRead) updateFields.readAt = new Date();
    }
    if (updates.isFavorite !== undefined) {
      updateFields.isFavorite = updates.isFavorite;
      if (updates.isFavorite) updateFields.favoritedAt = new Date();
    }
    if (updates.isArchived !== undefined) {
      updateFields.isArchived = updates.isArchived;
      if (updates.isArchived) updateFields.archivedAt = new Date();
    }
    if (updates.isDeleted !== undefined) {
      updateFields.isDeleted = updates.isDeleted;
      if (updates.isDeleted) updateFields.deletedAt = new Date();
    }
    if (updates.addTags) {
      updateFields.$addToSet = { tags: { $each: updates.addTags } };
    }
    if (updates.removeTags) {
      updateFields.$pull = { tags: { $in: updates.removeTags } };
    }

    // Bulk update
    const result = await EmailMetadata.updateMany(
      {
        userId: session.user.id,
        resendEmailId: { $in: emailIds },
      },
      updateFields
    );

    return NextResponse.json({
      updated: result.modifiedCount,
      matched: result.matchedCount,
    });
  } catch (error: any) {
    console.error('[Email Metadata PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
