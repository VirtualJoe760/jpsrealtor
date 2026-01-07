// app/api/campaigns/[id]/scripts/[scriptId]/preview-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import VoicemailScript from '@/models/VoicemailScript';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';
import { Types } from 'mongoose';

/**
 * POST - Stream audio preview from 11Labs (for testing pronunciation)
 * Body: { voiceId?: string }
 * Returns: Streaming audio response
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
    const userId = user.id;
    const { id: campaignId, scriptId } = await params;

    await dbConnect();

    // Get script
    const script = await (VoicemailScript as any).findOne({
      _id: new Types.ObjectId(scriptId),
      userId: new Types.ObjectId(userId),
    });

    if (!script) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    // Parse body for optional voice ID
    const body = await request.json();
    const { voiceId } = body;

    // Stream audio preview
    const audioStream = await AudioGenerationService.streamAudioPreview(
      script.script,
      voiceId
    );

    // Return streaming response
    return new NextResponse(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('[preview-audio] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to preview audio' },
      { status: 500 }
    );
  }
}
