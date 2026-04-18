import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import DirectMailPiece from '@/models/DirectMailPiece';
import ContactCampaign from '@/models/ContactCampaign';
import Contact from '@/models/Contact';
import {
  sendPostcard,
  sendNotecard,
  sendLetter,
  isThanksioConfigured,
  estimateCost,
  type MailType,
  type Recipient,
  type RadiusSearch,
} from '@/lib/thanksio';

/**
 * POST /api/campaigns/[id]/send-mail
 *
 * Send direct mail via thanks.io for a campaign.
 * Supports both CRM contact targeting and radius search.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isThanksioConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Thanks.io is not configured. Add THANKSIO_API_KEY to your environment.',
      }, { status: 400 });
    }

    const { id } = await params;
    await dbConnect();

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      mailType = 'postcard_4x6',
      frontImageUrl,
      message,
      handwritingStyle,
      handwritingRealism,
      qrUrl,
      returnAddress,
      // Radius send params
      radiusSend,
      radiusAddress,
      radiusPostalCode,
      radiusRecordCount,
      radiusRecordTypes,
    } = body;

    const userId = (session.user as any).id;

    // Build common params
    const commonParams: any = {
      front_image_url: frontImageUrl,
      message,
      handwriting_style: handwritingStyle || undefined,
      handwriting_realism: handwritingRealism || undefined,
      qrcode_url: qrUrl || undefined,
    };

    // Return address
    if (returnAddress) {
      commonParams.return_name = returnAddress.name;
      commonParams.return_address = returnAddress.address;
      commonParams.return_city = returnAddress.city;
      commonParams.return_state = returnAddress.state;
      commonParams.return_postal_code = returnAddress.zip;
    }

    let order: any;
    let mailPiecesCreated = 0;

    if (radiusSend) {
      // --- Radius Send ---
      const radiusSearch: RadiusSearch = {
        address: radiusAddress,
        postal_code: radiusPostalCode,
        record_count: radiusRecordCount || 200,
        record_types: radiusRecordTypes || 'all',
        include_condos: true,
      };

      commonParams.radius_search = radiusSearch;

      // Determine mail type and send
      if (mailType === 'notecard') {
        order = await sendNotecard({ ...commonParams, message: message || 'Thank you!' });
      } else if (mailType === 'letter') {
        order = await sendLetter(commonParams);
      } else {
        const size = mailType.replace('postcard_', '') as '4x6' | '6x9' | '6x11';
        order = await sendPostcard({ ...commonParams, size });
      }

      mailPiecesCreated = radiusRecordCount || 200;

      // Create a single DirectMailPiece record for radius sends
      await DirectMailPiece.create({
        campaignId: campaign._id,
        userId,
        mailType,
        thanksioOrderId: String(order.id || order.data?.id),
        frontImageUrl: frontImageUrl || '',
        message,
        recipientName: 'Radius Send',
        recipientAddress: {
          street: radiusAddress,
          city: '',
          state: '',
          zip: radiusPostalCode,
        },
        status: 'submitted',
        submittedAt: new Date(),
        cost: estimateCost(mailType as MailType, mailPiecesCreated, { radiusSearch: true }),
        isRadiusSend: true,
        qrUrl,
      });

    } else {
      // --- CRM Contact Send ---
      // Get campaign contacts
      const contactCampaigns = await ContactCampaign.find({ campaignId: campaign._id });
      const contactIds = contactCampaigns.map((cc: any) => cc.contactId);
      const contacts = await Contact.find({ _id: { $in: contactIds } });

      if (contacts.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No contacts in this campaign. Add contacts first.',
        }, { status: 400 });
      }

      // Build recipients from contacts
      const recipients: Recipient[] = contacts
        .filter((c: any) => c.address || c.mailingAddress)
        .map((c: any) => {
          const addr = c.mailingAddress || c.address || {};
          return {
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || undefined,
            address: typeof addr === 'string' ? addr : `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`,
          };
        });

      if (recipients.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No contacts have mailing addresses. Add addresses to contacts first.',
        }, { status: 400 });
      }

      commonParams.recipients = recipients;

      // Send based on mail type
      if (mailType === 'notecard') {
        order = await sendNotecard({ ...commonParams, message: message || 'Thank you!' });
      } else if (mailType === 'letter') {
        order = await sendLetter(commonParams);
      } else {
        const size = mailType.replace('postcard_', '') as '4x6' | '6x9' | '6x11';
        order = await sendPostcard({ ...commonParams, size });
      }

      mailPiecesCreated = recipients.length;

      // Create DirectMailPiece records for each contact
      const pieces = contacts
        .filter((c: any) => c.address || c.mailingAddress)
        .map((c: any) => {
          const addr = c.mailingAddress || c.address || {};
          return {
            campaignId: campaign._id,
            contactId: c._id,
            userId,
            mailType,
            thanksioOrderId: String(order.id || order.data?.id),
            frontImageUrl: frontImageUrl || '',
            message,
            recipientName: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            recipientAddress: {
              street: typeof addr === 'string' ? addr : addr.street || '',
              city: typeof addr === 'string' ? '' : addr.city || '',
              state: typeof addr === 'string' ? '' : addr.state || '',
              zip: typeof addr === 'string' ? '' : addr.zip || '',
            },
            status: 'submitted',
            submittedAt: new Date(),
            cost: estimateCost(mailType as MailType, 1),
            isRadiusSend: false,
            qrUrl,
          };
        });

      if (pieces.length > 0) {
        await DirectMailPiece.insertMany(pieces);
      }
    }

    // Update campaign stats
    campaign.stats.mailSent = (campaign.stats.mailSent || 0) + mailPiecesCreated;
    campaign.activeStrategies.directMail = true;

    // Save thanks.io config to campaign
    campaign.thanksioConfig = {
      mailType: mailType as any,
      frontImageUrl,
      message,
      handwritingStyle,
      qrUrl,
      returnAddress: returnAddress || undefined,
    };

    await campaign.save();

    return NextResponse.json({
      success: true,
      message: `${mailPiecesCreated} mail piece${mailPiecesCreated !== 1 ? 's' : ''} submitted to thanks.io!`,
      mailPiecesCreated,
      orderId: order.id || order.data?.id,
      testMode: process.env.THANKSIO_TEST_MODE === 'true',
    });
  } catch (error: any) {
    console.error('[send-mail] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send mail' },
      { status: 500 }
    );
  }
}
