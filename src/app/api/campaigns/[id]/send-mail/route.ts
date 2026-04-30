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
import PointsLedger from '@/models/PointsLedger';
import {
  estimateDirectMailCredits,
  DIRECT_MAIL_CREDITS,
} from '@/config/credit-costs';

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

    console.log('[send-mail] qrUrl from body:', JSON.stringify(qrUrl));
    console.log('[send-mail] commonParams:', JSON.stringify(commonParams, null, 2));

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
    let totalCredits = 0;

    // --- Credit check: calculate and debit before sending ---
    const recipientEstimate = radiusSend ? (radiusRecordCount || 200) : 0; // contacts counted below
    if (radiusSend) {
      totalCredits = estimateDirectMailCredits(mailType as MailType, recipientEstimate, { radiusSearch: true });
    }
    // For CRM sends, credits are calculated after we know the recipient count (see below)

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

      // Debit credits for radius send
      const ledger = await PointsLedger.findOne({ userId });
      if (!ledger || ledger.balance < totalCredits) {
        return NextResponse.json({
          success: false,
          error: `Insufficient credits. Need ${totalCredits} credits, have ${ledger?.balance || 0}.`,
          creditsRequired: totalCredits,
          creditsAvailable: ledger?.balance || 0,
        }, { status: 400 });
      }
      ledger.debitPoints(totalCredits, 'campaign_spend', `Direct mail: ${mailType} radius send (${recipientEstimate} recipients)`, {
        channel: 'direct_mail',
        campaignId: campaign._id,
      });
      await ledger.save();

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
        creditCost: totalCredits,
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

      // Helper: check if an address object has usable data
      const hasAddressData = (addr: any): boolean => {
        if (!addr) return false;
        if (typeof addr === 'string') return addr.trim().length > 0;
        return !!(addr.street || addr.city || addr.state || addr.zip);
      };

      // Build recipients with all available fields per Thanks.io CSV template:
      // Name, First Name, Last Name, Company, Address, Address 2, City, State, Postal Code, Country, Email, Phone
      const recipients: Recipient[] = contacts
        .filter((c: any) => hasAddressData(c.mailingAddress) || hasAddressData(c.address))
        .map((c: any) => {
          const addr = (hasAddressData(c.mailingAddress) ? c.mailingAddress : c.address) || {};
          const isString = typeof addr === 'string';
          const primaryEmail = c.emails?.find((e: any) => e.isPrimary)?.address || c.emails?.[0]?.address || c.email;
          const primaryPhone = c.phones?.find((p: any) => p.isPrimary)?.number || c.phones?.[0]?.number || c.phone;

          return {
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || undefined,
            first_name: c.firstName || undefined,
            last_name: c.lastName || undefined,
            company: c.organization || undefined,
            address: isString ? addr : addr.street || '',
            city: isString ? undefined : addr.city || undefined,
            province: isString ? undefined : addr.state || undefined,
            postal_code: isString ? undefined : addr.zip || undefined,
            country: (isString ? undefined : addr.country) || 'US',
            email: primaryEmail || undefined,
            phone: primaryPhone || undefined,
          };
        });

      if (recipients.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No contacts have mailing addresses. Add addresses to contacts first.',
        }, { status: 400 });
      }

      // Validate recipients have complete address data before sending
      const incomplete = recipients.filter(r => !r.address || !r.city || !r.province || !r.postal_code);
      if (incomplete.length > 0) {
        const sampleNames = incomplete.slice(0, 5).map(r => r.name || 'Unknown').join(', ');
        const missingFields = [];
        if (incomplete.some(r => !r.address)) missingFields.push('street');
        if (incomplete.some(r => !r.city)) missingFields.push('city');
        if (incomplete.some(r => !r.province)) missingFields.push('state');
        if (incomplete.some(r => !r.postal_code)) missingFields.push('zip');

        return NextResponse.json({
          success: false,
          error: `${incomplete.length} of ${recipients.length} contacts have incomplete addresses (missing: ${missingFields.join(', ')}). Run address backfill to fix.`,
          incompleteCount: incomplete.length,
          totalCount: recipients.length,
          missingFields,
          sampleContacts: sampleNames,
          canBackfill: incomplete.some(r => r.postal_code),
        }, { status: 400 });
      }

      commonParams.recipients = recipients;

      // Debit credits for CRM contact send
      totalCredits = estimateDirectMailCredits(mailType as MailType, recipients.length);
      const ledger = await PointsLedger.findOne({ userId });
      if (!ledger || ledger.balance < totalCredits) {
        return NextResponse.json({
          success: false,
          error: `Insufficient credits. Need ${totalCredits} credits, have ${ledger?.balance || 0}.`,
          creditsRequired: totalCredits,
          creditsAvailable: ledger?.balance || 0,
        }, { status: 400 });
      }
      ledger.debitPoints(totalCredits, 'campaign_spend', `Direct mail: ${mailType} to ${recipients.length} contacts`, {
        channel: 'direct_mail',
        campaignId: campaign._id,
      });
      await ledger.save();

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
        .filter((c: any) => hasAddressData(c.mailingAddress) || hasAddressData(c.address))
        .map((c: any) => {
          const addr = (hasAddressData(c.mailingAddress) ? c.mailingAddress : c.address) || {};
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
            creditCost: DIRECT_MAIL_CREDITS[mailType as MailType] || 6,
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
      message: `${mailPiecesCreated} mail piece${mailPiecesCreated !== 1 ? 's' : ''} submitted! ${totalCredits} credits used.`,
      mailPiecesCreated,
      creditsUsed: totalCredits,
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
