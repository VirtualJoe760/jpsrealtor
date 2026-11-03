// src/lib/site-setup-emails.ts
// Emails for the $300 custom-site setup (site-platform plan P5). Platform mail:
// renderBrandedEmail shell + platformFrom() via sendPlatformEmail.
// Docs: docs/commerce/site-setup.md.

import { renderBrandedEmail, escapeHtml } from "@/lib/email-brand";
import { sendPlatformEmail } from "@/lib/email-resend";

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";
const adminEmail = () => process.env.ADMIN_EMAIL || "josephsardella@gmail.com";
const first = (name: string) => escapeHtml((name || "").split(" ")[0] || "there");

/** Agent: payment received — fill in the intake form. */
export async function sendSiteSetupPaidEmail(email: string, name: string) {
  return sendPlatformEmail(
    "Site setup paid",
    email,
    "Your custom site setup is booked — tell us what you want",
    renderBrandedEmail({
      title: "Your site setup is booked",
      preheader: "Next: a two-minute form so we can start building.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${first(name)}, thanks — your $300 custom site setup is paid.</p>
        <p style="margin:0 0 16px;">Next, fill in a short form: the style you like, the areas you serve, your logo, and a few sites you admire. We start building as soon as it's in, and we'll email you when your site is live.</p>
      `,
      cta: { label: "Fill in the setup form", url: `${baseUrl()}/agent/site-setup` },
    })
  );
}

/** Admin: a setup was paid, or an intake form arrived. */
export async function sendSiteSetupAdminNotification(agentName: string, agentEmail: string, event: "paid" | "intake") {
  const what = event === "paid" ? "paid for a custom site setup" : "submitted their site setup intake form";
  return sendPlatformEmail(
    "Site setup admin notification",
    adminEmail(),
    `Site setup: ${agentName} ${event === "paid" ? "paid" : "sent intake"}`,
    renderBrandedEmail({
      title: event === "paid" ? "New paid site setup" : "Site setup intake received",
      bodyHtml: `<p style="margin:0;">${escapeHtml(agentName)} (${escapeHtml(agentEmail)}) ${what}.</p>`,
      cta: { label: "Open the setup queue", url: `${baseUrl()}/admin/site-setups` },
    })
  );
}

/** Agent: handoff — the site is live. */
export async function sendSiteSetupLiveEmail(email: string, name: string, liveUrl: string) {
  const safeUrl = /^https?:\/\//i.test(liveUrl) ? liveUrl : `https://${liveUrl}`;
  return sendPlatformEmail(
    "Site setup live",
    email,
    "Your new site is live",
    renderBrandedEmail({
      title: "Your site is live",
      preheader: `Your custom site is up at ${liveUrl}.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${first(name)}, your custom site is live:</p>
        <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
          <a href="${escapeHtml(safeUrl)}" style="color:#2563eb;font-size:18px;font-weight:700;text-decoration:none;">${escapeHtml(liveUrl)}</a>
        </div>
        <p style="margin:0 0 16px;">Your listings, blog posts, landing pages and leads all come from your ChatRealty account, so anything you publish there shows up on the site. Want changes? Just reply to this email.</p>
      `,
      cta: { label: "Visit your site", url: safeUrl },
    })
  );
}
