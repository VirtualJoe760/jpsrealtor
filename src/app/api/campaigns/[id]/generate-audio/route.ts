// app/api/campaigns/[id]/generate-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import VoicemailScript from '@/models/VoicemailScript';
import GenerationSession from '@/models/GenerationSession';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';
import { Types } from 'mongoose';

/**
 * POST - Generate audio for all scripts in a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: campaignId } = await params;

    await dbConnect();

    // Verify campaign ownership
    const campaign = await (Campaign as any).findOne({
      _id: new Types.ObjectId(campaignId),
      userId,
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Parse optional voice ID and regenerate flag from body
    const body = await request.json().catch(() => ({}));
    const { voiceId, regenerate = false } = body;

    // Get scripts based on regenerate flag
    const query: any = {
      campaignId: new Types.ObjectId(campaignId),
      userId,
    };

    // If not regenerating, only get scripts without audio
    if (!regenerate) {
      query['audio.status'] = { $in: ['pending', 'failed'] };
    }

    const scripts = await (VoicemailScript as any).find(query);

    if (scripts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No scripts found for this campaign' },
        { status: 400 }
      );
    }

    // Filter out scripts that already have audio if not regenerating
    const scriptsToProcess = regenerate
      ? scripts
      : scripts.filter((s: any) =>
          s.audio?.status === 'pending' || s.audio?.status === 'failed'
        );

    if (scriptsToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No scripts found or all scripts already have audio. Use regenerate=true to regenerate existing audio.'
        },
        { status: 400 }
      );
    }

    // Update campaign status
    campaign.status = 'generating_audio';
    await campaign.save();

    // Generate audio for each script (background process)
    // In production, this should use a job queue
    generateAudioInBackground(scriptsToProcess, userId, voiceId, campaign);

    return NextResponse.json({
      success: true,
      message: `Generating audio for ${scriptsToProcess.length} script${scriptsToProcess.length !== 1 ? 's' : ''}`,
      scriptCount: scriptsToProcess.length,
      regenerating: regenerate,
    });
  } catch (error: any) {
    console.error('[generate-audio] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate audio' },
      { status: 500 }
    );
  }
}

/**
 * Background process to generate audio for multiple scripts with resume capability
 */
async function generateAudioInBackground(
  scripts: any[],
  userId: Types.ObjectId,
  voiceId: string | undefined,
  campaign: any
) {
  try {
    const campaignId = campaign._id;

    // Load or create generation session
    let session = await GenerationSession.findOne({
      campaignId,
      type: 'audio_generation',
      status: 'in_progress',
    });

    if (!session) {
      // Create new session
      session = await GenerationSession.create({
        campaignId,
        userId,
        type: 'audio_generation',
        status: 'in_progress',
        totalItems: scripts.length,
        lastProcessedIndex: -1,
        successCount: 0,
        failureCount: 0,
        config: {
          voiceId,
        },
        errorLog: [],
      });
      console.log(`[generateAudioInBackground] Created new session: ${session._id}`);
    } else {
      console.log(
        `[generateAudioInBackground] Resuming session: ${session._id} from index ${session.lastProcessedIndex}`
      );
    }

    // Start from last processed index + 1
    const startIndex = session.lastProcessedIndex + 1;

    for (let i = startIndex; i < scripts.length; i++) {
      const script = scripts[i];

      try {
        const result = await AudioGenerationService.generateAudio(
          script._id,
          userId,
          voiceId
        );

        if (result.success) {
          session.successCount++;
        } else {
          session.failureCount++;
          session.errorLog.push({
            index: i,
            contactId: script.contactId,
            error: result.error || 'Unknown error',
            timestamp: new Date(),
          });
        }
      } catch (error: any) {
        console.error(`[generateAudioInBackground] Failed for script ${script._id}:`, error);
        session.failureCount++;
        session.errorLog.push({
          index: i,
          contactId: script.contactId,
          error: error.message || 'Unknown error',
          timestamp: new Date(),
        });
      }

      // Update session after each script (for resume capability)
      session.lastProcessedIndex = i;
      session.lastUpdatedAt = new Date();
      await session.save();

      // Update campaign stats periodically (every 10 scripts)
      if ((session.successCount + session.failureCount) % 10 === 0) {
        campaign.stats.audioGenerated = session.successCount;
        await campaign.save();
      }
    }

    // Mark session as completed
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Update final campaign status
    campaign.stats.audioGenerated = session.successCount;
    campaign.status = session.successCount > 0 ? 'review' : 'draft';
    await campaign.save();

    console.log(
      `[generateAudioInBackground] Completed: ${session.successCount} succeeded, ${session.failureCount} failed`
    );
  } catch (error: any) {
    console.error('[generateAudioInBackground] Error:', error);
    // Mark session as failed if it exists
    const session = await GenerationSession.findOne({
      campaignId: campaign._id,
      type: 'audio_generation',
      status: 'in_progress',
    });
    if (session) {
      session.status = 'failed';
      session.completedAt = new Date();
      await session.save();
    }
  }
}
