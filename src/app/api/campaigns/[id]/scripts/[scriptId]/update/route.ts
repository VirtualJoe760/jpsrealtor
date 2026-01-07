// app/api/campaigns/[id]/scripts/[scriptId]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import VoicemailScript from '@/models/VoicemailScript';
import { Types } from 'mongoose';

/**
 * PATCH - Update voicemail script text
 * Only allowed when audio hasn't been generated yet
 */
export async function PATCH(
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
    const { script: newScript } = await request.json();

    // Validate input
    if (!newScript || typeof newScript !== 'string' || !newScript.trim()) {
      return NextResponse.json(
        { success: false, error: 'Script text is required' },
        { status: 400 }
      );
    }

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

    // Don't allow editing if audio already generated
    if (script.audio.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot edit script after audio is generated. Delete audio first.',
        },
        { status: 400 }
      );
    }

    // Update script
    script.script = newScript.trim();
    script.scriptVersion += 1;
    script.generatedBy = 'manual'; // Mark as manually edited
    script.updatedAt = new Date();

    await script.save();

    return NextResponse.json({
      success: true,
      script: {
        _id: script._id,
        script: script.script,
        scriptVersion: script.scriptVersion,
        generatedBy: script.generatedBy,
        updatedAt: script.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[update-script] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update script' },
      { status: 500 }
    );
  }
}
