// src/lib/mls-feed.ts
//
// The agent's own MLS replication credentials (BYOD) — validate, store, read.
//
// Storage: User.mlsFeed (top-level, not agentProfile — see the schema comment
// in src/models/User.ts). The secret half is one AES-256-GCM blob
// (src/lib/secrets.ts) holding JSON {bearerToken} or {clientId, clientSecret};
// the non-secret half (base URL, token URL, scope, last4) sits beside it in
// plaintext so the UI can show which feed is connected without decrypting.
//
// The two auth modes and the request shape mirror @chatrealty/sync
// (packages/chatrealty-sync/src/reso-fetch.ts) so a key that passes here also
// works in `npx @chatrealty/sync doctor`:
//   bearer → RESO_BASE_URL + RESO_BEARER_TOKEN       (Spark replication)
//   oauth  → RESO_BASE_URL + RESO_TOKEN_URL + RESO_CLIENT_ID + RESO_CLIENT_SECRET
//            (+ optional RESO_SCOPE)
//
// The plaintext leaves this module only through getMlsFeedCredentials(), which
// is server-only and never wired to an HTTP response.

import dns from "node:dns/promises";
import net from "node:net";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { encryptSecret, decryptSecret } from "@/lib/secrets";

export type MlsFeedAuthMode = "bearer" | "oauth";

export type MlsFeedInput =
  | { authMode: "bearer"; baseUrl: string; bearerToken: string }
  | {
      authMode: "oauth";
      baseUrl: string;
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
    };

export type MlsFeedCredentials = MlsFeedInput;

export type MlsFeedStatus = {
  status: "connected" | "disconnected" | "invalid";
  authMode: MlsFeedAuthMode | null;
  baseUrl: string | null;
  tokenUrl: string | null;
  scope: string | null;
  last4: string | null;
  lastError: string | null;
  addedAt: string | null;
  lastVerifiedAt: string | null;
};

export type MlsFeedReason =
  | "format"
  | "unsafe_url"
  | "invalid"
  | "not_found"
  | "rate_limited"
  | "redirect"
  | "feed_error"
  | "network";

export type MlsFeedTestResult =
  | { ok: true; sampleCount: number }
  | { ok: false; reason: MlsFeedReason; message: string; httpStatus?: number };

const TIMEOUT_MS = 15_000;

// Spark's replication root — what `npx @chatrealty/sync init` writes as the
// commented-out default, and what most of our agents will have.
export const DEFAULT_BASE_URL = "https://replication.sparkapi.com/Reso/OData";

// ---------------------------------------------------------------------------
// Normalisation — people paste these out of an .env file
// ---------------------------------------------------------------------------

/**
 * Strip what comes along when a value is copied out of an .env file or a
 * vendor dashboard: `RESO_BEARER_TOKEN=` prefixes, surrounding quotes, and a
 * leading `Bearer `. A pasted `RESO_BEARER_TOKEN="abc"` would otherwise be
 * sent as the literal token and 401 for a reason nobody could see.
 */
export function cleanPastedValue(raw: unknown): string {
  let v = typeof raw === "string" ? raw.trim() : "";
  v = v.replace(/^export\s+/, "");
  const assign = v.match(/^[A-Z][A-Z0-9_]*\s*=\s*([\s\S]*)$/);
  if (assign) v = assign[1].trim();
  if (v.length >= 2 && /^(["'])[\s\S]*\1$/.test(v)) v = v.slice(1, -1).trim();
  v = v.replace(/^Bearer\s+/i, "");
  return v;
}

/**
 * The OData service root, without a trailing slash or a pasted resource name.
 * Agents copy `…/Reso/OData/Property` from their MLS's docs; the sync appends
 * `/Property` itself, so leaving it on would request `/Property/Property`.
 */
export function normalizeBaseUrl(raw: string): string {
  let v = cleanPastedValue(raw).replace(/\?.*$/, "").replace(/\/+$/, "");
  v = v.replace(/\/(Property|Member|Office|Media|OpenHouse)$/i, "");
  return v;
}

export function normalizeInput(body: any): MlsFeedInput | { error: string } {
  const authMode = body?.authMode === "oauth" ? "oauth" : "bearer";
  const baseUrl = normalizeBaseUrl(body?.baseUrl || "");
  if (!baseUrl) return { error: "Enter your feed's base URL." };

  if (authMode === "bearer") {
    const bearerToken = cleanPastedValue(body?.bearerToken);
    if (bearerToken.length < 8) return { error: "Paste your replication access token." };
    if (/\s/.test(bearerToken)) return { error: "The token has spaces or line breaks in it — paste only the token." };
    return { authMode, baseUrl, bearerToken };
  }

  const tokenUrl = cleanPastedValue(body?.tokenUrl).replace(/\/+$/, "");
  const clientId = cleanPastedValue(body?.clientId);
  const clientSecret = cleanPastedValue(body?.clientSecret);
  const scope = cleanPastedValue(body?.scope) || undefined;
  if (!tokenUrl) return { error: "Enter the token URL your MLS gave you." };
  if (!clientId || !clientSecret) return { error: "Enter both the client ID and the client secret." };
  return { authMode, baseUrl, tokenUrl, clientId, clientSecret, scope };
}

// ---------------------------------------------------------------------------
// URL safety — these URLs come from the agent and the SERVER fetches them
// ---------------------------------------------------------------------------

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast + reserved
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb)/.test(v6); // unique-local + link-local
}

/**
 * Refuse anything but a public https host. Without this, "test my MLS key"
 * is a way to make the server request its own network (localhost, the
 * 169.254.169.254 metadata address, a private 10.x service) and report back
 * whether it answered. DNS is resolved and checked too, so a public-looking
 * name pointing at 127.0.0.1 is refused the same as the literal.
 */
export async function assertSafeFeedUrl(raw: string): Promise<{ ok: true } | { ok: false; message: string }> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, message: `"${raw}" isn't a valid URL.` };
  }
  if (u.protocol !== "https:") return { ok: false, message: "Feed URLs must start with https://" };
  if (u.username || u.password) return { ok: false, message: "Don't put credentials in the URL — use the fields below it." };
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(host)) return { ok: false, message: "Use your MLS's hostname, not an IP address." };
  if (host === "localhost" || /\.(localhost|local|internal|lan|home|test)$/.test(host) || !host.includes(".")) {
    return { ok: false, message: "That host isn't a public MLS address." };
  }
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) {
      return { ok: false, message: "That host isn't a public MLS address." };
    }
  } catch {
    return { ok: false, message: `Couldn't find ${host} — check the URL for typos.` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Live test — one request, same shape the sync makes
// ---------------------------------------------------------------------------

async function fetchNoRedirect(url: string, init: RequestInit): Promise<Response> {
  // redirect: "manual" because a redirect is a second, unchecked URL — the
  // safety check above only vetted the first one.
  return fetch(url, { ...init, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
}

function statusFailure(status: number, stage: "token" | "feed"): MlsFeedTestResult {
  if (status >= 300 && status < 400) {
    return { ok: false, reason: "redirect", httpStatus: status, message: "That URL redirects somewhere else. Use the final address your MLS documents." };
  }
  if (status === 401 || status === 403 || (stage === "token" && status === 400)) {
    return {
      ok: false,
      reason: "invalid",
      httpStatus: status,
      message:
        stage === "token"
          ? "Your MLS's login server rejected the client ID / secret. Nothing was saved."
          : "Your MLS rejected this key (it may be expired, revoked, or for a different feed). Nothing was saved.",
    };
  }
  if (status === 404) {
    return { ok: false, reason: "not_found", httpStatus: status, message: "Nothing found at that URL — check the base URL against your MLS's docs." };
  }
  if (status === 429) {
    // Quotas are per KEY, so an earlier sync run can leave the key throttled.
    // That's not a bad key — but we also can't prove it's a good one, so we
    // don't save it on a 429.
    return {
      ok: false,
      reason: "rate_limited",
      httpStatus: status,
      message: "Your MLS is rate-limiting this key right now, so we couldn't confirm it. Try again in 15–60 minutes. Nothing was saved.",
    };
  }
  return { ok: false, reason: "feed_error", httpStatus: status, message: `Your MLS answered with an error (HTTP ${status}). Nothing was saved.` };
}

export async function testMlsFeed(input: MlsFeedInput): Promise<MlsFeedTestResult> {
  for (const url of input.authMode === "oauth" ? [input.baseUrl, input.tokenUrl] : [input.baseUrl]) {
    const safe = await assertSafeFeedUrl(url);
    // `in`, not `!safe.ok`: tsconfig is strict:false, and without
    // strictNullChecks a boolean-literal discriminant doesn't narrow.
    if ("message" in safe) return { ok: false, reason: "unsafe_url", message: safe.message };
  }

  try {
    let accessToken: string;
    if (input.authMode === "bearer") {
      accessToken = input.bearerToken;
    } else {
      const form = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: input.clientId,
        client_secret: input.clientSecret,
      });
      if (input.scope) form.set("scope", input.scope);
      const tokRes = await fetchNoRedirect(input.tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: form.toString(),
      });
      if (!tokRes.ok) return statusFailure(tokRes.status, "token");
      const tokJson = (await tokRes.json().catch(() => null)) as { access_token?: string } | null;
      if (!tokJson?.access_token) {
        return { ok: false, reason: "feed_error", message: "The login server answered but didn't return an access token." };
      }
      accessToken = tokJson.access_token;
    }

    const res = await fetchNoRedirect(`${input.baseUrl}/Property?$top=1`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return statusFailure(res.status, "feed");
    const json = (await res.json().catch(() => null)) as { value?: unknown[] } | null;
    if (!json || !Array.isArray(json.value)) {
      return { ok: false, reason: "feed_error", message: "That URL answered, but not like a RESO feed. Check the base URL." };
    }
    return { ok: true, sampleCount: json.value.length };
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      ok: false,
      reason: "network",
      message: timedOut ? "Your MLS didn't answer within 15 seconds. Try again shortly." : "Couldn't reach your MLS. Check the URL and try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STATUS_FIELDS =
  "mlsFeed.status mlsFeed.authMode mlsFeed.baseUrl mlsFeed.tokenUrl mlsFeed.scope mlsFeed.last4 mlsFeed.lastError mlsFeed.addedAt mlsFeed.lastVerifiedAt";

function toStatus(f: any): MlsFeedStatus {
  return {
    status: f?.status === "connected" || f?.status === "invalid" ? f.status : "disconnected",
    authMode: f?.authMode ?? null,
    baseUrl: f?.baseUrl ?? null,
    tokenUrl: f?.tokenUrl ?? null,
    scope: f?.scope ?? null,
    last4: f?.last4 ?? null,
    lastError: f?.lastError ?? null,
    addedAt: f?.addedAt ? new Date(f.addedAt).toISOString() : null,
    lastVerifiedAt: f?.lastVerifiedAt ? new Date(f.lastVerifiedAt).toISOString() : null,
  };
}

/** Sanitized status — safe to return to the browser. Never includes the ciphertext. */
export async function getMlsFeedStatus(userId: string): Promise<MlsFeedStatus> {
  await dbConnect();
  const user = await User.findById(userId).select(STATUS_FIELDS).lean();
  return toStatus((user as any)?.mlsFeed);
}

/**
 * Encrypt and store already-validated credentials. Callers run testMlsFeed
 * first — this does not, so a test script can exercise storage without
 * spending a request against a real MLS.
 *
 * $set via updateOne rather than doc.save(): it writes exactly this subtree,
 * never re-saves the (large, unrelated) rest of the user document.
 */
export async function saveMlsFeed(userId: string, input: MlsFeedInput): Promise<MlsFeedStatus> {
  await dbConnect();
  const existing = await User.findById(userId).select("mlsFeed.addedAt").lean();
  const secret =
    input.authMode === "bearer"
      ? { bearerToken: input.bearerToken }
      : { clientId: input.clientId, clientSecret: input.clientSecret };
  const last4 = (input.authMode === "bearer" ? input.bearerToken : input.clientSecret).slice(-4);
  const now = new Date();
  const mlsFeed = {
    authMode: input.authMode,
    baseUrl: input.baseUrl,
    tokenUrl: input.authMode === "oauth" ? input.tokenUrl : undefined,
    scope: input.authMode === "oauth" ? input.scope : undefined,
    credentialsEncrypted: encryptSecret(JSON.stringify(secret)),
    last4,
    status: "connected" as const,
    addedAt: (existing as any)?.mlsFeed?.addedAt || now,
    lastVerifiedAt: now,
  };
  await User.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { mlsFeed } });
  return getMlsFeedStatus(userId);
}

/** Remove the credentials entirely (ciphertext included), not just flag them off. */
export async function clearMlsFeed(userId: string): Promise<void> {
  await dbConnect();
  await User.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $unset: { mlsFeed: 1 } });
}

/**
 * SERVER-ONLY. Decrypt the stored credentials for a job that has to call the
 * agent's MLS (a hosted sync, a re-verify). Never return this from a route.
 */
export async function getMlsFeedCredentials(userId: string): Promise<MlsFeedCredentials | null> {
  await dbConnect();
  const user = await User.findById(userId)
    .select("+mlsFeed.credentialsEncrypted mlsFeed.authMode mlsFeed.baseUrl mlsFeed.tokenUrl mlsFeed.scope")
    .lean();
  const f = (user as any)?.mlsFeed;
  if (!f?.credentialsEncrypted || !f.baseUrl) return null;
  const secret = JSON.parse(decryptSecret(f.credentialsEncrypted));
  if (f.authMode === "oauth") {
    return {
      authMode: "oauth",
      baseUrl: f.baseUrl,
      tokenUrl: f.tokenUrl,
      clientId: secret.clientId,
      clientSecret: secret.clientSecret,
      scope: f.scope || undefined,
    };
  }
  return { authMode: "bearer", baseUrl: f.baseUrl, bearerToken: secret.bearerToken };
}

/** Re-test the STORED credentials and record the outcome. */
export async function verifyStoredMlsFeed(userId: string): Promise<{ result: MlsFeedTestResult; status: MlsFeedStatus }> {
  const creds = await getMlsFeedCredentials(userId);
  if (!creds) {
    return {
      result: { ok: false, reason: "format", message: "No MLS key is saved yet." },
      status: await getMlsFeedStatus(userId),
    };
  }
  const result = await testMlsFeed(creds);
  // A 429 or a timeout says nothing about the key — leave its status alone and
  // only record what happened. An explicit rejection flips it to invalid.
  const reason = "reason" in result ? result.reason : null;
  const conclusive = result.ok || reason === "invalid" || reason === "not_found";
  const $set: Record<string, unknown> = { "mlsFeed.lastError": reason };
  if (conclusive) $set["mlsFeed.status"] = result.ok ? "connected" : "invalid";
  if (result.ok) $set["mlsFeed.lastVerifiedAt"] = new Date();
  await User.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set });
  return { result, status: await getMlsFeedStatus(userId) };
}
