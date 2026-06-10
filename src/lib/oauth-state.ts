// src/lib/oauth-state.ts
//
// Signed, reversible OAuth `state` for the agent-side ad-account connect flows
// (Google Ads, Meta). The OAuth callback always lands on the CANONICAL domain
// (NEXTAUTH_URL), but an agent who started the connect from their own branded
// domain has NO session cookie there (cookies are domain-scoped). So we cannot
// identify the user from a session at the callback.
//
// Instead we embed the user id in an HMAC-signed `state` at connect time and
// verify it at the callback. The signature (keyed by NEXTAUTH_SECRET) prevents
// forgery — without the secret an attacker cannot mint a state for another
// user's id — and a short TTL limits replay. This doubles as CSRF protection.

import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStatePayload {
  userId: string;
  purpose: string;   // e.g. 'google-ads-connect' | 'meta-ads-connect'
  origin?: string;   // server-derived origin the agent started on (for the final redirect)
}

interface SignedBody extends OAuthStatePayload {
  iat: number;
}

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
}

/** Mint a signed state string: `<base64url(json)>.<hmac>`. */
export function createOAuthState(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() } satisfies SignedBody)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verify signature + purpose + TTL. Returns the payload, or null if invalid. */
export function verifyOAuthState(state: string | null | undefined, expectedPurpose: string): OAuthStatePayload | null {
  if (!state || !state.includes('.')) return null;
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;

  // Constant-time signature comparison.
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let parsed: SignedBody;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!parsed?.userId || parsed.purpose !== expectedPurpose) return null;
  if (typeof parsed.iat !== 'number' || Date.now() - parsed.iat > TTL_MS) return null;

  return { userId: parsed.userId, purpose: parsed.purpose, origin: parsed.origin };
}

/**
 * Build the final redirect URL. Honors the server-derived `origin` (so the
 * agent lands back on the domain where they're logged in) but only ever appends
 * a fixed path + status query — never any secret. Falls back to the canonical
 * base if origin is missing/invalid.
 *
 * NOTE: `origin` is derived server-side from the connect request's own URL (not
 * a user-supplied query param) and is signed into the state, so it can't be
 * tampered with after issuance. Worth a security re-review if connect ever
 * starts trusting a Host/forwarded header for the origin.
 */
export function safeRedirectUrl(origin: string | undefined, pathAndQuery: string, fallbackBase: string): URL {
  try {
    if (origin) {
      const o = new URL(origin);
      if (o.protocol === 'https:' || o.protocol === 'http:') {
        return new URL(pathAndQuery, o.origin);
      }
    }
  } catch {
    // fall through to canonical
  }
  return new URL(pathAndQuery, fallbackBase);
}
