// src/app/api/admin/applications/agents/route.ts
// Admin: agent applications under paid onboarding (2026-10-28).
//
//   awaiting_payment → applied, hasn't paid (nothing to do; can reject)
//   site_review      → paid, is an agent; admin reviews license/MLS/ID →
//                      "confirm" publishes their site (siteApprovedAt)
//   final_approved   → confirmed
//   final_rejected   → rejected: plan cancelled + refunded, agent role removed
//
// Approval no longer grants the role — paying does (src/lib/agent-onboarding.ts).
// Legacy inquiry_pending applications (pre-pay flow) can still be rejected.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { sendAgentRejectionEmail, sendAgentSiteLiveEmail } from "@/lib/email-agent-application";
import { cancelAndRefundAgent } from "@/lib/agent-onboarding";

export const dynamic = "force-dynamic";

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  await dbConnect();

  const applications = await User.find({ "agentApplication.phase": { $exists: true, $ne: null } })
    .select("name email phone roles agentApplication agentProfile.subdomain agentProfile.mlsMembership createdAt")
    .sort({ "agentApplication.submittedAt": -1 })
    .lean<any[]>();

  return NextResponse.json({
    success: true,
    applications: applications.map((u) => {
      const a = u.agentApplication || {};
      const m = u.agentProfile?.mlsMembership || {};
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        isAgent: (u.roles || []).includes("realEstateAgent"),
        subdomain: u.agentProfile?.subdomain || "",
        licenseNumber: a.licenseNumber,
        licenseState: a.licenseState,
        brokerageName: a.brokerageName,
        mlsAssociation: m.associationName || a.mlsAssociation || "",
        mlsId: m.mlsId || a.mlsId || "",
        mlsContact: [m.contactName, m.contactPhone, m.contactEmail].filter(Boolean).join(" · "),
        identityStatus: a.identityStatus || null,
        phase: a.phase,
        paidAt: a.paidAt || null,
        siteApprovedAt: a.siteApprovedAt || null,
        createdAt: a.submittedAt || u.createdAt,
      };
    }),
  });
}

export async function PUT(request: NextRequest) {
  const { authorized, email: adminEmail } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  await dbConnect();

  const { userId, action, reason } = await request.json().catch(() => ({}));
  if (!userId || !["confirm", "reject"].includes(action)) {
    return NextResponse.json({ error: "Required: userId, action (confirm|reject)" }, { status: 400 });
  }
  const user = await User.findById(userId);
  if (!user?.agentApplication) return NextResponse.json({ error: "No agent application found for this user" }, { status: 404 });

  if (action === "confirm") {
    if (!user.roles.includes("realEstateAgent")) {
      return NextResponse.json({ error: "They haven't paid yet — confirm after they're an agent." }, { status: 400 });
    }
    user.agentApplication.phase = "final_approved";
    user.agentApplication.siteApprovedAt = new Date();
    user.agentApplication.finalApprovedAt = new Date();
    user.agentApplication.finalReviewNotes = reason || `Confirmed by ${adminEmail || "admin"}`;
    user.markModified("agentApplication");
    await user.save();
    sendAgentSiteLiveEmail({ name: user.name || "", email: user.email, subdomain: user.agentProfile?.subdomain }).catch((e) =>
      console.error("[agent-confirm] email failed:", e?.message)
    );
    return NextResponse.json({ success: true, message: "Confirmed. Their site goes live once their profile checklist is complete." });
  }

  // Reject: end and refund the plan, remove agent access, tell them why.
  let money = { cancelled: false, refundedUsd: 0 };
  try {
    money = await cancelAndRefundAgent(String(user._id));
  } catch (error) {
    console.error("[agent-reject] refund/cancel failed:", (error as Error).message);
    return NextResponse.json(
      { error: `Couldn't cancel/refund their Stripe subscription: ${(error as Error).message}. Nothing was changed.` },
      { status: 502 }
    );
  }
  user.agentApplication.phase = "final_rejected";
  user.agentApplication.finalReviewNotes = reason || "Rejected by admin";
  user.roles = user.roles.filter((r: string) => r !== "realEstateAgent");
  user.markModified("agentApplication");
  await user.save();
  sendAgentRejectionEmail({ applicantName: user.name || "", applicantEmail: user.email, reason: reason || undefined }).catch((e) =>
    console.error("[agent-reject] email failed:", e?.message)
  );
  return NextResponse.json({
    success: true,
    message: money.cancelled
      ? `Rejected. Subscription cancelled${money.refundedUsd ? ` and $${money.refundedUsd.toFixed(2)} refunded` : " (nothing to refund)"}.`
      : "Rejected.",
  });
}
