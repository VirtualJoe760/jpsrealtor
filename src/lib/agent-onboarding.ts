// src/lib/agent-onboarding.ts
//
// Paid agent onboarding (2026-10-28):
//
//   apply (/api/agent/apply)            phase awaiting_payment
//   pay for Basic (Stripe Checkout,     → activatePaidAgent(): realEstateAgent role,
//     promo codes accepted)                subdomain, phase site_review, emails
//   verify ID (Stripe Identity)         → identityStatus verified
//   admin confirms (/admin/...agents)   → phase final_approved + siteApprovedAt
//   public site goes live               → isAgentSiteLive() in agent-site-readiness
//
// Existing agents were grandfathered (agentProfile.grandfathered) and skip all
// of this. Admins are exempt everywhere.

import Stripe from "stripe";
import User from "@/models/User";
import { generateSubdomain } from "@/lib/generate-subdomain";
import { sendAgentPaidWelcomeEmail, sendAdminPaidAgentNotice } from "@/lib/email-agent-application";

/**
 * Called by the Stripe webhook when a Basic checkout completes. Turns an
 * applicant who was waiting on payment into an agent. No-op for anyone else
 * (existing agents changing plans, grandfathered agents, admins).
 */
export async function activatePaidAgent(userId: string): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user || user.roles?.includes("realEstateAgent")) return false;
  if (user.agentApplication?.phase !== "awaiting_payment") return false;

  user.roles.push("realEstateAgent");
  user.agentApplication.phase = "site_review";
  user.agentApplication.paidAt = new Date();
  const subdomain = await generateSubdomain(user.name, user.email, user._id);
  if (!user.agentProfile) user.agentProfile = {} as any;
  user.agentProfile!.subdomain = subdomain;
  user.agentProfile!.onboardingComplete = false; // forces the setup wizard
  user.markModified("agentProfile");
  user.markModified("agentApplication");
  await user.save();

  const app = user.agentApplication;
  sendAgentPaidWelcomeEmail({ name: user.name || "", email: user.email, subdomain }).catch((e) =>
    console.error("[agent-onboarding] welcome email failed:", e?.message)
  );
  sendAdminPaidAgentNotice({
    name: user.name || "",
    email: user.email,
    licenseNumber: app?.licenseNumber,
    licenseState: app?.licenseState,
    mlsAssociation: app?.mlsAssociation,
  }).catch((e) => console.error("[agent-onboarding] admin notice failed:", e?.message));
  console.log(`[agent-onboarding] ${user.email} paid → agent (${subdomain}.chatrealty.io), awaiting site review`);
  return true;
}

// ── Stripe Identity ─────────────────────────────────────────────────

export const IDENTITY_PURPOSE = "agent_onboarding";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
}

export class IdentityUnavailableError extends Error {}

/** Starts (or resumes) a document + selfie check. Returns Stripe's hosted URL. */
export async function startIdentityVerification(userId: string, returnUrl: string): Promise<string> {
  const user = await User.findById(userId).select("agentApplication email");
  if (!user) throw new Error("User not found");
  const s = stripe();

  // Resume an unfinished session rather than paying for a new one.
  const existingId = user.agentApplication?.stripeIdentitySessionId;
  if (existingId) {
    try {
      const existing = await s.identity.verificationSessions.retrieve(existingId);
      if (existing.status === "requires_input" && existing.url) return existing.url;
    } catch {
      /* expired or other mode — make a new one */
    }
  }

  let session: Stripe.Identity.VerificationSession;
  try {
    session = await s.identity.verificationSessions.create({
      type: "document",
      metadata: { userId: String(userId), purpose: IDENTITY_PURPOSE },
      options: { document: { require_id_number: true, require_live_capture: true, require_matching_selfie: true } },
      return_url: returnUrl,
    });
  } catch (error: any) {
    // The Stripe account hasn't been approved for Identity yet.
    if (error?.code === "identity_api_invalid_application" || /not set up to use Identity/i.test(error?.message || "")) {
      throw new IdentityUnavailableError("ID verification isn't open yet.");
    }
    throw error;
  }
  await User.updateOne(
    { _id: userId },
    { $set: { "agentApplication.stripeIdentitySessionId": session.id, "agentApplication.identityStatus": "pending" } }
  );
  return session.url!;
}

/** Writes a verification session's outcome onto the user. Idempotent. */
export async function recordIdentityResult(session: Stripe.Identity.VerificationSession): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;
  const set: Record<string, unknown> = { "agentApplication.stripeIdentitySessionId": session.id };
  if (session.status === "verified") {
    Object.assign(set, {
      "agentApplication.identityStatus": "verified",
      "agentApplication.identityVerified": true,
      "agentApplication.identityVerifiedAt": new Date(),
      "agentApplication.stripeIdentityVerificationId": typeof session.last_verification_report === "string"
        ? session.last_verification_report
        : session.last_verification_report?.id,
    });
  } else if (session.status === "requires_input") {
    // Either not started yet, or Stripe couldn't verify (blurry photo, mismatch).
    set["agentApplication.identityStatus"] = session.last_error ? "requires_input" : "pending";
  } else if (session.status === "canceled") {
    set["agentApplication.identityStatus"] = "failed";
  } else {
    set["agentApplication.identityStatus"] = "pending"; // processing
  }
  await User.updateOne({ _id: userId }, { $set: set });
}

/** Re-reads the agent's session from Stripe (used when they come back from it). */
export async function syncIdentityVerification(userId: string): Promise<string | null> {
  const user = await User.findById(userId).select("agentApplication.stripeIdentitySessionId").lean<any>();
  const id = user?.agentApplication?.stripeIdentitySessionId;
  if (!id) return null;
  const session = await stripe().identity.verificationSessions.retrieve(id);
  await recordIdentityResult(session);
  return session.status;
}

/**
 * Admin rejected a paid agent: end their Basic subscription now and refund
 * what they paid (nothing to refund after a TOASTY13125 $0 first month).
 * Returns what happened, for the admin's confirmation message.
 */
export async function cancelAndRefundAgent(userId: string): Promise<{ cancelled: boolean; refundedUsd: number }> {
  const AgentSubscription = (await import("@/models/AgentSubscription")).default;
  const sub = await AgentSubscription.findOne({ agentId: userId, stripeSubscriptionId: { $exists: true, $ne: null } })
    .select("stripeSubscriptionId")
    .lean<{ stripeSubscriptionId?: string }>();
  if (!sub?.stripeSubscriptionId) return { cancelled: false, refundedUsd: 0 };
  const s = stripe();
  const stripeSub = await s.subscriptions.retrieve(sub.stripeSubscriptionId);
  let refundedUsd = 0;
  const invoiceId = typeof stripeSub.latest_invoice === "string" ? stripeSub.latest_invoice : stripeSub.latest_invoice?.id;
  if (invoiceId) {
    const invoice = await s.invoices.retrieve(invoiceId, { expand: ["payments"] });
    const pay = invoice.payments?.data?.find((p) => p.payment?.payment_intent);
    const pi = typeof pay?.payment?.payment_intent === "string" ? pay.payment.payment_intent : pay?.payment?.payment_intent?.id;
    if (pi && invoice.amount_paid > 0) {
      await s.refunds.create(
        { payment_intent: pi, metadata: { reason: "agent_rejected", userId } },
        { idempotencyKey: `agent-reject-refund:${userId}:${invoiceId}` }
      );
      refundedUsd = invoice.amount_paid / 100;
    }
  }
  if (stripeSub.status !== "canceled") await s.subscriptions.cancel(stripeSub.id);
  return { cancelled: true, refundedUsd };
}
