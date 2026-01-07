// app/api/campaigns/[id]/scripts/[scriptId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import VoicemailScript from '@/models/VoicemailScript';
import Campaign from '@/models/Campaign';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';
import { Types } from 'mongoose';

/**
 * DELETE - Delete a voicemail script
 * Also deletes associated audio from Cloudinary
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

    // Find script and verify ownership
    const script = await (VoicemailScript as any).findOne({
      _id: new Types.ObjectId(scriptId),
      campaignId: new Types.ObjectId(campaignId),
      userId,
    });

    if (!script) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    // Delete audio from Cloudinary if it exists
    if (script.audio?.elevenLabsId) {
      try {
        await AudioGenerationService.deleteAudio(script.audio.elevenLabsId);
      } catch (error) {
        console.error('[delete-script] Failed to delete audio:', error);
        // Continue with script deletion even if audio deletion fails
      }
    }

    // Delete the script
    await script.deleteOne();

    // Update campaign stats
    const campaign = await (Campaign as any).findById(
      new Types.ObjectId(campaignId)
    );

    if (campaign) {
      campaign.stats.scriptsGenerated = Math.max(
        0,
        (campaign.stats.scriptsGenerated || 0) - 1
      );

      // Recalculate audioGenerated count
      const audioCount = await (VoicemailScript as any).countDocuments({
        campaignId: new Types.ObjectId(campaignId),
        'audio.status': 'completed',
      });
      campaign.stats.audioGenerated = audioCount;

      await campaign.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Script deleted successfully',
    });
  } catch (error: any) {
    console.error('[delete-script] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete script' },
      { status: 500 }
    );
  }
}
