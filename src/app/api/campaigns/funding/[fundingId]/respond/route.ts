import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import CampaignFunding from "@/models/CampaignFunding";
import { approveAndCollect, denyFunding } from "@/lib/co-marketing/funding";
import { launchFundedCampaign } from "@/lib/co-marketing/ad-launch";
import { isFreeTier } from "@/lib/subscription-helpers";

/**
 * POST /api/campaigns/funding/[fundingId]/respond
 *
 * A participant approves or denies their co-marketing ad-spend share. Always
 * session-authenticated (the email only deep-links here) because approval debits
 * credits.
 *
 * Body: { action: 'approve' | 'deny', reason?: string }
 *
 * On approve with an insufficient balance, returns 402 + { paymentRequired,
 * chargeDollars, shortfallCredits } so the UI sends them to buy credits
 * (POST /api/points/topup) and then re-approve.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ fundingId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const uid = (session.user as any).id as string;
    const { fundingId } = await params;
    await dbConnect();

    const funding = await CampaignFunding.findById(fundingId);
    if (!funding) {
      return NextResponse.json({ success: false, error: "Funding not found" }, { status: 404 });
    }
    const participant = funding.participants.find((p) => p.userId.toString() === uid);
    if (!participant) {
      return NextResponse.json({ success: false, error: "You are not a participant in this campaign" }, { status: 403 });
    }
    if (funding.status === "rejected" || funding.status === "cancelled") {
      return NextResponse.json({ success: false, error: "This funding is no longer open" }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === "deny") {
      await denyFunding(fundingId, uid, body.reason);
      return NextResponse.json({ success: true, status: "denied" });
    }

    if (action === "approve") {
      // Co-marketing ad funding is a paid-plan feature; block free-tier agents (admins exempt).
      if (!(session.user as any).isAdmin && (await isFreeTier(uid))) {
        return NextResponse.json(
          { success: false, error: "Co-marketing ad funding requires a paid plan." },
          { status: 403 }
        );
      }
      const result = await approveAndCollect(fundingId, uid);
      if (result.status === "payment_required") {
        return NextResponse.json(
          {
            success: false,
            paymentRequired: true,
            chargeDollars: result.chargeDollars,
            shortfallCredits: result.shortfallCredits,
            topupUrl: "/api/points/topup",
            message: `You need ${result.shortfallCredits} more credits (~$${result.chargeDollars.toFixed(2)}) to fund your share. Buy credits, then approve again.`,
          },
          { status: 402 }
        );
      }
      // Last required party funded → fire the ads on the lead agent's account.
      if (result.readyToLaunch) {
        const launch = await launchFundedCampaign(fundingId).catch((e) => {
          console.error("[funding/respond] launch after funding failed:", e);
          return null;
        });
        return NextResponse.json({ success: true, status: result.status, readyToLaunch: true, launch });
      }
      return NextResponse.json({ success: true, status: result.status, readyToLaunch: false });
    }

    return NextResponse.json({ success: false, error: "action must be 'approve' or 'deny'" }, { status: 400 });
  } catch (error: any) {
    console.error("[funding/respond] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to record response" }, { status: 500 });
  }
}
