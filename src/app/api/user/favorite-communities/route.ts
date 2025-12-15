import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/user';

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

    // Check if already favorited
    const alreadyFavorited = user.favoriteCommunities?.some(
      (c: any) => c.id === id && c.type === type
    );

    if (alreadyFavorited) {
      return NextResponse.json(
        { message: 'Community already in favorites' },
        { status: 200 }
      );
    }

    // Add to favorites
    if (!user.favoriteCommunities) {
      user.favoriteCommunities = [];
    }

    user.favoriteCommunities.push({
      name,
      id,
      type,
      ...(cityId && { cityId })
    });

    await user.save();

    return NextResponse.json({
      message: 'Community added to favorites',
      communities: user.favoriteCommunities
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

    // Remove from favorites
    if (user.favoriteCommunities) {
      user.favoriteCommunities = user.favoriteCommunities.filter(
        (c: any) => c.id !== id
      );
      await user.save();
    }

    return NextResponse.json({
      message: 'Community removed from favorites',
      communities: user.favoriteCommunities || []
    });
  } catch (error: any) {
    console.error('[DELETE /api/user/favorite-communities] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove community from favorites' },
      { status: 500 }
    );
  }
}
