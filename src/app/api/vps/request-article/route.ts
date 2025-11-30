import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongoose';
import ArticleRequest from '@/models/articleRequest';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, category, keywords } = body;

    if (!prompt || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and category' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create article request
    const articleRequest = await ArticleRequest.create({
      prompt,
      category,
      keywords: keywords || [],
      status: 'pending',
      requestedBy: session.user.id,
      requestedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      requestId: articleRequest._id,
      message: 'Article request submitted successfully. You\'ll be notified when Claude finishes writing it.',
      request: {
        id: articleRequest._id,
        status: articleRequest.status,
        category: articleRequest.category,
        requestedAt: articleRequest.requestedAt
      }
    });

  } catch (error: any) {
    console.error('Error creating article request:', error);
    return NextResponse.json(
      { error: 'Failed to create article request', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    await dbConnect();

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const requests = await ArticleRequest.find(query)
      .sort({ requestedAt: -1 })
      .limit(limit)
      .populate('requestedBy', 'name email')
      .lean();

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length
    });

  } catch (error: any) {
    console.error('Error fetching article requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article requests', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing request ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    const deletedRequest = await ArticleRequest.findByIdAndDelete(requestId);

    if (!deletedRequest) {
      return NextResponse.json(
        { error: 'Article request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article request deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting article request:', error);
    return NextResponse.json(
      { error: 'Failed to delete article request', details: error.message },
      { status: 500 }
    );
  }
}
