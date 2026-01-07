// app/api/campaigns/[id]/scripts/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import VoicemailScript from '@/models/VoicemailScript';
import { Types } from 'mongoose';

/**
 * PUT - Bulk update multiple voicemail scripts
 */
export async function PUT(
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
    const { scripts } = await request.json();

    console.log('[bulk-update-scripts] Updating scripts:', scripts?.length || 0);
    console.log('[bulk-update-scripts] First script sample:', scripts?.[0]);

    // Validate input
    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Scripts array is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const results = {
      success: true,
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Update each script
    for (const scriptUpdate of scripts) {
      try {
        const { _id, script: newScriptFromScript, scriptText: newScriptFromScriptText } = scriptUpdate;

        // Handle both 'script' and 'scriptText' field names (frontend uses scriptText, DB uses script)
        const newScript = newScriptFromScriptText || newScriptFromScript;

        if (!_id || !newScript || typeof newScript !== 'string') {
          results.failed++;
          results.errors.push({
            scriptId: _id || 'unknown',
            error: 'Invalid script data',
          });
          continue;
        }

        // Find script and verify ownership
        const script = await (VoicemailScript as any).findOne({
          _id: new Types.ObjectId(_id),
          campaignId: new Types.ObjectId(campaignId),
          userId,
        });

        if (!script) {
          results.failed++;
          results.errors.push({
            scriptId: _id,
            error: 'Script not found or access denied',
          });
          continue;
        }

        // Don't allow editing if audio already generated
        if (script.audio.status === 'completed') {
          results.failed++;
          results.errors.push({
            scriptId: _id,
            error: 'Cannot edit script after audio is generated',
          });
          continue;
        }

        // Update script
        script.script = newScript.trim();
        script.scriptVersion += 1;
        script.generatedBy = 'manual'; // Mark as manually edited
        script.updatedAt = new Date();

        await script.save();
        results.updated++;

        console.log(`[bulk-update-scripts] Updated script ${_id}`);
      } catch (error: any) {
        console.error(`[bulk-update-scripts] Failed to update script:`, error);
        results.failed++;
        results.errors.push({
          scriptId: scriptUpdate._id || 'unknown',
          error: error.message || 'Update failed',
        });
      }
    }

    console.log(`[bulk-update-scripts] Complete: ${results.updated} updated, ${results.failed} failed`);

    // Prepare response
    const response: any = {
      success: results.failed === 0,
      updated: results.updated,
      failed: results.failed,
    };

    // Add error message if there were failures
    if (results.failed > 0) {
      response.error = `Failed to update ${results.failed} script(s)`;
      response.errors = results.errors;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[bulk-update-scripts] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update scripts' },
      { status: 500 }
    );
  }
}
