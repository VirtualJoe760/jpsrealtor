// app/api/campaigns/[id]/scripts/[scriptId]/generate-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';
import { Types } from 'mongoose';

/**
 * POST - Generate audio for a script using 11Labs
 * Body: { voiceId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const userId = new Types.ObjectId(user.id);
    const { id: campaignId, scriptId } = await params;

    await dbConnect();

    // Parse body for optional voice ID
    const body = await request.json();
    const { voiceId } = body;

    // Generate audio
    const result = await AudioGenerationService.generateAudio(
      new Types.ObjectId(scriptId),
      userId,
      voiceId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      cloudinaryPublicId: result.cloudinaryPublicId,
    });
  } catch (error: any) {
    console.error('[generate-audio] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
