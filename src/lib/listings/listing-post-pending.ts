// src/lib/listings/listing-post-pending.ts
//
// Carries a gate registration across an OAuth round trip.
//
// "Continue with Google" leaves the site, so whatever the visitor chose on the
// gate — the open-house date, whether they want sold comps, and above all the
// consent they ticked — is gone by the time they come back unless we hold it.
// This mints a short-lived signed cookie before the redirect, and the complete
// route reads it after.
//
// WHY CONSENT IS CAPTURED BEFORE THE REDIRECT, NOT AFTER:
// clicking a Google button is not agreement to be emailed, called or texted by
// a real-estate agent. If we inferred consent from a successful OAuth return we
// would be recording a consent the visitor never gave, on a contact we then
// market to. So the checkbox gates the social buttons exactly as it gates the
// form, and its text, timestamp and IP ride along in here.
//
// Note what OAuth cannot give us: a phone number. Social registrations
// therefore record email consent only (`tcpaConsent: false`) and the agent has
// to ask for a mobile separately. That is the correct outcome, not a gap to
// paper over.

import crypto from "crypto";

export const LP_PENDING_COOKIE = "lp_pending";

/** 15 minutes — long enough for a provider round trip, short enough to be useless later. */
const TTL_MS = 15 * 60 * 1000;

export interface OpenHouseAttendance {
  attendedDate: string;
  feedback: string;
}

export function readOpenHouseAttendance(value: unknown): OpenHouseAttendance | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fields = value as Record<string, unknown>;
  const date = typeof fields.attendedDate === "string" ? fields.attendedDate : "";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date) : null;
  const attendedDate = parsed && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
  const feedback = typeof fields.feedback === "string" ? fields.feedback.trim().slice(0, 250) : "";
  return attendedDate || feedback ? { attendedDate, feedback } : undefined;
}

export function openHouseAttendanceNote(attendance?: OpenHouseAttendance): string {
  if (!attendance) return "";
  const { attendedDate, feedback } = attendance;
  return [
    attendedDate ? `\nOpen house attended: ${attendedDate}` : "",
    feedback ? `\nOpen house feedback: ${feedback}` : "",
  ].join("");
}

export interface PendingRegistration {
  /** Post the visitor was reading. */
  slug: string;
  /** Post author, so the contact lands in the right CRM. */
  agentId: string;
  /** Selected open-house slot, when the post is an open house. */
  openHouseChoice?: string;
  openHouseAttendance?: OpenHouseAttendance;
  wantsComps?: boolean;
  /** Exact consent string shown, stored verbatim on the contact. */
  consentText: string;
  /** IP at the moment the box was ticked. */
  consentIp: string;
  iat: number;
}

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function sign(body: string, key: string): string {
  return crypto.createHmac("sha256", key).update(body).digest("base64url");
}

export function mintPending(p: Omit<PendingRegistration, "iat">): string | null {
  const key = secret();
  if (!key) {
    console.error("[listing-post-pending] NEXTAUTH_SECRET missing — cannot carry registration across OAuth");
    return null;
  }
  const body = Buffer.from(JSON.stringify({ ...p, iat: Date.now() })).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

export function verifyPending(token: string | null | undefined): PendingRegistration | null {
  if (!token) return null;
  const key = secret();
  if (!key) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(sign(body, key));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PendingRegistration;
    if (!parsed?.slug || !parsed?.agentId || typeof parsed.iat !== "number") return null;
    if (Date.now() - parsed.iat > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const pendingCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // "lax" survives the provider's top-level GET redirect back to us, which is
  // the entire point; "strict" would drop the cookie on return and silently
  // lose the consent we just captured.
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(TTL_MS / 1000),
};
