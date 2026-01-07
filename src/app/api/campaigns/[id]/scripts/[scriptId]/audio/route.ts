// app/api/campaigns/[id]/scripts/[scriptId]/audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';
import { Types } from 'mongoose';

/**
 * DELETE - Delete audio file from Cloudinary and reset script audio status
 */
export async function DELETE(
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

    // Delete audio
    const result = await AudioGenerationService.deleteScriptAudio(
      new Types.ObjectId(scriptId),
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Audio deleted successfully',
    });
  } catch (error: any) {
    console.error('[delete-audio] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete audio' },
      { status: 500 }
    );
  }
}
