// app/api/campaigns/[id]/send-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import Contact from '@/models/Contact';
import ContactCampaign from '@/models/ContactCampaign';
import User from '@/models/User';
import CampaignExecution from '@/models/CampaignExecution';
import { Types } from 'mongoose';

const DROP_COWBOY_TEAM_ID = process.env.DROP_COWBOY_TEAM_ID;
const DROP_COWBOY_SECRET = process.env.DROP_COWBOY_SECRET;
const DROP_COWBOY_BRAND_ID = process.env.DROP_COWBOY_BRAND_ID;
const DROP_COWBOY_NUMBER_POOL_ID = process.env.DROP_COWBOY_NUMBER_POOL_ID;
const DROP_COWBOY_API_URL = 'https://api.dropcowboy.com/v1';

interface SendResult {
  contactId: string;
  phone: string;
  status: 'success' | 'failed';
  dropId?: string;
  error?: string;
}

/**
 * POST - Send simplified voicemail campaign using existing Drop Cowboy recording
 *
 * This route bypasses script generation and audio generation.
 * It uses a pre-uploaded Drop Cowboy recording_id selected by the user.
 *
 * Request Body:
 * {
 *   recording_id: string;      // Drop Cowboy media_id (required)
 *   recording_name: string;    // Recording name for reference (optional)
 *   contact_ids?: string[];    // Optional: specific contact subset
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 SIMPLE CAMPAIGN SEND - STARTING');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // 1. Authenticate user
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
    const body = await request.json();
    const { recording_id, recording_name, contact_ids } = body;

    console.log('📋 Request Parameters:');
    console.log('   User ID:', userId.toString());
    console.log('   Campaign ID:', campaignId);
    console.log('   Recording ID:', recording_id);
    console.log('   Recording Name:', recording_name || 'Not provided');
    console.log('   Contact IDs:', contact_ids ? `${contact_ids.length} contacts` : 'All contacts');

    // 2. Validate required parameters
    if (!recording_id) {
      console.error('❌ Missing recording_id');
      return NextResponse.json(
        { success: false, error: 'recording_id is required' },
        { status: 400 }
      );
    }

    // 3. Validate Drop Cowboy credentials
    if (!DROP_COWBOY_TEAM_ID || !DROP_COWBOY_SECRET || !DROP_COWBOY_BRAND_ID || !DROP_COWBOY_NUMBER_POOL_ID) {
      console.error('❌ Drop Cowboy credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Drop Cowboy API credentials not configured. Please contact support.' },
        { status: 500 }
      );
    }

    console.log('✅ Drop Cowboy credentials verified');

    await dbConnect();

    // 4. Fetch campaign and verify ownership
    const campaign = await (Campaign as any).findOne({
      _id: new Types.ObjectId(campaignId),
      userId,
    });

    if (!campaign) {
      console.error('❌ Campaign not found or access denied');
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ Campaign found:', campaign.name);

    // 5. Update campaign with selected recording info
    campaign.selectedRecordingId = recording_id;
    campaign.selectedRecordingName = recording_name || 'Unknown Recording';
    campaign.voicemailMode = 'simple';
    await campaign.save();

    console.log('✅ Campaign updated with recording info');

    // 6. Fetch user details for forwarding number
    const userProfile = await (User as any).findById(userId);
    if (!userProfile?.phone) {
      console.error('❌ User phone number not found');
      return NextResponse.json(
        { success: false, error: 'Your phone number is required. Please update your profile in Settings.' },
        { status: 400 }
      );
    }

    const forwardingNumber = formatPhoneE164(userProfile.phone);
    console.log('📞 Forwarding Number:', forwardingNumber);

    // 7. Fetch contacts for campaign
    let contactFilter: any = { campaignId: new Types.ObjectId(campaignId) };

    // If specific contact_ids provided, filter to those
    if (contact_ids && Array.isArray(contact_ids) && contact_ids.length > 0) {
      contactFilter.contactId = { $in: contact_ids.map((id: string) => new Types.ObjectId(id)) };
    }

    const contactCampaigns = await (ContactCampaign as any)
      .find(contactFilter)
      .populate('contactId')
      .lean();

    const contacts = contactCampaigns
      .map((cc: any) => cc.contactId)
      .filter((c: any) => c); // Filter out any null contacts

    console.log(`👥 Found ${contacts.length} contacts to send to`);

    if (contacts.length === 0) {
      console.error('❌ No contacts found for campaign');
      return NextResponse.json(
        { success: false, error: 'No contacts found for this campaign' },
        { status: 400 }
      );
    }

    // 8. Send voicemails via Drop Cowboy
    const results: SendResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log('\n📤 SENDING VOICEMAILS...\n');

    for (const contact of contacts) {
      const phone = formatPhoneE164(contact.phone);

      if (!phone || phone.length < 12) {
        console.error(`❌ Invalid phone number for contact ${contact._id}`);
        failureCount++;
        results.push({
          contactId: contact._id.toString(),
          phone: contact.phone,
          status: 'failed',
          error: 'Invalid phone number',
        });
        continue;
      }

      console.log(`📞 Sending to: ${contact.firstName} ${contact.lastName} (${phone})`);
      console.log(`   Recording ID: ${recording_id}`);

      try {
        // Send RVM with recording_id
        const result = await sendSimpleVoicemail({
          phone,
          recordingId: recording_id,
          forwardingNumber,
          campaignName: campaign.name,
          contactId: contact._id.toString(),
        });

        if (result.success) {
          console.log(`   ✅ SUCCESS - Drop ID: ${result.dropId}`);
          successCount++;
          results.push({
            contactId: contact._id.toString(),
            phone,
            status: 'success',
            dropId: result.dropId,
          });
        } else {
          console.error(`   ❌ FAILED - ${result.error}`);
          failureCount++;
          results.push({
            contactId: contact._id.toString(),
            phone,
            status: 'failed',
            error: result.error,
          });
        }
      } catch (error: any) {
        console.error(`   ❌ EXCEPTION - ${error.message}`);
        failureCount++;
        results.push({
          contactId: contact._id.toString(),
          phone,
          status: 'failed',
          error: error.message,
        });
      }

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 9. Update campaign stats
    console.log('\n📊 Updating campaign stats...');

    // Update campaign stats manually
    campaign.stats.sent = (campaign.stats.sent || 0) + successCount;
    campaign.stats.failed = (campaign.stats.failed || 0) + failureCount;

    // Update campaign status
    if (successCount > 0) {
      campaign.status = 'active';
      campaign.submittedAt = new Date();
    }

    await campaign.save();
    console.log('✅ Campaign status updated');

    // 10. Create CampaignExecution record for history/analytics
    console.log('\n📝 Creating execution record...');

    const execution = await (CampaignExecution as any).create({
      campaignId: new Types.ObjectId(campaignId),
      userId,
      teamId: campaign.teamId,
      strategyType: 'voicemail',
      status: successCount > 0 ? 'sent' : 'failed',
      executionSnapshot: {
        campaignName: campaign.name,
        campaignType: campaign.type,
        totalContacts: contacts.length,
        scriptCount: 0, // Simple mode: no scripts
        audioCount: 0, // Simple mode: no generated audio
        recordingId: recording_id,
        recordingName: recording_name,
        voicemailMode: 'simple',
      },
      results: {
        successCount,
        failureCount,
        pendingCount: 0,
      },
      voicemailMetrics: {
        totalSent: successCount,
        totalDelivered: 0, // Will be updated by webhook
        totalFailed: failureCount,
        totalListened: 0, // Will be updated by webhook
        totalResponses: 0, // Will be updated by webhook
        totalCallbacks: 0, // Will be updated by webhook
        responseRate: 0,
        callbackRate: 0,
        statusBreakdown: {
          delivered: 0,
          failed: failureCount,
          busy: 0,
          no_answer: 0,
          voicemail_full: 0,
          invalid_number: 0,
          carrier_rejected: 0,
          dnc_listed: 0,
          other: 0,
        },
      },
      scriptIds: [], // Simple mode: no scripts
      startedAt: new Date(),
      completedAt: new Date(),
      lastUpdatedAt: new Date(),
    });

    console.log(`✅ Execution record created: ${execution._id}`);

    console.log('\n🎉 SIMPLE CAMPAIGN SEND COMPLETE:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaign.name,
      executionId: execution._id.toString(),
      totalContacts: contacts.length,
      successCount,
      failureCount,
      results,
      recordingId: recording_id,
      recordingName: recording_name,
    });

  } catch (error: any) {
    console.error('❌ Simple campaign send error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send campaign' },
      { status: 500 }
    );
  }
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Send voicemail via Drop Cowboy API using existing recording_id
 */
async function sendSimpleVoicemail(params: {
  phone: string;
  recordingId: string;
  forwardingNumber: string;
  campaignName: string;
  contactId: string;
}): Promise<{ success: boolean; dropId?: string; error?: string }> {
  try {
    const { phone, recordingId, forwardingNumber, campaignName, contactId } = params;

    console.log('      📦 Preparing RVM with recording_id:', recordingId);

    // Construct RVM payload - Using correct Drop Cowboy API parameter names
    const payload: any = {
      team_id: DROP_COWBOY_TEAM_ID,
      secret: DROP_COWBOY_SECRET,
      brand_id: DROP_COWBOY_BRAND_ID,
      pool_id: DROP_COWBOY_NUMBER_POOL_ID,  // ← Fixed: API expects "pool_id" not "number_pool_id"
      phone_number: phone,
      forwarding_number: forwardingNumber,
      recording_id: recordingId, // Use pre-selected recording_id
      foreign_id: `${campaignName}-${contactId}`,
    };

    console.log('      📦 Drop Cowboy RVM Payload (FULL):', JSON.stringify(payload, null, 2));
    console.log('      📦 Drop Cowboy RVM Payload (summary):', {
      phone_number: phone,
      forwarding_number: forwardingNumber,
      recording_id: recordingId,
      brand_id: DROP_COWBOY_BRAND_ID,
      pool_id: DROP_COWBOY_NUMBER_POOL_ID,  // ← Fixed: showing correct parameter name
      foreign_id: payload.foreign_id,
    });

    const response = await fetch(`${DROP_COWBOY_API_URL}/rvm`, {
      method: 'POST',
      headers: {
        'x-team-id': DROP_COWBOY_TEAM_ID!,
        'x-secret': DROP_COWBOY_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('      📡 RVM Response status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('      📦 RVM Response data (FULL):', JSON.stringify(data, null, 2));
      console.log('      📦 RVM Response fields:', Object.keys(data || {}));

      const dropId = data.drop_id || data.id || data.message_id || 'unknown';

      // Check if there's an error despite 200 OK status
      if (data.status === 'queued' && !data.drop_id && !data.id && !data.message_id) {
        console.warn('      ⚠️  WARNING: Got "queued" status but no drop_id/id/message_id!');
        console.warn('      ⚠️  This might indicate a soft failure or pending processing');
      }

      return { success: true, dropId };
    } else {
      const errorText = await response.text();
      console.error('      ❌ RVM Error response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error: any) {
    console.error('      ❌ Send exception:', error.message);
    return { success: false, error: error.message };
  }
}
