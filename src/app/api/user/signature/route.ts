import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

// GET - Fetch user's email signature
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
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

    return NextResponse.json({
      signature: user.emailSignature || { html: '', photo: null },
    });
  } catch (error: any) {
    console.error('Error fetching signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signature' },
      { status: 500 }
    );
  }
}

// POST - Save user's email signature
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { html, photo } = await req.json();

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update signature
    user.emailSignature = {
      html: html || '',
      photo: photo || null,
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Signature saved successfully',
      signature: user.emailSignature,
    });
  } catch (error: any) {
    console.error('Error saving signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save signature' },
      { status: 500 }
    );
  }
}
