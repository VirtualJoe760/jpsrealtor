import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Campaign from "@/models/Campaign";
import CampaignFunding from "@/models/CampaignFunding";
import Partnership from "@/models/Partnership";
import {
  createCampaignFunding,
  getParticipantFundingPlan,
  type CreateFundingParticipant,
} from "@/lib/co-marketing/funding";
import { sendCoMarketingApprovalEmails } from "@/lib/co-marketing/notify";
import type { AllocationBasis } from "@/lib/co-marketing/allocation";

/**
 * POST /api/campaigns/[id]/fund
 *
 * "Bill to partnership(s)": the lead agent stages a campaign's ad spend to be
 * split across one or more pre-established partnerships. Creates the
 * CampaignFunding doc (which flips the campaign to 'pending_adspend') and
 * returns each participant's funding plan so the UI can show who must top up.
 *
 * Body: {
 *   totalCredits: number,                 // total ad spend in credits (ignored for 'fixed')
 *   basis: 'equal'|'percentage'|'fixed'|'co_branding_share',
 *   participants: Array<{ userId, partnershipId?, role, required?, percentage?, fixedCredits?, weight? }>,
 *   creativeSnapshot?: { pageUrl?, pageName?, imageUrl?, headline?, primaryText? }
 * }
 * The lead agent MUST be included as a participant (role 'lead_agent').
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const agentId = (session.user as any).id as string;
    const { id } = await params;
    await dbConnect();

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.userId.toString() !== agentId) {
      return NextResponse.json({ success: false, error: "Only the campaign owner can bill partnerships" }, { status: 403 });
    }
    if (campaign.fundingId) {
      return NextResponse.json({ success: false, error: "This campaign already has a funding in progress" }, { status: 409 });
    }

    const body = await request.json();
    const basis: AllocationBasis = body.basis ?? "co_branding_share";
    const participants: CreateFundingParticipant[] = Array.isArray(body.participants) ? body.participants : [];

    // --- Validation ---
    if (participants.length < 2) {
      return NextResponse.json({ success: false, error: "Select at least one partner to split with" }, { status: 400 });
    }
    const lead = participants.find((p) => p.role === "lead_agent");
    if (!lead || lead.userId !== agentId) {
      return NextResponse.json({ success: false, error: "The lead agent must be a participant" }, { status: 400 });
    }
    if (basis === "percentage") {
      const sum = participants.reduce((s, p) => s + (p.percentage ?? 0), 0);
      if (Math.abs(sum - 100) > 0.5) {
        return NextResponse.json({ success: false, error: `Percentages must total 100 (got ${sum})` }, { status: 400 });
      }
    }
    if (basis === "fixed" && participants.some((p) => p.fixedCredits == null)) {
      return NextResponse.json({ success: false, error: "Fixed split needs a credit amount per party" }, { status: 400 });
    }
    if (basis !== "fixed" && (!body.totalCredits || body.totalCredits <= 0)) {
      return NextResponse.json({ success: false, error: "totalCredits is required" }, { status: 400 });
    }

    // Validate each non-lead participant maps to an active partnership owned by this agent.
    for (const p of participants) {
      if (p.role === "lead_agent") continue;
      if (!p.partnershipId) {
        return NextResponse.json({ success: false, error: "Each partner needs a partnershipId" }, { status: 400 });
      }
      const pship = await Partnership.findById(p.partnershipId);
      if (!pship || pship.status !== "active") {
        return NextResponse.json({ success: false, error: "Partnership not found or not active" }, { status: 400 });
      }
      const involvesAgent = pship.agentId.toString() === agentId;
      const involvesParty =
        pship.servicePartnerId.toString() === p.userId || pship.agentId.toString() === p.userId;
      if (!involvesAgent || !involvesParty) {
        return NextResponse.json({ success: false, error: "Partnership does not match this agent + partner" }, { status: 400 });
      }
    }

    const funding = await createCampaignFunding({
      campaignId: id,
      agentId,
      totalCredits: body.totalCredits ?? 0,
      basis,
      participants,
      creativeSnapshot: body.creativeSnapshot,
    });

    // Per-participant plans (share + how much they must top up).
    const plans = await Promise.all(
      funding.participants.map(async (p) => ({
        userId: p.userId.toString(),
        role: p.role,
        shareCredits: p.shareCredits,
        shareDollars: p.shareDollars,
        ...(await getParticipantFundingPlan(funding, p.userId.toString())),
      }))
    );

    // Email each partner a deep link to review + approve their share.
    await sendCoMarketingApprovalEmails(funding).catch((e) =>
      console.error("[campaigns/fund] approval emails failed:", e)
    );

    return NextResponse.json({ success: true, fundingId: funding._id.toString(), status: funding.status, plans });
  } catch (error: any) {
    console.error("[campaigns/fund] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create funding" }, { status: 500 });
  }
}

/**
 * GET /api/campaigns/[id]/fund — current funding status for this campaign
 * (participants + approvals). Visible to the lead agent or any participant.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const uid = (session.user as any).id as string;
    const { id } = await params;
    await dbConnect();

    const funding = await CampaignFunding.findOne({ campaignId: id }).sort({ createdAt: -1 });
    if (!funding) {
      return NextResponse.json({ success: true, funding: null });
    }
    const isParticipant =
      funding.agentId.toString() === uid || funding.participants.some((p) => p.userId.toString() === uid);
    if (!isParticipant) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      funding: {
        id: funding._id.toString(),
        status: funding.status,
        allocationBasis: funding.allocationBasis,
        totalCredits: funding.totalCredits,
        totalDollars: funding.totalDollars,
        participants: funding.participants.map((p) => ({
          userId: p.userId.toString(),
          role: p.role,
          required: p.required,
          shareCredits: p.shareCredits,
          shareDollars: p.shareDollars,
          approval: p.approval,
          funded: p.funded,
          respondedAt: p.respondedAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("[campaigns/fund GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to load funding" }, { status: 500 });
  }
}
