import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isAvatarAvailableToUser } from '@/app/components/tutorial/avatars/registry';

/**
 * POST /api/user/update-avatar
 * Update user's tutorial avatar preference
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Parse request body
    const { tutorialAvatarId } = await req.json();

    if (!tutorialAvatarId || typeof tutorialAvatarId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid avatar ID' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if avatar is available to this user
    const userRoles = user.roles || [];
    const isAvailable = isAvatarAvailableToUser(tutorialAvatarId, userRoles);

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Avatar not available for your account' },
        { status: 403 }
      );
    }

    // Update avatar preference
    user.tutorialAvatarId = tutorialAvatarId;
    await user.save();

    console.log(`[UpdateAvatar] User ${user.email} changed tutorial avatar to ${tutorialAvatarId}`);

    return NextResponse.json({
      success: true,
      tutorialAvatarId,
    });

  } catch (error) {
    console.error('[UpdateAvatar] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
