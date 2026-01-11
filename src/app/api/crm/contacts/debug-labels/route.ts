/**
 * Debug Labels API
 * GET /api/crm/contacts/debug-labels
 * Shows what label data exists in contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Label from '@/models/Label';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Get sample contacts with labels
    const contactsWithLabels = await Contact.find({
      userId: userObjectId,
      labels: { $exists: true, $ne: [] }
    })
    .limit(10)
    .lean();

    // Get all unique label values
    const allLabels = new Set();
    contactsWithLabels.forEach((contact: any) => {
      if (Array.isArray(contact.labels)) {
        contact.labels.forEach((label: any) => {
          if (typeof label === 'string') {
            allLabels.add(`STRING: "${label}"`);
          } else if (label instanceof mongoose.Types.ObjectId || mongoose.isValidObjectId(label)) {
            allLabels.add(`OBJECTID: ${label.toString()}`);
          } else {
            allLabels.add(`UNKNOWN TYPE: ${typeof label}`);
          }
        });
      }
    });

    // Get all Label documents
    const labelDocuments = await Label.find({ userId: userObjectId }).lean();

    return NextResponse.json({
      success: true,
      debug: {
        contactsWithLabelsCount: contactsWithLabels.length,
        sampleContacts: contactsWithLabels.slice(0, 5).map((c: any) => ({
          name: `${c.firstName} ${c.lastName}`,
          labels: c.labels,
          labelTypes: c.labels?.map((l: any) => typeof l)
        })),
        uniqueLabelsFound: Array.from(allLabels),
        labelDocumentsCount: labelDocuments.length,
        labelDocuments: labelDocuments.map((l: any) => ({
          name: l.name,
          id: l._id.toString(),
          contactCount: l.contactCount
        }))
      }
    });
  } catch (error: any) {
    console.error('[Debug Labels] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
