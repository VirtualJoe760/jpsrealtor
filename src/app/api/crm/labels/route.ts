/**
 * Labels API Endpoint
 *
 * GET /api/crm/labels - List all labels for user
 * POST /api/crm/labels - Create new label
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Label from '@/models/Label';
import Contact from '@/models/contact';
import dbConnect from '@/lib/db';

/**
 * GET /api/crm/labels
 * List all labels for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const query: any = { userId: session.user.id };
    if (!includeArchived) {
      query.isArchived = false;
    }

    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const labels = await Label.find(query)
      .sort({ isSystem: -1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      labels,
    });
  } catch (error: any) {
    console.error('Error fetching labels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch labels', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/labels
 * Create a new label
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, description, color, icon } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Label name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const existingLabel = await Label.findOne({
      userId: session.user.id,
      name: name.trim(),
      isArchived: false,
    });

    if (existingLabel) {
      return NextResponse.json(
        { error: 'A label with this name already exists' },
        { status: 409 }
      );
    }

    // Create label
    const label = new Label({
      userId: session.user.id,
      name: name.trim(),
      description: description?.trim(),
      color: color || '#3B82F6',
      icon: icon?.trim(),
      contactCount: 0,
      isSystem: false,
      isArchived: false,
    });

    await label.save();

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('Error creating label:', error);
    return NextResponse.json(
      { error: 'Failed to create label', details: error.message },
      { status: 500 }
    );
  }
}
