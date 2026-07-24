// End-user auth — SERVER-SIDE ONLY. Proxies the agent's site to ChatRealty's
// platform-hosted magic-link auth (the "auth through ChatRealty" tether). The
// agent provisions nothing: ChatRealty sends the email and issues the session.
//
// GRACEFUL DEGRADATION: in test-data mode, or before the platform ships the
// end-user endpoints (free tier / no provisioned tenant), there's nowhere to
// persist an account — every call returns { available: false } and the UI falls
// back to guest (localStorage) favorites. The same code lights up server sync
// automatically once the capability exists. See docs/chatrealty-api/end-user-auth.md.

import { isTestDataMode } from "./test-data";

const BASE = (process.env.CHATREALTY_API_BASE || "https://www.chatrealty.io").replace(/\/+$/, "");
const TOKEN = process.env.CHATREALTY_API_TOKEN || "";

export const SESSION_COOKIE = "cr_end_user";

export type EndUser = { email: string; name: string | null };

// A platform response that means "accounts aren't available here yet" — no
// token, test-data mode, or the endpoint doesn't exist (404) / isn't enabled
// (501) on this tenant. The caller degrades to guest.
function unavailable() {
  return { available: false as const };
}

function accountsPossible(): boolean {
  return !isTestDataMode() && !!TOKEN;
}

async function platformFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

// Treat a missing/disabled backend as "degrade to guest", any other failure as
// a soft error the UI can show.
function classify(res: Response): "ok" | "unavailable" | "error" {
  if (res.ok) return "ok";
  if (res.status === 404 || res.status === 501) return "unavailable";
  return "error";
}

// POST email → platform mints + emails a magic link. Never reveals whether the
// email exists (no account enumeration).
export async function requestMagicLink(email: string) {
  if (!accountsPossible()) return unavailable();
  try {
    const res = await platformFetch("/api/skill/end-users/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const kind = classify(res);
    if (kind === "unavailable") return unavailable();
    if (kind === "error") return { available: true as const, ok: false as const };
    return { available: true as const, ok: true as const };
  } catch {
    return unavailable();
  }
}

// Consume a magic-link token → platform session token (opaque to us; stored in
// an httpOnly cookie by the route handler).
export async function verifyMagicLink(token: string) {
  if (!accountsPossible()) return unavailable();
  try {
    const res = await platformFetch("/api/skill/end-users/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (classify(res) !== "ok") return unavailable();
    const body = await res.json().catch(() => ({}));
    const session = body?.sessionToken ?? body?.data?.sessionToken;
    if (typeof session !== "string" || !session) return { available: true as const, ok: false as const };
    return { available: true as const, ok: true as const, session };
  } catch {
    return unavailable();
  }
}

// available:false → accounts aren't enabled here at all (test-data / free) →
// guest-only mode. available:true + user:null → accounts work but nobody's
// signed in (show a Sign in button). available:true + user → signed in.
export async function getMe(session: string | undefined) {
  if (!accountsPossible()) return unavailable();
  if (!session) return { available: true as const, user: null };
  try {
    const res = await platformFetch("/api/skill/end-users/me", {
      headers: { "X-End-User-Session": session },
    });
    if (classify(res) === "unavailable") return unavailable();
    if (!res.ok) return { available: true as const, user: null };
    const body = await res.json().catch(() => ({}));
    const u = body?.data ?? body;
    if (!u?.email) return { available: true as const, user: null };
    return { available: true as const, user: { email: u.email, name: u.name ?? null } as EndUser };
  } catch {
    // Network hiccup — accounts exist, treat as signed-out rather than killing
    // the feature entirely.
    return { available: true as const, user: null };
  }
}

export async function getFavorites(session: string | undefined): Promise<string[] | null> {
  if (!accountsPossible() || !session) return null;
  try {
    const res = await platformFetch("/api/skill/end-users/favorites", {
      headers: { "X-End-User-Session": session },
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    const keys = body?.keys ?? body?.data?.keys;
    return Array.isArray(keys) ? keys.filter((k: unknown) => typeof k === "string") : [];
  } catch {
    return null;
  }
}

export async function putFavorites(session: string | undefined, keys: string[]): Promise<boolean> {
  if (!accountsPossible() || !session) return false;
  try {
    const res = await platformFetch("/api/skill/end-users/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-End-User-Session": session },
      body: JSON.stringify({ keys }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
