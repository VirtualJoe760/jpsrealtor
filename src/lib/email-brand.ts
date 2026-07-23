// src/lib/email-brand.ts
// ChatRealty branded transactional-email wrapper.
//
// Dependency-free string templates for PLATFORM emails (agent signup flow,
// approvals, rejections, etc.). Table-based layout with inline styles for
// email-client safety. Agent-branded CRM sends keep their own templates in
// email-resend.ts — this wrapper is for mail the PLATFORM sends as itself.
//
// Brand: white card on #f8fafc, ChatRealty logo header, #2563eb CTA,
// #1e40af headings, #334155 body text. See docs/agent-onboarding/README.md.

const LOGO_URL =
  "https://www.chatrealty.io/images/brand/chatrealty-logo-light-1436x356.png";
const FONT_STACK = "-apple-system, 'Segoe UI', Roboto, sans-serif";

/** From line for platform transactional emails (no agent branding). */
export function platformFrom(): string {
  const domain = process.env.EMAIL_FROM_DOMAIN || "chatrealty.io";
  return `ChatRealty <noreply@${domain}>`;
}

/** Minimal HTML escaping for user-supplied values interpolated into emails. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface BrandedEmailCta {
  label: string;
  url: string;
}

export interface BrandedEmailOptions {
  /** Headline shown inside the card. */
  title: string;
  /** Hidden inbox-preview text (not rendered in the body). */
  preheader?: string;
  /** Inner HTML: paragraphs, lists, callouts. Escape user input first. */
  bodyHtml: string;
  /** Optional primary button below the body. */
  cta?: BrandedEmailCta;
}

/**
 * Wrap content in the standard ChatRealty email shell: logo header, white
 * card on #f8fafc, optional #2563eb CTA button, reply-to-us footer.
 */
export function renderBrandedEmail({
  title,
  preheader,
  bodyHtml,
  cta,
}: BrandedEmailOptions): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:40px 16px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
          <tr>
            <td align="center" style="padding:32px 32px 8px;">
              <img src="${LOGO_URL}" alt="ChatRealty" width="150" height="37" style="display:block;width:150px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;font-family:${FONT_STACK};">
              <h1 style="margin:0;color:#1e40af;font-size:22px;line-height:1.3;font-weight:700;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 12px;font-family:${FONT_STACK};color:#334155;font-size:15px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
          ${
            cta
              ? `<tr>
            <td align="center" style="padding:8px 32px 32px;">
              <a href="${cta.url}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-family:${FONT_STACK};font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">${escapeHtml(cta.label)}</a>
            </td>
          </tr>`
              : `<tr>
            <td style="padding:0 32px 20px;"></td>
          </tr>`
          }
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 16px 40px;font-family:${FONT_STACK};color:#64748b;font-size:12px;line-height:1.6;">
        &copy; ChatRealty &middot; Questions? Just reply to this email.
      </td>
    </tr>
  </table>
</body>
</html>`;
}
