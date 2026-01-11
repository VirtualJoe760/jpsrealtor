/**
 * Label Migration API
 *
 * POST /api/crm/contacts/migrate-labels
 * Migrates string-based labels to Label document references
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Label from '@/models/Label';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
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

    console.log('[Label Migration] Starting migration for userId:', session.user.id);

    // Step 1: Find all contacts with string labels
    const contacts = await Contact.find({
      userId: userObjectId,
      labels: { $exists: true, $ne: [] }
    }).lean();

    console.log('[Label Migration] Found', contacts.length, 'contacts with labels');

    // Step 2: Collect all unique label strings
    const uniqueLabelStrings = new Set<string>();
    contacts.forEach((contact: any) => {
      if (Array.isArray(contact.labels)) {
        contact.labels.forEach((label: any) => {
          // Check if it's a string (old format) not an ObjectId
          if (typeof label === 'string') {
            uniqueLabelStrings.add(label);
          }
        });
      }
    });

    console.log('[Label Migration] Found unique label strings:', Array.from(uniqueLabelStrings));

    // Step 3: Create Label documents for each unique string (if they don't exist)
    const labelMap = new Map<string, mongoose.Types.ObjectId>();

    for (const labelString of uniqueLabelStrings) {
      // Check if label document already exists
      let labelDoc = await Label.findOne({
        userId: userObjectId,
        name: labelString,
      });

      if (!labelDoc) {
        // Create new Label document
        labelDoc = await Label.create({
          userId: userObjectId,
          name: labelString,
          description: `Auto-migrated from import`,
          color: getRandomColor(),
          contactCount: 0,
          isSystem: false,
          isArchived: false,
        });
        console.log('[Label Migration] Created label:', labelString, 'with ID:', labelDoc._id);
      } else {
        console.log('[Label Migration] Label already exists:', labelString, 'with ID:', labelDoc._id);
      }

      labelMap.set(labelString, labelDoc._id as mongoose.Types.ObjectId);
    }

    // Step 4: Update all contacts to use ObjectId references
    let migratedCount = 0;
    let skippedCount = 0;

    for (const contact of contacts) {
      if (!Array.isArray(contact.labels)) continue;

      // Check if any labels are strings that need migration
      const hasStringLabels = contact.labels.some((label: any) => typeof label === 'string');

      if (!hasStringLabels) {
        skippedCount++;
        continue;
      }

      // Convert string labels to ObjectIds
      const objectIdLabels: mongoose.Types.ObjectId[] = [];
      contact.labels.forEach((label: any) => {
        if (typeof label === 'string') {
          const objectId = labelMap.get(label);
          if (objectId) {
            objectIdLabels.push(objectId);
          }
        } else if (label instanceof mongoose.Types.ObjectId || mongoose.isValidObjectId(label)) {
          // Keep existing ObjectId labels
          objectIdLabels.push(label);
        }
      });

      // Update the contact
      await Contact.updateOne(
        { _id: contact._id },
        { $set: { labels: objectIdLabels } }
      );

      migratedCount++;
    }

    console.log('[Label Migration] Migration complete. Migrated:', migratedCount, 'Skipped:', skippedCount);

    return NextResponse.json({
      success: true,
      migration: {
        totalContacts: contacts.length,
        migratedContacts: migratedCount,
        skippedContacts: skippedCount,
        labelsCreated: labelMap.size,
        labels: Array.from(labelMap.entries()).map(([name, id]) => ({
          name,
          id: id.toString()
        }))
      }
    });
  } catch (error: any) {
    console.error('[Label Migration] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper to generate random colors for labels
function getRandomColor(): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
