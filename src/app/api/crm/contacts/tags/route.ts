/**
 * Tags API
 * GET /api/crm/contacts/tags - Get all unique tags with contact counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
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

    console.log('[Tags API] Fetching tags for userId:', session.user.id);

    // Aggregate to get unique tags with counts
    const tagCounts = await Contact.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]);

    console.log('[Tags API] Found tags:', tagCounts);

    // Format tags
    const tags = tagCounts.map((item: any) => ({
      name: item._id,
      contactCount: item.count,
      color: getColorForTag(item._id),
    }));

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error: any) {
    console.error('[Tags API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper to generate consistent colors for tags
function getColorForTag(tagName: string): string {
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

  // Generate a consistent color based on tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
