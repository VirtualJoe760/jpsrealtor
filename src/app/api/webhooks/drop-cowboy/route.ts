// app/api/webhooks/drop-cowboy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import VoicemailScript from '@/models/VoicemailScript';
import CampaignExecution from '@/models/CampaignExecution';
import { Types } from 'mongoose';

/**
 * POST - Drop Cowboy Webhook Handler
 * Receives delivery status updates from Drop Cowboy
 */
export async function POST(request: NextRequest) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📥 DROP COWBOY WEBHOOK - RECEIVED');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const body = await request.json();
    console.log('📦 Webhook Payload:', JSON.stringify(body, null, 2));

    await dbConnect();

    // Drop Cowboy sends different event types
    const eventType = body.event || body.type;
    const dropId = body.drop_id || body.id || body.message_id;
    const status = body.status;
    const phoneNumber = body.phone_number || body.to;

    console.log('📋 Event Details:');
    console.log('   Event Type:', eventType);
    console.log('   Drop ID:', dropId);
    console.log('   Status:', status);
    console.log('   Phone:', phoneNumber);

    // Find the voicemail script by Drop Cowboy message ID
    const script = await (VoicemailScript as any).findOne({
      'delivery.dropCowboyMessageId': dropId,
    });

    if (!script) {
      console.warn('⚠️ No script found for Drop ID:', dropId);
      return NextResponse.json({
        success: true,
        message: 'Webhook received but no matching script found',
      });
    }

    console.log('✅ Found script:', script._id);

    // Update script based on event type
    const updates: any = {
      'delivery.lastUpdatedAt': new Date(),
    };

    switch (eventType) {
      case 'delivered':
      case 'voicemail.delivered':
        updates['delivery.status'] = 'delivered';
        updates['delivery.deliveredAt'] = new Date();
        console.log('   ✅ Status: DELIVERED');
        break;

      case 'listened':
      case 'voicemail.listened':
        updates['delivery.listenedAt'] = new Date();
        updates['delivery.listenDuration'] = body.listen_duration || body.duration;
        updates['delivery.listened'] = true;
        console.log('   🎧 Status: LISTENED');
        console.log('   Duration:', body.listen_duration || body.duration, 'seconds');
        break;

      case 'callback':
      case 'voicemail.callback':
        updates['delivery.callbackAt'] = new Date();
        updates['delivery.callback'] = true;
        console.log('   📞 Status: CALLBACK RECEIVED');
        break;

      case 'failed':
      case 'voicemail.failed':
        updates['delivery.status'] = 'failed';
        updates['delivery.failureReason'] = body.reason || body.error || 'Unknown error';
        console.log('   ❌ Status: FAILED');
        console.log('   Reason:', updates['delivery.failureReason']);
        break;

      case 'busy':
        updates['delivery.status'] = 'busy';
        console.log('   📵 Status: BUSY');
        break;

      case 'no_answer':
        updates['delivery.status'] = 'no_answer';
        console.log('   🔇 Status: NO ANSWER');
        break;

      default:
        console.log('   ℹ️ Unhandled event type:', eventType);
    }

    // Update the script
    await (VoicemailScript as any).updateOne(
      { _id: script._id },
      { $set: updates }
    );

    console.log('✅ Script updated successfully');

    // Update CampaignExecution metrics
    const execution = await (CampaignExecution as any).findOne({
      campaignId: script.campaignId,
      scriptIds: script._id,
      strategyType: 'voicemail',
    }).sort({ startedAt: -1 });

    if (execution) {
      console.log('📊 Updating execution metrics:', execution._id);

      const metrics = execution.voicemailMetrics || {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalListened: 0,
        totalResponses: 0,
        totalCallbacks: 0,
        responseRate: 0,
        callbackRate: 0,
        statusBreakdown: {
          delivered: 0,
          failed: 0,
          busy: 0,
          no_answer: 0,
          voicemail_full: 0,
          invalid_number: 0,
          carrier_rejected: 0,
          dnc_listed: 0,
          other: 0,
        },
      };

      // Update metrics based on event
      switch (eventType) {
        case 'delivered':
        case 'voicemail.delivered':
          metrics.totalDelivered = (metrics.totalDelivered || 0) + 1;
          metrics.statusBreakdown.delivered = (metrics.statusBreakdown.delivered || 0) + 1;
          break;

        case 'listened':
        case 'voicemail.listened':
          metrics.totalListened = (metrics.totalListened || 0) + 1;
          metrics.totalResponses = (metrics.totalResponses || 0) + 1;

          // Update listen duration
          if (body.listen_duration || body.duration) {
            const currentAvg = metrics.averageListenDuration || 0;
            const currentCount = metrics.totalListened - 1;
            const newDuration = body.listen_duration || body.duration;
            metrics.averageListenDuration =
              (currentAvg * currentCount + newDuration) / metrics.totalListened;
          }
          break;

        case 'callback':
        case 'voicemail.callback':
          metrics.totalCallbacks = (metrics.totalCallbacks || 0) + 1;
          metrics.totalResponses = (metrics.totalResponses || 0) + 1;
          break;

        case 'failed':
        case 'voicemail.failed':
          metrics.totalFailed = (metrics.totalFailed || 0) + 1;
          metrics.statusBreakdown.failed = (metrics.statusBreakdown.failed || 0) + 1;
          break;

        case 'busy':
          metrics.statusBreakdown.busy = (metrics.statusBreakdown.busy || 0) + 1;
          break;

        case 'no_answer':
          metrics.statusBreakdown.no_answer = (metrics.statusBreakdown.no_answer || 0) + 1;
          break;
      }

      // Calculate rates
      if (metrics.totalSent > 0) {
        metrics.responseRate = Math.round((metrics.totalResponses / metrics.totalSent) * 100);
        metrics.callbackRate = Math.round((metrics.totalCallbacks / metrics.totalSent) * 100);
      }

      // Update delivery timestamps
      if (eventType === 'delivered' || eventType === 'voicemail.delivered') {
        if (!metrics.firstDeliveryAt) {
          metrics.firstDeliveryAt = new Date();
        }
        metrics.lastDeliveryAt = new Date();
      }

      // Save updated metrics
      execution.voicemailMetrics = metrics;
      execution.lastUpdatedAt = new Date();
      await execution.save();

      console.log('✅ Execution metrics updated');
      console.log('   Delivered:', metrics.totalDelivered);
      console.log('   Listened:', metrics.totalListened);
      console.log('   Callbacks:', metrics.totalCallbacks);
      console.log('   Response Rate:', metrics.responseRate + '%');
    } else {
      console.warn('⚠️ No execution found for campaign:', script.campaignId);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Webhook health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Drop Cowboy webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
