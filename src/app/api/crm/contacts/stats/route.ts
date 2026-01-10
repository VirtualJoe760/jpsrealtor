/**
 * Contact Statistics API
 *
 * GET /api/crm/contacts/stats - Get contact counts by status, labels, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/contact';

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

    // Get total contacts
    const total = await Contact.countDocuments({ userId: session.user.id });

    // Get counts by status
    const statusCounts = await Contact.aggregate([
      { $match: { userId: session.user.id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format status counts as an object
    const statuses: Record<string, number> = {};
    statusCounts.forEach((item: any) => {
      const status = item._id || 'uncontacted';
      statuses[status] = item.count;
    });

    // Ensure all statuses are present (even with 0 count)
    const allStatuses = ['uncontacted', 'contacted', 'qualified', 'nurturing', 'client', 'inactive'];
    allStatuses.forEach(status => {
      if (!statuses[status]) {
        statuses[status] = 0;
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        total,
        byStatus: statuses,
      },
    });
  } catch (error: any) {
    console.error('[Contact Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
