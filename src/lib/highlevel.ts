// src/lib/highlevel.ts
//
// HighLevel (LeadConnector) CRM integration — ONE direction: new ChatRealty
// leads are pushed into the agent's HighLevel sub-account as contacts.
// Nothing is read back from HighLevel into ChatRealty.
//
// Auth is HighLevel's marketplace OAuth (app "ChatRealty", target Sub-Account):
//   connect  → marketplace.gohighlevel.com/oauth/chooselocation
//   callback → services.leadconnectorhq.com/oauth/token (user_type=Location)
// Access tokens live ~24h. REFRESH TOKENS ARE SINGLE-USE: every refresh
// returns a new one and the old one dies, so the new pair must be saved
// before anything else happens, and two concurrent refreshes can't both win
// (see getAccessToken's re-read fallback).
//
// Redirect URLs registered on the app can't contain "highlevel" (HighLevel
// refuses them for white-label reasons) — hence /api/integrations/crm/*.
//
// Env: HIGHLEVEL_CLIENT_ID, HIGHLEVEL_CLIENT_SECRET (+ SECRETS_ENCRYPTION_KEY).

import { after } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { encryptSecret, decryptSecret } from "@/lib/secrets";

const API_BASE = "https://services.leadconnectorhq.com";
// The /v2 picker + version_id is what the app's own "Install link" uses. The
// v1 path without version_id answers "No integration found" for a draft app.
const AUTHORIZE_URL = "https://marketplace.gohighlevel.com/v2/oauth/chooselocation";
// Marketplace app version to install. For an app that has never been
// published this equals the app id (6aeb52580f81425b993aabb7).
const APP_VERSION_ID = process.env.HIGHLEVEL_VERSION_ID || "6aeb52580f81425b993aabb7";
const API_VERSION = "2021-07-28";

/** Must match the scopes ticked on the marketplace app (Advanced → Auth). */
// oauth.* are needed only to turn an AGENCY install into a sub-account token
// (see resolveLocationToken) — the common path when an agency admin installs.
export const HIGHLEVEL_SCOPES = [
  "contacts.readonly",
  "contacts.write",
  "locations.readonly",
  "oauth.readonly",
  "oauth.write",
];

export function highLevelConfigured(): boolean {
  return !!(process.env.HIGHLEVEL_CLIENT_ID && process.env.HIGHLEVEL_CLIENT_SECRET);
}

export function highLevelRedirectUri(): string {
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/api/integrations/crm/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: highLevelRedirectUri(),
    client_id: process.env.HIGHLEVEL_CLIENT_ID || "",
    scope: HIGHLEVEL_SCOPES.join(" "),
    version_id: APP_VERSION_ID,
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  userType?: string;
  locationId?: string;
  companyId?: string;
  userId?: string;
  approvedLocations?: string[];
}

async function tokenRequest(fields: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: process.env.HIGHLEVEL_CLIENT_ID || "",
      client_secret: process.env.HIGHLEVEL_CLIENT_SECRET || "",
      user_type: "Location",
      ...fields,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HighLevel token ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Exchange the OAuth code, look up the location name, and save the connection. */
export async function completeConnection(userId: string, code: string): Promise<{ locationName: string }> {
  let tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: highLevelRedirectUri(),
  });
  if (!tokens.locationId) {
    // Installed from the agency view: HighLevel hands back a COMPANY token
    // (userType "Company", no locationId) even though we asked for Location.
    // A company token can't create contacts, so trade it for the sub-account's.
    tokens = await resolveLocationToken(tokens);
  }
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(`HighLevel token missing fields (keys: ${Object.keys(tokens).join(",")})`);
  }

  let locationName = "";
  try {
    const loc = await hlFetch(tokens.access_token, `/locations/${tokens.locationId}`);
    locationName = loc?.location?.name || "";
  } catch (err) {
    console.warn("[highlevel] location lookup failed (non-fatal):", err);
  }

  await dbConnect();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "highLevel.status": "connected",
        "highLevel.locationId": tokens.locationId,
        "highLevel.locationName": locationName,
        "highLevel.companyId": tokens.companyId || "",
        "highLevel.hlUserId": tokens.userId || "",
        "highLevel.scopes": tokens.scope || HIGHLEVEL_SCOPES.join(" "),
        "highLevel.accessTokenEncrypted": encryptSecret(tokens.access_token),
        "highLevel.refreshTokenEncrypted": encryptSecret(tokens.refresh_token),
        "highLevel.expiresAt": new Date(Date.now() + tokens.expires_in * 1000),
        "highLevel.connectedAt": new Date(),
      },
      $unset: { "highLevel.lastError": "", "highLevel.lastErrorAt": "" },
    }
  );
  return { locationName };
}

/**
 * Company token → location token. The sub-account is the one approved in this
 * install (approvedLocations), else the first sub-account the app is installed
 * on. Found 2026-11-04: installing onto "JPS Realtor" from the agency view
 * returned no locationId at all.
 */
async function resolveLocationToken(company: TokenResponse): Promise<TokenResponse> {
  if (!company.companyId) {
    throw new Error(`HighLevel token had neither locationId nor companyId (keys: ${Object.keys(company).join(",")})`);
  }
  let locationId = company.approvedLocations?.[0];
  if (!locationId) {
    const appId = (process.env.HIGHLEVEL_CLIENT_ID || "").split("-")[0];
    const res = await hlFetch(
      company.access_token,
      `/oauth/installedLocations?${new URLSearchParams({ companyId: company.companyId, appId, isInstalled: "true" })}`
    );
    locationId = res?.locations?.[0]?._id;
  }
  if (!locationId) {
    throw new Error("HighLevel install covers no sub-account. Install the app on a sub-account.");
  }

  const res = await fetch(`${API_BASE}/oauth/locationToken`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${company.access_token}`,
      Version: API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ companyId: company.companyId, locationId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HighLevel locationToken ${res.status}: ${body.slice(0, 200)}`);
  }
  const loc: TokenResponse = await res.json();
  return { ...loc, locationId: loc.locationId || locationId, companyId: company.companyId, userId: company.userId };
}

const TOKEN_FIELDS =
  "+highLevel.accessTokenEncrypted +highLevel.refreshTokenEncrypted highLevel.status highLevel.locationId highLevel.expiresAt";

/** A valid access token for this agent, refreshing (and saving the rotated pair) when needed. */
export async function getAccessToken(userId: string): Promise<{ token: string; locationId: string } | null> {
  await dbConnect();
  const user: any = await User.findById(userId).select(TOKEN_FIELDS).lean();
  const hl = user?.highLevel;
  if (!hl || hl.status !== "connected" || !hl.locationId || !hl.refreshTokenEncrypted) return null;

  // 5-minute buffer so a token doesn't expire mid-request.
  if (hl.accessTokenEncrypted && hl.expiresAt && new Date(hl.expiresAt).getTime() > Date.now() + 5 * 60_000) {
    return { token: decryptSecret(hl.accessTokenEncrypted), locationId: hl.locationId };
  }

  try {
    const tokens = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: decryptSecret(hl.refreshTokenEncrypted),
    });
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          "highLevel.accessTokenEncrypted": encryptSecret(tokens.access_token),
          "highLevel.refreshTokenEncrypted": encryptSecret(tokens.refresh_token),
          "highLevel.expiresAt": new Date(Date.now() + tokens.expires_in * 1000),
        },
      }
    );
    return { token: tokens.access_token, locationId: hl.locationId };
  } catch (err) {
    // Another request may have refreshed first and burned our refresh token.
    // If the stored pair is now fresh, use it rather than declaring it broken.
    const again: any = await User.findById(userId).select(TOKEN_FIELDS).lean();
    const h2 = again?.highLevel;
    if (h2?.accessTokenEncrypted && h2.expiresAt && new Date(h2.expiresAt).getTime() > Date.now() + 60_000) {
      return { token: decryptSecret(h2.accessTokenEncrypted), locationId: h2.locationId };
    }
    throw err;
  }
}

export async function hlFetch(token: string, path: string, init: RequestInit = {}): Promise<any> {
  let res: Response;
  // HighLevel's burst limit is ~100 requests / 10s per app per sub-account.
  // A 429 waits out Retry-After (or 10s) and tries again, up to 3 times.
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Version: API_VERSION,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    if (res.status !== 429 || attempt >= 3) break;
    const wait = Number(res.headers.get("retry-after")) || 10;
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HighLevel ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export interface HighLevelLead {
  agentId: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Shown as the contact's Source in HighLevel, e.g. "ChatRealty – Buyer intake". */
  source?: string;
  /** Always gets "chatrealty" added. */
  tags?: string[];
}

/**
 * Upsert one lead into the agent's HighLevel. No-op when the agent hasn't
 * connected. NEVER throws — lead intake must not fail because a CRM is down.
 */
export async function pushLeadToHighLevel(lead: HighLevelLead): Promise<void> {
  if (!lead.agentId || (!lead.email && !lead.phone) || !highLevelConfigured()) return;
  try {
    const auth = await getAccessToken(lead.agentId);
    if (!auth) return;

    let firstName = (lead.firstName || "").trim();
    let lastName = (lead.lastName || "").trim();
    if (!firstName && lead.name) {
      const parts = lead.name.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }

    // /contacts/upsert dedupes on email/phone per the location's duplicate settings.
    await hlFetch(auth.token, "/contacts/upsert", {
      method: "POST",
      body: JSON.stringify({
        locationId: auth.locationId,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(lead.email ? { email: lead.email.trim().toLowerCase() } : {}),
        ...(lead.phone ? { phone: lead.phone } : {}),
        source: lead.source || "ChatRealty",
        tags: Array.from(new Set(["chatrealty", ...(lead.tags || [])])),
      }),
    });

    await User.updateOne(
      { _id: lead.agentId },
      {
        $set: { "highLevel.lastPushAt": new Date() },
        $inc: { "highLevel.pushedCount": 1 },
        $unset: { "highLevel.lastError": "", "highLevel.lastErrorAt": "" },
      }
    );
  } catch (err: any) {
    const message = String(err?.message || err).slice(0, 300);
    console.error("[highlevel] lead push failed (non-blocking):", message);
    try {
      // A dead refresh token (app uninstalled, access revoked) means the agent
      // has to reconnect — say so on the card instead of failing silently forever.
      const revoked = /token 4\d\d/.test(message);
      await User.updateOne(
        { _id: lead.agentId },
        {
          $set: {
            "highLevel.lastError": message,
            "highLevel.lastErrorAt": new Date(),
            ...(revoked ? { "highLevel.status": "error" } : {}),
          },
        }
      );
    } catch {
      /* ignore */
    }
  }
}

/**
 * Schedule a push to run after the response is sent (Next `after()`), so a
 * slow HighLevel API never delays a visitor's form submit. Falls back to a
 * detached promise outside a request scope.
 */
export function queueHighLevelPush(lead: HighLevelLead): void {
  const run = () => pushLeadToHighLevel(lead);
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Sanitized status for the settings card — never includes tokens. */
export async function getHighLevelStatus(userId: string) {
  await dbConnect();
  const user: any = await User.findById(userId)
    .select(
      "highLevel.status highLevel.locationId highLevel.locationName highLevel.connectedAt highLevel.lastPushAt highLevel.pushedCount highLevel.lastError highLevel.lastErrorAt highLevel.sync"
    )
    .lean();
  const hl = user?.highLevel || {};
  const s = hl.sync || {};
  return {
    configured: highLevelConfigured(),
    status: (hl.status || "disconnected") as "connected" | "disconnected" | "error",
    locationId: hl.locationId || null,
    locationName: hl.locationName || null,
    connectedAt: hl.connectedAt || null,
    lastPushAt: hl.lastPushAt || null,
    pushedCount: hl.pushedCount || 0,
    lastError: hl.lastError || null,
    // Contact feed (src/lib/highlevel-sync.ts). Never includes the cursor.
    sync: {
      status: (s.status || null) as "queued" | "running" | "idle" | "error" | null,
      synced: s.synced || 0,
      skipped: s.skipped || 0,
      failed: s.failed || 0,
      backfillTotal: s.backfillTotal || 0,
      backfillDoneAt: s.backfillDoneAt || null,
      lastRunAt: s.lastRunAt || null,
      lastError: s.lastError || null,
    },
  };
}

export async function disconnectHighLevel(userId: string): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { _id: userId },
    {
      $set: { "highLevel.status": "disconnected" },
      $unset: {
        "highLevel.accessTokenEncrypted": "",
        "highLevel.refreshTokenEncrypted": "",
        "highLevel.expiresAt": "",
        "highLevel.lastError": "",
        "highLevel.lastErrorAt": "",
      },
    }
  );
}
