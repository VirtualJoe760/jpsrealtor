import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

// GET - Fetch user's favorite communities
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      communities: user.favoriteCommunities || []
    });
  } catch (error: any) {
    console.error('[GET /api/user/favorite-communities] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite communities' },
      { status: 500 }
    );
  }
}

// POST - Add a community to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, id, type, cityId } = body;

    if (!name || !id || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, id, type' },
        { status: 400 }
      );
    }

    if (!['city', 'subdivision'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "city" or "subdivision"' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Dedup + add atomically at the DB level. The subdoc field literally named
    // `id` collides with Mongoose's built-in subdocument `id` virtual (=_id
    // hex), so a hydrated `.some(c => c.id === id)` never matches the stored
    // slug and would push duplicates. The $not/$elemMatch guard only pushes
    // when no existing element already matches this id+type.
    const result = await User.updateOne(
      {
        email: session.user.email,
        favoriteCommunities: { $not: { $elemMatch: { id, type } } },
      },
      { $push: { favoriteCommunities: { name, id, type, ...(cityId && { cityId }) } } }
    );

    const updated = await User.findOne({ email: session.user.email })
      .select('favoriteCommunities')
      .lean<{ favoriteCommunities?: any[] }>();

    return NextResponse.json({
      message:
        result.modifiedCount > 0
          ? 'Community added to favorites'
          : 'Community already in favorites',
      communities: updated?.favoriteCommunities || []
    });
  } catch (error: any) {
    console.error('[POST /api/user/favorite-communities] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add community to favorites' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a community from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove at the DB level with $pull matching the stored `id` field.
    // The `favoriteCommunities` subdoc has a field literally named `id`, which
    // collides with Mongoose's built-in subdocument `id` virtual (=_id hex):
    // filtering a HYDRATED doc by `c.id` compared against that virtual, never
    // the stored slug, so the old filter + save() removed nothing and the
    // community reappeared on refetch ("reselects"). $pull matches the raw
    // stored field, so it actually removes the entry.
    await User.updateOne(
      { email: session.user.email },
      { $pull: { favoriteCommunities: { id } } }
    );

    const updated = await User.findOne({ email: session.user.email })
      .select('favoriteCommunities')
      .lean<{ favoriteCommunities?: any[] }>();

    return NextResponse.json({
      message: 'Community removed from favorites',
      communities: updated?.favoriteCommunities || []
    });
  } catch (error: any) {
    console.error('[DELETE /api/user/favorite-communities] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove community from favorites' },
      { status: 500 }
    );
  }
}
