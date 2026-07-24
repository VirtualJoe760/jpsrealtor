// End-user auth primitives — magic-link tokens, session JWTs, favorites schema,
// and the sign-in email. All storage is in the TENANT DB (via the injected
// adapter), so end-user accounts + favorites are per-tenant and never shared.
// See docs/chatrealty-api/end-user-auth.md.

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import type { DbAdapter } from "@/lib/db/adapter";

const SESSION_TTL_DAYS = 30;
const MAGIC_LINK_TTL_MINUTES = 20;

// A dedicated secret is preferred; fall back to NEXTAUTH_SECRET so the feature
// works without new env in existing deployments. End-user sessions are a
// separate audience from the agent's NextAuth session (different sign key not
// required — the tenant binding below is what isolates them).
function sessionSecret(): string {
  const s = process.env.END_USER_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("END_USER_SESSION_SECRET (or NEXTAUTH_SECRET) is not set");
  return s;
}

// ---------------------------------------------------------------------------
// Schema (idempotent) — magic-link + favorites tables sit alongside `end_user`
// in the tenant DB. CREATE IF NOT EXISTS so existing tenants pick them up on
// first sign-in and new tenants get them too. No-ops after first creation.
// ---------------------------------------------------------------------------
export async function ensureEndUserAuthSchema(adapter: DbAdapter): Promise<void> {
  await adapter.query(
    `CREATE TABLE IF NOT EXISTS end_user_magic_link (
       token_hash   text PRIMARY KEY,
       end_user_id  uuid NOT NULL REFERENCES end_user(id) ON DELETE CASCADE,
       email        text,
       expires_at   timestamptz NOT NULL,
       consumed_at  timestamptz
     )`
  );
  await adapter.query(
    `CREATE TABLE IF NOT EXISTS end_user_favorite (
       end_user_id  uuid NOT NULL REFERENCES end_user(id) ON DELETE CASCADE,
       listing_key  text NOT NULL,
       saved_at     timestamptz NOT NULL DEFAULT now(),
       PRIMARY KEY (end_user_id, listing_key)
     )`
  );
  await adapter.query(
    `CREATE INDEX IF NOT EXISTS end_user_magic_link_euid_idx ON end_user_magic_link(end_user_id)`
  );
}

// ---------------------------------------------------------------------------
// Magic-link tokens — the raw token goes in the email; only its SHA-256 hash is
// stored, so a DB read never reveals a usable link.
// ---------------------------------------------------------------------------
export function newMagicToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const MAGIC_LINK_TTL_SQL = `now() + interval '${MAGIC_LINK_TTL_MINUTES} minutes'`;

// ---------------------------------------------------------------------------
// Sessions — a JWT bound to { tenantId, endUserId }. verifySession requires the
// caller's tenantId to match, so a session minted for tenant A can never be
// replayed against tenant B (even with B's site token).
// ---------------------------------------------------------------------------
export function issueSession(p: { tenantId: string; endUserId: string; email: string | null }): string {
  return jwt.sign({ t: p.tenantId, u: p.endUserId, e: p.email }, sessionSecret(), {
    expiresIn: `${SESSION_TTL_DAYS}d`,
  });
}

export function verifySession(
  token: string | undefined | null,
  tenantId: string
): { endUserId: string; email: string | null } | null {
  if (!token) return null;
  try {
    const d = jwt.verify(token, sessionSecret()) as { t?: string; u?: string; e?: string | null };
    if (!d.u || d.t !== tenantId) return null;
    return { endUserId: d.u, email: d.e ?? null };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The sign-in email — sent from the platform's Resend, branded to the agent's
// site name. The link points back to the agent's own site (origin passed by
// the caller and validated there).
// ---------------------------------------------------------------------------
export async function sendMagicLinkEmail(opts: { to: string; url: string; siteName: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(apiKey);
  // Multi-tenant: end-user sign-in emails go out under the PLATFORM domain, not
  // EMAIL_FROM_DOMAIN (which may be jpsrealtor.com on this deployment). Every
  // agent's site sends from the same verified platform sender, with the agent's
  // site name as the display name. Override with END_USER_EMAIL_DOMAIN if needed.
  const domain = process.env.END_USER_EMAIL_DOMAIN || "chatrealty.io";
  const safeName = opts.siteName.replace(/[<>\r\n]/g, "").slice(0, 80) || "Your account";

  await resend.emails.send({
    from: `${safeName} <noreply@${domain}>`,
    to: opts.to,
    subject: `Sign in to ${safeName}`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
        <tr><td align="center">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;">
            <tr><td style="font-size:18px;font-weight:700;color:#111;">${safeName}</td></tr>
            <tr><td style="padding-top:8px;font-size:14px;color:#555;line-height:1.5;">
              Tap the button below to sign in and save your favorite homes. This link expires in ${MAGIC_LINK_TTL_MINUTES} minutes and can be used once.
            </td></tr>
            <tr><td style="padding:24px 0;">
              <a href="${opts.url}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">Sign in</a>
            </td></tr>
            <tr><td style="font-size:12px;color:#999;line-height:1.5;">
              If you didn't request this, you can ignore this email.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`,
  });
}
