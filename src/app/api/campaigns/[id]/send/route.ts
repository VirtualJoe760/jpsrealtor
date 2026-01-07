// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import VoicemailScript from '@/models/VoicemailScript';
import Contact from '@/models/contact';
import ContactCampaign from '@/models/ContactCampaign';
import User from '@/models/User';
import CampaignExecution from '@/models/CampaignExecution';
import { Types } from 'mongoose';

const DROP_COWBOY_TEAM_ID = process.env.DROP_COWBOY_TEAM_ID;
const DROP_COWBOY_SECRET = process.env.DROP_COWBOY_SECRET;
const DROP_COWBOY_BRAND_ID = process.env.DROP_COWBOY_BRAND_ID;
const DROP_COWBOY_API_URL = 'https://api.dropcowboy.com/v1';

interface SendResult {
  scriptId: string;
  contactId: string;
  phone: string;
  status: 'success' | 'failed';
  dropId?: string;
  error?: string;
}

/**
 * POST - Send voicemail campaign via Drop Cowboy
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 CAMPAIGN SEND - STARTING');
  console.log('═══════════════════════════════════════════════════════════');

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
    const body = await request.json();
    const { sendNow, scheduledDate } = body;

    console.log('📋 Request Parameters:');
    console.log('   User ID:', userId.toString());
    console.log('   Campaign ID:', campaignId);
    console.log('   Send Now:', sendNow);
    console.log('   Scheduled Date:', scheduledDate);

    // Validate Drop Cowboy credentials
    if (!DROP_COWBOY_TEAM_ID || !DROP_COWBOY_SECRET || !DROP_COWBOY_BRAND_ID) {
      console.error('❌ Drop Cowboy credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Drop Cowboy API credentials not configured. Please contact support.' },
        { status: 500 }
      );
    }

    console.log('✅ Drop Cowboy credentials verified');

    await dbConnect();

    // Fetch campaign and verify ownership
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

    // Fetch user details for forwarding number
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

    // Find all scripts ready to send (audio completed, not sent yet)
    const scripts = await (VoicemailScript as any).find({
      campaignId: new Types.ObjectId(campaignId),
      'audio.status': 'completed',
      'delivery.status': 'not_sent',
    }).lean();

    console.log(`📝 Found ${scripts.length} scripts ready to send`);

    if (scripts.length === 0) {
      console.error('❌ No scripts ready to send');
      return NextResponse.json(
        { success: false, error: 'No scripts with completed audio ready to send' },
        { status: 400 }
      );
    }

    // Check if this is a general campaign (one script for all contacts)
    const isGeneral = scripts[0].isGeneral;
    console.log('📊 Campaign Type:', isGeneral ? 'General (one script)' : 'Personalized (per contact)');

    let contacts: any[] = [];
    let contactMap: Map<string, any>;

    if (isGeneral) {
      // For general campaigns: fetch ALL contacts from ContactCampaign junction table
      console.log('📋 Fetching all contacts from campaign...');
      const contactCampaigns = await (ContactCampaign as any)
        .find({ campaignId: new Types.ObjectId(campaignId) })
        .populate('contactId')
        .lean();

      contacts = contactCampaigns
        .map((cc: any) => cc.contactId)
        .filter((c: any) => c); // Filter out any null contacts

      console.log(`👥 Found ${contacts.length} contacts in campaign`);

      // For general scripts, we don't need a contactMap since we'll use the same script for all
      contactMap = new Map();
    } else {
      // For personalized campaigns: fetch contacts based on script contactIds
      const contactIds = scripts
        .filter((s: any) => s.contactId)
        .map((s: any) => s.contactId);

      contacts = await (Contact as any).find({
        _id: { $in: contactIds },
      }).lean();

      console.log(`👥 Found ${contacts.length} contacts`);

      // Create a map for quick contact lookup
      contactMap = new Map(
        contacts.map((c: any) => [c._id.toString(), c])
      );
    }

    // Send voicemails via Drop Cowboy
    const results: SendResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log('\n📤 SENDING VOICEMAILS...\n');

    if (isGeneral) {
      // For general campaigns: send the same script to all contacts
      const generalScript = scripts[0]; // There's only one script for general campaigns

      for (const contact of contacts) {
        const phone = formatPhoneE164(contact.phone);

        if (!phone || phone.length < 12) {
          console.error(`❌ Invalid phone number for contact ${contact._id}`);
          failureCount++;
          results.push({
            scriptId: generalScript._id.toString(),
            contactId: contact._id.toString(),
            phone: contact.phone,
            status: 'failed',
            error: 'Invalid phone number',
          });
          continue;
        }

        console.log(`📞 Sending to: ${contact.firstName} ${contact.lastName} (${phone})`);
        console.log(`   Script ID: ${generalScript._id}`);
        console.log(`   Audio URL: ${generalScript.audio.url}`);

        try {
          // Send voicemail via Drop Cowboy
          const result = await sendVoicemail({
            phone,
            audioUrl: generalScript.audio.url,
            forwardingNumber,
            campaignName: campaign.name,
            contactName: `${contact.firstName} ${contact.lastName}`,
            scriptId: generalScript._id.toString(),
          });

          if (result.success) {
            console.log(`   ✅ SUCCESS - Drop ID: ${result.dropId}`);
            successCount++;
            results.push({
              scriptId: generalScript._id.toString(),
              contactId: contact._id.toString(),
              phone,
              status: 'success',
              dropId: result.dropId,
            });
          } else {
            console.error(`   ❌ FAILED - ${result.error}`);
            failureCount++;
            results.push({
              scriptId: generalScript._id.toString(),
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
            scriptId: generalScript._id.toString(),
            contactId: contact._id.toString(),
            phone,
            status: 'failed',
            error: error.message,
          });
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update general script delivery status
      if (successCount > 0) {
        await (VoicemailScript as any).updateOne(
          { _id: generalScript._id },
          {
            $set: {
              'delivery.status': 'sent',
              'delivery.sentAt': new Date(),
              'delivery.sentCount': successCount,
              'delivery.failedCount': failureCount,
            },
          }
        );
      }
    } else {
      // For personalized campaigns: each script goes to its specific contact
      for (const script of scripts) {
        const contact = contactMap.get(script.contactId?.toString());

        if (!contact) {
          console.error(`❌ Contact not found for script ${script._id}`);
          failureCount++;
          results.push({
            scriptId: script._id.toString(),
            contactId: script.contactId?.toString() || 'unknown',
            phone: 'unknown',
            status: 'failed',
            error: 'Contact not found',
          });
          continue;
        }

        const phone = formatPhoneE164(contact.phone);

        if (!phone || phone.length < 12) {
          console.error(`❌ Invalid phone number for contact ${contact._id}`);
          failureCount++;
          results.push({
            scriptId: script._id.toString(),
            contactId: contact._id.toString(),
            phone: contact.phone,
            status: 'failed',
            error: 'Invalid phone number',
          });
          continue;
        }

        console.log(`📞 Sending to: ${contact.firstName} ${contact.lastName} (${phone})`);
        console.log(`   Script ID: ${script._id}`);
        console.log(`   Audio URL: ${script.audio.url}`);

        try {
          // Send voicemail via Drop Cowboy
          const result = await sendVoicemail({
            phone,
            audioUrl: script.audio.url,
            forwardingNumber,
            campaignName: campaign.name,
            contactName: `${contact.firstName} ${contact.lastName}`,
            scriptId: script._id.toString(),
          });

          if (result.success) {
            console.log(`   ✅ SUCCESS - Drop ID: ${result.dropId}`);

            // Update script delivery status
            await (VoicemailScript as any).updateOne(
              { _id: script._id },
              {
                $set: {
                  'delivery.status': 'sent',
                  'delivery.dropCowboyMessageId': result.dropId,
                  'delivery.sentAt': new Date(),
                },
              }
            );

            successCount++;
            results.push({
              scriptId: script._id.toString(),
              contactId: contact._id.toString(),
              phone,
              status: 'success',
              dropId: result.dropId,
            });
          } else {
            console.error(`   ❌ FAILED - ${result.error}`);

            // Update script delivery status to failed
            await (VoicemailScript as any).updateOne(
              { _id: script._id },
              {
                $set: {
                  'delivery.status': 'failed',
                  'delivery.failureReason': result.error,
                },
              }
            );

            failureCount++;
            results.push({
              scriptId: script._id.toString(),
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
            scriptId: script._id.toString(),
            contactId: contact._id.toString(),
            phone,
            status: 'failed',
            error: error.message,
          });
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update campaign stats
    console.log('\n📊 Updating campaign stats...');
    await campaign.updateStats();

    // Update campaign status
    if (successCount > 0) {
      campaign.status = 'active';
      campaign.submittedAt = new Date();
      await campaign.save();
      console.log('✅ Campaign status updated to active');
    }

    // Create CampaignExecution record for history/analytics
    console.log('\n📝 Creating execution record...');
    const scriptIds = scripts.map((s: any) => s._id);

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
        scriptCount: scripts.length,
        audioCount: scripts.length,
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
      scriptIds,
      startedAt: new Date(),
      completedAt: new Date(),
      lastUpdatedAt: new Date(),
    });

    console.log(`✅ Execution record created: ${execution._id}`);

    console.log('\n🎉 CAMPAIGN SEND COMPLETE:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaign.name,
      executionId: execution._id.toString(),
      totalScripts: scripts.length,
      successCount,
      failureCount,
      results,
    });

  } catch (error: any) {
    console.error('❌ Campaign send error:', error);
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
 * Upload audio to Drop Cowboy /media endpoint
 */
async function uploadAudioToDropCowboy(audioUrl: string, filename: string): Promise<{ success: boolean; recordingId?: string; error?: string }> {
  try {
    console.log('      🎵 Uploading audio to Drop Cowboy...');
    console.log('         Audio URL:', audioUrl.substring(0, 60) + '...');

    // Fetch the audio file from Cloudinary
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return { success: false, error: 'Failed to fetch audio from storage' };
    }

    // Convert to base64
    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    console.log('         Audio size (base64):', audioBase64.length, 'bytes');

    // Upload to Drop Cowboy
    const uploadResponse = await fetch(`${DROP_COWBOY_API_URL}/media`, {
      method: 'POST',
      headers: {
        'x-team-id': DROP_COWBOY_TEAM_ID!,
        'x-secret': DROP_COWBOY_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        team_id: DROP_COWBOY_TEAM_ID,
        secret: DROP_COWBOY_SECRET,
        filename,
        audio_data: audioBase64,
      }),
    });

    console.log('         Upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('         Upload error:', error);
      return { success: false, error };
    }

    const data = await uploadResponse.json();
    console.log('         Upload response data:', data);

    // Drop Cowboy returns an array with media object
    const mediaObject = Array.isArray(data) ? data[0] : data;
    const recordingId = mediaObject.media_id || mediaObject.recording_id || mediaObject.id;

    if (!recordingId) {
      return { success: false, error: 'No recording ID returned from Drop Cowboy' };
    }

    console.log('         ✅ Audio uploaded! Recording ID:', recordingId);
    return { success: true, recordingId };
  } catch (error: any) {
    console.error('         ❌ Upload exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send voicemail via Drop Cowboy API
 */
async function sendVoicemail(params: {
  phone: string;
  audioUrl: string;
  forwardingNumber: string;
  campaignName: string;
  contactName: string;
  scriptId: string;
}): Promise<{ success: boolean; dropId?: string; error?: string }> {
  try {
    const { phone, audioUrl, forwardingNumber, campaignName, contactName, scriptId } = params;

    // Step 1: Upload audio to Drop Cowboy
    const filename = `${scriptId}.mp3`;
    const uploadResult = await uploadAudioToDropCowboy(audioUrl, filename);

    if (!uploadResult.success || !uploadResult.recordingId) {
      return { success: false, error: uploadResult.error || 'Failed to upload audio' };
    }

    const recordingId = uploadResult.recordingId;

    // Step 2: Send RVM with the recording ID
    const payload: any = {
      team_id: DROP_COWBOY_TEAM_ID,
      secret: DROP_COWBOY_SECRET,
      brand_id: DROP_COWBOY_BRAND_ID,
      phone_number: phone,
      forwarding_number: forwardingNumber,
      recording_id: recordingId, // Use the uploaded recording ID
      foreign_id: `${campaignName}-${scriptId}`,
    };

    console.log('      📦 Drop Cowboy RVM Payload:', {
      phone_number: phone,
      forwarding_number: forwardingNumber,
      recording_id: recordingId,
      brand_id: DROP_COWBOY_BRAND_ID,
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
      console.log('      📦 RVM Response data:', data);
      const dropId = data.drop_id || data.id || data.message_id || 'unknown';
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
