// src/lib/partner-moderation.ts
// Shared logic for the service-partner approval gate:
//   - the platform "auto-approve" toggle (admin-controlled, default ON)
//   - a reusable approvePartner() used by apply (auto), admin (manual), and the
//     24h cron backstop — so status/audit/email stay consistent everywhere.

import dbConnect from "@/lib/mongoose";
import PlatformConfig from "@/models/PlatformConfig";
import { sendPartnerApprovalEmail, sendPartnerRejectionEmail } from "@/lib/email-resend";

const MODERATION_ID = "moderation";

/**
 * Whether new partner applications should be approved automatically on submit.
 * Defaults to TRUE when no config doc exists yet.
 */
export async function getPartnerAutoApprove(): Promise<boolean> {
  await dbConnect();
  const cfg = await PlatformConfig.findById(MODERATION_ID).lean<{ moderation?: { partnerAutoApprove?: boolean } }>();
  // Default ON: only OFF when an admin has explicitly disabled it.
  return cfg?.moderation?.partnerAutoApprove !== false;
}

/** Set the platform-wide partner auto-approve toggle. */
export async function setPartnerAutoApprove(value: boolean, updatedBy?: string): Promise<void> {
  await dbConnect();
  await PlatformConfig.findByIdAndUpdate(
    MODERATION_ID,
    {
      $set: {
        "moderation.partnerAutoApprove": value,
        ...(updatedBy ? { updatedBy } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: false }
  );
}

/**
 * Approve a service-partner profile: flip the gate to "approved", stamp audit
 * fields, persist, and send the approval email (non-blocking). Safe to call on a
 * Mongoose user doc that already has a servicePartnerProfile.
 *
 * @param approvedBy  admin email, or "auto-approve" / "auto-approve-24h" for system approvals
 */
export async function approvePartner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any,
  approvedBy: string
): Promise<void> {
  if (!user?.servicePartnerProfile) return;

  if (!user.roles.includes("serviceProvider")) {
    user.roles.push("serviceProvider");
  }
  user.servicePartnerProfile.status = "approved";
  user.servicePartnerProfile.approvedAt = new Date();
  user.servicePartnerProfile.approvedBy = approvedBy;
  user.servicePartnerProfile.rejectionReason = undefined;
  user.markModified("servicePartnerProfile");
  await user.save();

  // Email is best-effort — never block/throw the approval on a mail failure.
  sendPartnerApprovalEmail(
    user.email,
    user.name || "",
    user.servicePartnerProfile.companyName || "",
    user.servicePartnerProfile.type || ""
  ).catch((err) => console.error("[partner-moderation] approval email failed:", err));
}

/**
 * Reject a service-partner: mark rejected, drop the serviceProvider role (hides
 * from the directory), persist, and send the rejection email (non-blocking).
 */
export async function rejectPartner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any,
  reason?: string
): Promise<void> {
  if (!user?.servicePartnerProfile) return;

  user.servicePartnerProfile.status = "rejected";
  user.servicePartnerProfile.rejectionReason = reason || "Rejected by admin";
  user.roles = user.roles.filter((r: string) => r !== "serviceProvider");
  user.markModified("servicePartnerProfile");
  await user.save();

  sendPartnerRejectionEmail(
    user.email,
    user.name || "",
    user.servicePartnerProfile.companyName || "",
    user.servicePartnerProfile.rejectionReason
  ).catch((err) => console.error("[partner-moderation] rejection email failed:", err));
}
