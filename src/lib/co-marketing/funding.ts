// src/lib/co-marketing/funding.ts
//
// Co-marketing funding lifecycle: create the per-campaign N-party funding doc,
// quote each party's plan, record approve/deny, collect each share (existing
// balance first, then a credit purchase at the party's tier for the remainder),
// and report when the campaign is fully funded and ready to launch.
//
// Money flows party → platform only (never partner → agent). The ACTUAL ad
// launch + the Stripe charge for a shortfall are wired by the caller (the
// approval API): on a shortfall this returns 'payment_required' with the charge,
// and on full funding it returns readyToLaunch so the route can run the existing
// launch path. See docs/campaigns/co-marketing-adspend.md.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import Campaign from "@/models/Campaign";
import CampaignFunding, {
  type ICampaignFunding,
  type ParticipantRole,
} from "@/models/CampaignFunding";
import { getBalance, debit, credit } from "@/lib/credits";
import { creditsToDollars, purchasePriceForCredits, type CreditTier } from "@/config/credits";
import {
  computeShares,
  computeFundingPlan,
  totalAllocated,
  type AllocationBasis,
  type FundingPlan,
} from "@/lib/co-marketing/allocation";

export interface CreateFundingParticipant {
  userId: string;
  partnershipId?: string;
  role: ParticipantRole;
  required?: boolean;       // default true
  percentage?: number;      // basis 'percentage'
  fixedCredits?: number;    // basis 'fixed'
  weight?: number;          // basis 'co_branding_share'
}

export interface CreateFundingInput {
  campaignId: string;
  agentId: string;
  totalCredits: number;     // total ad spend in credits (ignored for 'fixed' → sum of amounts)
  basis: AllocationBasis;
  participants: CreateFundingParticipant[];
  creativeSnapshot?: ICampaignFunding["creativeSnapshot"];
}

/** Stage a campaign for co-marketing funding: compute shares, create the funding
 *  doc, and flip the campaign to 'pending_adspend'. */
export async function createCampaignFunding(input: CreateFundingInput): Promise<ICampaignFunding> {
  await dbConnect();
  if (input.participants.length === 0) throw new Error("Funding needs at least one participant");

  const shares = computeShares({
    totalCredits: input.totalCredits,
    basis: input.basis,
    participants: input.participants.map((p) => ({
      userId: p.userId, percentage: p.percentage, fixedCredits: p.fixedCredits, weight: p.weight,
    })),
  });
  const shareByUser = new Map(shares.map((s) => [s.userId, s.shareCredits]));
  const totalCredits = input.basis === "fixed" ? totalAllocated(shares) : input.totalCredits;

  const participants = input.participants.map((p) => {
    const shareCredits = shareByUser.get(p.userId) ?? 0;
    return {
      userId: new mongoose.Types.ObjectId(p.userId),
      partnershipId: p.partnershipId ? new mongoose.Types.ObjectId(p.partnershipId) : undefined,
      role: p.role,
      required: p.required ?? true,
      shareCredits,
      shareDollars: creditsToDollars(shareCredits),
      approval: "pending" as const,
      funded: false,
      creditsFromBalance: 0,
      stripeChargeCents: 0,
    };
  });

  const funding = await CampaignFunding.create({
    campaignId: new mongoose.Types.ObjectId(input.campaignId),
    agentId: new mongoose.Types.ObjectId(input.agentId),
    status: "pending",
    allocationBasis: input.basis,
    totalCredits,
    totalDollars: creditsToDollars(totalCredits),
    participants,
    creativeSnapshot: input.creativeSnapshot,
  });

  await Campaign.findByIdAndUpdate(input.campaignId, {
    $set: { status: "pending_adspend", fundingId: funding._id },
  });

  return funding;
}

/** What a party would pay to approve: their share, how much from balance, and the
 *  dollar charge to buy any shortfall at their tier. */
export async function getParticipantFundingPlan(
  funding: ICampaignFunding,
  userId: string
): Promise<FundingPlan & { tier: CreditTier }> {
  const participant = funding.participants.find((p) => p.userId.toString() === userId);
  if (!participant) throw new Error("Participant not in this funding");
  const bal = await getBalance(userId);
  const plan = computeFundingPlan(participant.shareCredits, bal.balance, (c) =>
    purchasePriceForCredits(c, bal.tier)
  );
  return { ...plan, tier: bal.tier };
}

export type ApprovalResult =
  | { status: "payment_required"; chargeDollars: number; shortfallCredits: number }
  | { status: "approved"; readyToLaunch: false }
  | { status: "funded"; readyToLaunch: true };

/**
 * Record a party's approval and collect their share. If they're short on
 * credits, the caller must complete a Stripe charge first and pass the
 * paymentIntentId; otherwise we return 'payment_required' with the amount.
 */
export async function approveAndCollect(
  fundingId: string,
  userId: string,
  opts: { stripePaymentIntentId?: string } = {}
): Promise<ApprovalResult> {
  await dbConnect();
  const funding = await CampaignFunding.findById(fundingId);
  if (!funding) throw new Error("Funding not found");
  const participant = funding.participants.find((p) => p.userId.toString() === userId);
  if (!participant) throw new Error("Participant not in this funding");
  if (participant.funded) return fundingResult(funding); // idempotent
  if (participant.approval === "denied") throw new Error("This party already denied the ad spend");

  const bal = await getBalance(userId);
  const plan = computeFundingPlan(participant.shareCredits, bal.balance, (c) =>
    purchasePriceForCredits(c, bal.tier)
  );

  // Short on credits and no payment yet → tell the caller to charge first.
  if (plan.shortfallCredits > 0 && !opts.stripePaymentIntentId) {
    return { status: "payment_required", chargeDollars: plan.chargeDollars, shortfallCredits: plan.shortfallCredits };
  }

  // Buy the shortfall (markup earned here), then debit the full share at wholesale.
  if (plan.shortfallCredits > 0) {
    await credit({
      userId,
      amount: plan.shortfallCredits,
      type: "topup_purchase",
      description: `Credit purchase to fund co-marketing share (campaign ${funding.campaignId})`,
      stripePaymentIntentId: opts.stripePaymentIntentId,
      fundingId: funding._id,
    });
  }
  await debit({
    userId,
    amount: participant.shareCredits,
    type: "partner_split_debit",
    description: `Co-marketing ad-spend share (campaign ${funding.campaignId})`,
    campaignId: funding.campaignId,
    partnershipId: participant.partnershipId,
    fundingId: funding._id,
  });

  participant.approval = "approved";
  participant.respondedAt = new Date();
  participant.funded = true;
  participant.creditsFromBalance = plan.creditsFromBalance;
  participant.stripeChargeCents = Math.round(plan.chargeDollars * 100);
  participant.stripePaymentIntentId = opts.stripePaymentIntentId;
  participant.fundedAt = new Date();

  await finalizeIfReady(funding);
  await funding.save();
  return fundingResult(funding);
}

/** Record a denial. A required denial rejects the funding and refunds any
 *  already-collected shares. */
export async function denyFunding(fundingId: string, userId: string, reason?: string): Promise<void> {
  await dbConnect();
  const funding = await CampaignFunding.findById(fundingId);
  if (!funding) throw new Error("Funding not found");
  const participant = funding.participants.find((p) => p.userId.toString() === userId);
  if (!participant) throw new Error("Participant not in this funding");
  if (participant.funded) throw new Error("Can't deny — this party already funded their share");

  participant.approval = "denied";
  participant.respondedAt = new Date();
  participant.deniedReason = reason;

  if (participant.required) {
    await refundCollected(funding);
    funding.status = "rejected";
    funding.rejectedAt = new Date();
    await Campaign.findByIdAndUpdate(funding.campaignId, { $set: { status: "draft" } });
  }
  await funding.save();
}

/** Refund every participant who already funded (credits back to their balance).
 *  Stripe-side refunds for purchased shortfalls are handled separately by the caller. */
async function refundCollected(funding: ICampaignFunding): Promise<void> {
  for (const p of funding.participants) {
    if (p.funded) {
      await credit({
        userId: p.userId,
        amount: p.shareCredits,
        type: "refund",
        description: `Refund — co-marketing funding cancelled (campaign ${funding.campaignId})`,
        campaignId: funding.campaignId,
        partnershipId: p.partnershipId,
        fundingId: funding._id,
      });
      p.funded = false;
      p.fundedAt = undefined;
    }
  }
}

/** All required participants funded? */
export function isFullyFunded(funding: ICampaignFunding): boolean {
  return funding.participants.filter((p) => p.required).every((p) => p.funded);
}

async function finalizeIfReady(funding: ICampaignFunding): Promise<void> {
  if (isFullyFunded(funding)) {
    funding.status = "funded";
    funding.fundedAt = new Date();
    await Campaign.findByIdAndUpdate(funding.campaignId, { $set: { status: "active" } });
  } else {
    funding.status = "approved"; // partially approved/funded
  }
}

function fundingResult(funding: ICampaignFunding): ApprovalResult {
  return isFullyFunded(funding)
    ? { status: "funded", readyToLaunch: true }
    : { status: "approved", readyToLaunch: false };
}
