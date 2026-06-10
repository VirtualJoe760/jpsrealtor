// src/lib/co-marketing/notify.ts
//
// Emails each co-marketing participant (except the lead agent) a deep link into
// their account to review their share and approve/deny. The approve action is
// taken from their AUTHENTICATED session (not a one-click email link), since it
// debits credits — the email only routes them in.

import User from "@/models/User";
import Campaign from "@/models/Campaign";
import { sendCoMarketingApprovalEmail } from "@/lib/email-resend";
import type { ICampaignFunding } from "@/models/CampaignFunding";

export async function sendCoMarketingApprovalEmails(funding: ICampaignFunding): Promise<void> {
  const [campaign, agent] = await Promise.all([
    Campaign.findById(funding.campaignId).select("name").lean(),
    User.findById(funding.agentId).select("name").lean(),
  ]);
  const campaignName = (campaign as any)?.name || "Co-marketing campaign";
  const agentName = (agent as any)?.name || "Your partner";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";

  const recipients = funding.participants.filter((p) => p.role !== "lead_agent");
  await Promise.all(
    recipients.map(async (p) => {
      const user = await User.findById(p.userId).select("email name").lean();
      const email = (user as any)?.email;
      if (!email) return;
      await sendCoMarketingApprovalEmail({
        email,
        name: (user as any)?.name || "",
        agentName,
        campaignName,
        shareCredits: p.shareCredits,
        shareDollars: p.shareDollars,
        reviewUrl: `${baseUrl}/agent/campaigns?funding=${funding._id.toString()}`,
      });
    })
  );
}
