// src/lib/email-agent-application.ts
// Emails for the agent product-signup flow (see docs/agent-onboarding/README.md).
//
// Live flow: submit -> inquiry_pending -> admin approves (final_approved,
// sendAgentApprovalEmail in email-resend.ts) or rejects (final_rejected,
// sendAgentRejectionEmail below).
//
// 2026-07-23 product-signup pivot: rewritten on the email-brand.ts wrapper.
// The dead phase cases (phase1_approved / phase1_rejected / final_approved /
// final_rejected) were never invoked by any caller and have been removed —
// this file exports exactly what the live flow uses.

import { Resend } from "resend";
import {
  renderBrandedEmail,
  platformFrom,
  escapeHtml,
} from "@/lib/email-brand";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not defined");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "josephsardella@gmail.com";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://chatrealty.io"
  );
}

export interface SendAgentApplicationEmailParams {
  applicantName: string;
  applicantEmail: string;
  applicationId: string;
  /** Submitted license details, echoed into the admin notification. */
  details?: {
    licenseNumber?: string;
    licenseState?: string;
    mlsAssociation?: string;
    mlsId?: string;
    brokerageName?: string;
  };
}

/**
 * Fires on submission: (1) notifies the admin reviewer, (2) confirms receipt
 * to the applicant. Both send from the platform (ChatRealty) address.
 */
export async function sendAgentApplicationEmail(
  params: SendAgentApplicationEmailParams
) {
  const resend = getResend();
  const { applicantName, applicantEmail, applicationId, details } = params;
  const name = escapeHtml(applicantName);
  const firstName = escapeHtml(applicantName.split(" ")[0] || "there");

  // 1) Admin notification — review happens at /admin/applications/agents
  const detailRows: Array<[string, string]> = [
    ["Applicant", name],
    ["Email", escapeHtml(applicantEmail)],
    [
      "License",
      details?.licenseNumber
        ? `${escapeHtml(details.licenseNumber)} (${escapeHtml(details.licenseState || "state n/a")})`
        : "—",
    ],
    [
      "MLS",
      details?.mlsAssociation
        ? `${escapeHtml(details.mlsAssociation)}${details.mlsId ? ` — agent ID ${escapeHtml(details.mlsId)}` : ""}`
        : "—",
    ],
    ["Brokerage", details?.brokerageName ? escapeHtml(details.brokerageName) : "—"],
    ["Application ID", escapeHtml(applicationId)],
  ];

  await resend.emails.send({
    from: platformFrom(),
    to: [ADMIN_EMAIL],
    replyTo: applicantEmail,
    subject: `New agent signup — ${applicantName}`,
    html: renderBrandedEmail({
      title: "New agent signup to review",
      preheader: `${applicantName} submitted their license for verification.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">A new agent submitted their license details and is waiting on manual review.</p>
        <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin:0 0 8px;">
          ${detailRows
            .map(
              ([label, value]) =>
                `<p style="margin:0 0 6px;font-size:14px;"><strong style="color:#1e40af;">${label}:</strong> ${value}</p>`
            )
            .join("\n          ")}
        </div>
      `,
      cta: {
        label: "Review application",
        url: `${baseUrl()}/admin/applications/agents`,
      },
    }),
  });

  // 2) Applicant confirmation
  await resend.emails.send({
    from: platformFrom(),
    to: [applicantEmail],
    replyTo: ADMIN_EMAIL,
    subject: "We got your application — ChatRealty",
    html: renderBrandedEmail({
      title: "Your application is in",
      preheader:
        "We're verifying your license now — you'll hear from us shortly.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;">Thanks for signing up for ChatRealty. We've received your license details and your agent account is now in review.</p>
        <p style="margin:0 0 8px;font-weight:600;">What happens next:</p>
        <ul style="margin:0 0 16px;padding-left:20px;line-height:1.9;">
          <li>We verify your license and MLS details by hand</li>
          <li>You get an approval email with your personal ChatRealty subdomain</li>
          <li>You set up your site, branding, and CRM in minutes</li>
        </ul>
        <p style="margin:0;">Reviews usually wrap up within 2&ndash;3 business days — often sooner. No action needed from you right now.</p>
      `,
    }),
  });
}

export interface SendAgentRejectionEmailParams {
  applicantName: string;
  applicantEmail: string;
  /** Admin-entered reason, included verbatim (HTML-escaped). */
  reason?: string;
}

/**
 * Sent when an admin rejects an application from /admin/applications/agents.
 * Kind and brief; includes the admin's reason verbatim and invites a reply
 * (replyTo is the admin inbox).
 */
export async function sendAgentRejectionEmail(
  params: SendAgentRejectionEmailParams
) {
  const resend = getResend();
  const { applicantName, applicantEmail, reason } = params;
  const firstName = escapeHtml(applicantName.split(" ")[0] || "there");
  const reasonHtml = reason
    ? escapeHtml(reason).replace(/\n/g, "<br>")
    : "";

  await resend.emails.send({
    from: platformFrom(),
    to: [applicantEmail],
    replyTo: ADMIN_EMAIL,
    subject: "An update on your ChatRealty application",
    html: renderBrandedEmail({
      title: "About your application",
      preheader: "An update on your ChatRealty agent account request.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;">Thanks for your interest in ChatRealty. After reviewing your application, we weren't able to approve your agent account this time.</p>
        ${
          reasonHtml
            ? `<div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin:0 0 16px;">
          <p style="margin:0 0 6px;color:#1e40af;font-size:13px;font-weight:600;">REVIEWER NOTE</p>
          <p style="margin:0;font-size:14px;">${reasonHtml}</p>
        </div>`
            : ""
        }
        <p style="margin:0;">If anything looks off — a typo in your license number, an MLS mix-up — just reply to this email and we'll take another look.</p>
      `,
    }),
  });
}
