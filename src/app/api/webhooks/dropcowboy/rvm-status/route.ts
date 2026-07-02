// app/api/webhooks/dropcowboy/rvm-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import CampaignExecution from '@/models/CampaignExecution';
import { Types } from 'mongoose';

/**
 * DropCowboy provides no request-signing / HMAC mechanism, so we gate the
 * webhook with a shared secret. Configure the DropCowboy webhook URL with
 * `?secret=<DROPCOWBOY_WEBHOOK_SECRET>` (or send it as an `x-webhook-secret`
 * header). The secret must be set in env AND in the DropCowboy dashboard.
 * Returns true when the request is authorized.
 */
function verifyDropCowboySecret(request: NextRequest): boolean {
  const expected = process.env.DROPCOWBOY_WEBHOOK_SECRET;
  if (!expected) {
    console.error('[DropCowboy RVM Webhook] DROPCOWBOY_WEBHOOK_SECRET not configured — rejecting request');
    return false;
  }
  const provided =
    request.headers.get('x-webhook-secret') ||
    new URL(request.url).searchParams.get('secret') ||
    '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * POST - Drop Cowboy RVM Delivery Status Webhook
 *
 * Receives delivery status updates from Drop Cowboy for sent voicemails.
 * Updates campaign stats and execution records based on delivery results.
 *
 * Webhook Payload from Drop Cowboy:
 * {
 *   "drop_id": "unique-message-id",
 *   "phone_number": "+15551234567",
 *   "attempt_date": "2026-01-08T01:30:00Z",
 *   "status": "success" | "failure",
 *   "reason": "error description" | "",
 *   "dnc": false,
 *   "product_cost": 0.10,
 *   "compliance_fee": 0.00,
 *   "tts_fee": 0.00,
 *   "network": "AT&T",
 *   "foreign_id": "campaign-name-contact-id"
 * }
 */
export async function POST(request: NextRequest) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📥 DROP COWBOY WEBHOOK - RVM STATUS');
  console.log('═══════════════════════════════════════════════════════════');

  // --- Reject unauthenticated requests BEFORE any DB mutation.
  if (!verifyDropCowboySecret(request)) {
    console.warn('⚠️ DropCowboy RVM webhook rejected: invalid or missing shared secret');
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await request.json();

    console.log('📦 Webhook Payload:', JSON.stringify(payload, null, 2));

    const {
      drop_id,
      phone_number,
      attempt_date,
      status,
      reason,
      dnc,
      product_cost,
      foreign_id,
      network,
    } = payload;

    // Parse foreign_id to extract campaign info
    // Format: "campaign-name-contact-id" or "campaignName-contactId"
    const foreignIdParts = foreign_id?.split('-');
    const contactId = foreignIdParts?.[foreignIdParts.length - 1];

    console.log('📋 Parsed webhook data:');
    console.log('   Drop ID:', drop_id);
    console.log('   Phone:', phone_number);
    console.log('   Status:', status);
    console.log('   Reason:', reason || 'N/A');
    console.log('   Foreign ID:', foreign_id);
    console.log('   Contact ID:', contactId);

    await dbConnect();

    // Find campaign execution record using foreign_id
    // The foreign_id contains campaign name and contact ID
    let execution;

    if (contactId) {
      // Try to find execution by looking for contact in results
      const executions = await (CampaignExecution as any).find({
        strategyType: 'voicemail',
        status: { $in: ['sent', 'active'] },
      }).sort({ startedAt: -1 }).limit(10).lean();

      // Find execution that might contain this contact
      for (const exec of executions) {
        if (exec.executionSnapshot?.voicemailMode === 'simple') {
          execution = exec;
          break;
        }
      }
    }

    if (!execution) {
      console.warn('⚠️  Could not find matching execution for webhook');
      console.warn('   This might be from a different campaign or old execution');
      // Still return 200 to acknowledge receipt
      return NextResponse.json({
        success: true,
        message: 'Webhook received but no matching execution found'
      });
    }

    console.log('✅ Found execution:', execution._id);

    // Update campaign stats based on delivery status
    const campaign = await (Campaign as any).findById(execution.campaignId);

    if (campaign) {
      console.log('✅ Found campaign:', campaign.name);

      if (status === 'success') {
        campaign.stats.delivered = (campaign.stats.delivered || 0) + 1;
        console.log('   📈 Incremented delivered count:', campaign.stats.delivered);
      } else {
        campaign.stats.failed = (campaign.stats.failed || 0) + 1;
        console.log('   📉 Incremented failed count:', campaign.stats.failed);
      }

      await campaign.save();
      console.log('✅ Campaign stats updated');
    }

    // Update execution record
    await (CampaignExecution as any).updateOne(
      { _id: execution._id },
      {
        $inc: {
          'results.successCount': status === 'success' ? 1 : 0,
          'results.failureCount': status === 'failure' ? 1 : 0,
          'voicemailMetrics.totalDelivered': status === 'success' ? 1 : 0,
          'voicemailMetrics.totalFailed': status === 'failure' ? 1 : 0,
        },
        $set: {
          lastUpdatedAt: new Date(),
        },
      }
    );

    console.log('✅ Execution record updated');

    // Log the delivery result for debugging/auditing
    console.log('\n📊 DELIVERY SUMMARY:');
    console.log(`   Status: ${status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Drop ID: ${drop_id}`);
    console.log(`   Phone: ${phone_number}`);
    console.log(`   Network: ${network || 'Unknown'}`);
    console.log(`   Cost: $${product_cost || 0}`);
    if (reason) {
      console.log(`   Failure Reason: ${reason}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      drop_id,
      status
    });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);

    // Still return 200 to prevent Drop Cowboy from retrying
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Webhook received but processing failed'
    }, { status: 200 });
  }
}

/**
 * GET - Test webhook endpoint
 * Useful for verifying the webhook is accessible
 */
export async function GET() {
  return NextResponse.json({
    message: 'Drop Cowboy RVM Status Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}
