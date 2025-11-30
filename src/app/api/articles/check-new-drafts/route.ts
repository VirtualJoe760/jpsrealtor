import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongoose';
import ArticleRequest from '@/models/articleRequest';

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
    const lastChecked = searchParams.get('lastChecked');

    await dbConnect();

    // Find completed requests since last check
    const query: any = {
      status: 'completed'
    };

    if (lastChecked) {
      query.completedAt = { $gt: new Date(lastChecked) };
    } else {
      // If no lastChecked, get completed requests from last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      query.completedAt = { $gt: fiveMinutesAgo };
    }

    const newDrafts = await ArticleRequest.find(query)
      .sort({ completedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      newDrafts: newDrafts.map(draft => ({
        id: draft._id,
        title: draft.resultTitle,
        slug: draft.resultSlug,
        category: draft.category,
        filePath: draft.resultFilePath,
        completedAt: draft.completedAt,
        requestId: draft._id
      })),
      count: newDrafts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error checking for new drafts:', error);
    return NextResponse.json(
      { error: 'Failed to check for new drafts', details: error.message },
      { status: 500 }
    );
  }
}
