// app/api/campaigns/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import CampaignExecution from '@/models/CampaignExecution';
import VoicemailScript from '@/models/VoicemailScript';
import { Types } from 'mongoose';

/**
 * GET - Fetch campaign execution history
 */
export async function GET(
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

    // Fetch all executions for this campaign
    const executions = await (CampaignExecution as any)
      .find({
        campaignId: new Types.ObjectId(campaignId),
        userId,
      })
      .sort({ startedAt: -1 })
      .lean();

    console.log(`[history] Found ${executions.length} executions for campaign ${campaignId}`);

    // Also fetch VoicemailScripts that were sent but not part of any execution (historical data)
    const allExecutionScriptIds = executions.flatMap((exec: any) => exec.scriptIds || []);
    const historicalScripts = await (VoicemailScript as any)
      .find({
        campaignId: new Types.ObjectId(campaignId),
        userId,
        'delivery.status': { $in: ['sent', 'delivered', 'listened'] },
        _id: { $nin: allExecutionScriptIds }, // Exclude scripts already in executions
      })
      .sort({ 'delivery.sentAt': -1 })
      .lean();

    console.log(`[history] Found ${historicalScripts.length} historical voicemail scripts for campaign ${campaignId}`);

    // Group historical scripts by send date (within 5 minutes = same batch)
    const scriptBatches: any[] = [];
    historicalScripts.forEach((script: any) => {
      if (!script.delivery.sentAt) return;

      const sentAt = new Date(script.delivery.sentAt);
      // Find existing batch within 5 minutes
      const existingBatch = scriptBatches.find((batch) => {
        const batchTime = new Date(batch.date);
        const timeDiff = Math.abs(sentAt.getTime() - batchTime.getTime());
        return timeDiff < 5 * 60 * 1000; // 5 minutes
      });

      if (existingBatch) {
        existingBatch.scripts.push(script);
      } else {
        scriptBatches.push({
          date: sentAt,
          scripts: [script],
        });
      }
    });

    // Create history entries from script batches
    const scriptHistory = scriptBatches.map((batch) => {
      const scripts = batch.scripts;
      const sent = scripts.length;
      const delivered = scripts.filter((s: any) =>
        s.delivery.status === 'delivered' || s.delivery.status === 'listened'
      ).length;
      const listened = scripts.filter((s: any) =>
        s.delivery.listenedAt || s.delivery.listened
      ).length;
      const callbacks = scripts.filter((s: any) => s.delivery.callback).length;

      return {
        strategy: 'voicemail',
        date: batch.date,
        count: sent,
        status: 'completed',
        description: `Sent ${sent} voicemail${sent !== 1 ? 's' : ''} to contacts`,
        stats: {
          sent,
          delivered,
          listened,
          responses: listened + callbacks,
          callbacks,
        },
        isHistorical: true,
      };
    });

    // Format executions for the UI
    const executionHistory = executions.map((execution: any) => {
      let stats: any = {
        sent: execution.results.successCount,
      };

      // Add strategy-specific stats
      if (execution.strategyType === 'voicemail' && execution.voicemailMetrics) {
        stats = {
          ...stats,
          delivered: execution.voicemailMetrics.totalDelivered,
          listened: execution.voicemailMetrics.totalListened,
          responses: execution.voicemailMetrics.totalResponses,
          callbacks: execution.voicemailMetrics.totalCallbacks,
        };
      } else if (execution.strategyType === 'email' && execution.emailMetrics) {
        stats = {
          ...stats,
          delivered: execution.emailMetrics.totalDelivered,
          opened: execution.emailMetrics.totalOpened,
          clicked: execution.emailMetrics.totalClicked,
        };
      } else if (execution.strategyType === 'text' && execution.smsMetrics) {
        stats = {
          ...stats,
          delivered: execution.smsMetrics.totalDelivered,
          responses: execution.smsMetrics.totalResponses,
        };
      }

      return {
        strategy: execution.strategyType,
        date: execution.startedAt,
        count: execution.executionSnapshot.totalContacts,
        status: execution.status,
        description: `Sent ${execution.results.successCount} ${execution.strategyType}${execution.results.successCount !== 1 ? 's' : ''} to ${execution.executionSnapshot.totalContacts} contact${execution.executionSnapshot.totalContacts !== 1 ? 's' : ''}`,
        stats,
        execution,
      };
    });

    // Combine execution history and script history, sort by date
    const allHistory = [...executionHistory, ...scriptHistory].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    console.log(`[history] Returning ${allHistory.length} total history items (${executionHistory.length} executions + ${scriptHistory.length} historical batches)`);

    return NextResponse.json({
      success: true,
      history: allHistory,
      total: allHistory.length,
    });
  } catch (error: any) {
    console.error('[history] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
