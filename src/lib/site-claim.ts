// src/lib/site-claim.ts
//
// Claim codes: how a website Claude builds gets its own ChatRealty key without
// the agent — or the conversation — ever handling it (decision 2026-10-17).
//
//   1. The MCP tool `get_site_claim_code` (token-authed, site:manage) asks for
//      a code. The platform stores only its sha256, for 15 minutes, one use.
//   2. A script in the site's folder trades the code for a key
//      (POST /api/skill/site/claim) and writes it straight into .env.local.
//      Claude only ever sees the code.
//   3. The key is a WEBSITE key (website preset scopes), already bound to the
//      agent's seeded database — so the site reads their own listings from its
//      first request, no `sync init`, no sample data.
//
// Only agents with an ACTIVE tenant get codes: the whole point is building on
// a database they already seeded in Settings → Integrations.

import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import SiteClaim from "@/models/SiteClaim";
import TenantModel from "@/models/control/Tenant";
import { generateApiToken, hashToken } from "@/lib/secrets";
import { PRESETS } from "@/lib/skill-scopes";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_TOKENS_PER_USER = 10; // mirrors /api/integrations/api-tokens
// Crockford-style alphabet: no 0/O/1/I/L to misread when a code is spoken or
// retyped. 12 characters ≈ 60 bits — with a 15-minute life, one use, and a
// per-IP rate limit on redemption, unguessable in practice.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function newCode(): string {
  const bytes = crypto.randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const normalize = (code: string) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function createSiteClaim(
  userId: string
): Promise<{ ok: true; code: string; expiresAt: string; tenantId: string } | { ok: false; reason: "no_database"; message: string }> {
  await dbConnect();
  const tenant: any = await TenantModel.findOne({ ownerUserId: userId, status: "active" }).select("tenantId").lean();
  if (!tenant) {
    return {
      ok: false,
      reason: "no_database",
      message:
        "This account doesn't have a seeded listings database yet. Seed it first: ChatRealty Settings → Integrations → MLS Data Feed → Start seeding.",
    };
  }
  const code = newCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await SiteClaim.create({ codeHash: hashToken(normalize(code)), userId, tenantId: tenant.tenantId, expiresAt });
  return { ok: true, code, expiresAt: expiresAt.toISOString(), tenantId: tenant.tenantId };
}

export type RedeemResult =
  | { ok: true; token: string; tenantId: string; listings: number | null; associations: string[] }
  | { ok: false; status: number; reason: string; message: string };

export async function redeemSiteClaim(code: string): Promise<RedeemResult> {
  const norm = normalize(code);
  if (norm.length !== 12) return { ok: false, status: 400, reason: "malformed", message: "That isn't a ChatRealty claim code." };
  await dbConnect();
  const codeHash = hashToken(norm);

  // Check the owner can take one more key BEFORE spending the code, so a full
  // token list doesn't burn a valid code.
  const pending: any = await SiteClaim.findOne({ codeHash, usedAt: null, expiresAt: { $gt: new Date() } }).lean();
  if (!pending) {
    return { ok: false, status: 410, reason: "invalid_or_used", message: "This claim code is expired, already used, or wrong. Ask Claude for a new one." };
  }
  const owner: any = await User.findById(pending.userId).select("agentProfile.aiIntegrations.apiTokens mlsFeed.networks mlsFeed.sync.dbRows").lean();
  const active = (owner?.agentProfile?.aiIntegrations?.apiTokens || []).filter((t: any) => !t.revokedAt).length;
  if (!owner) return { ok: false, status: 410, reason: "invalid_or_used", message: "This claim code no longer matches an account." };
  if (active >= MAX_TOKENS_PER_USER) {
    return {
      ok: false,
      status: 409,
      reason: "token_limit",
      message: `This account already has ${MAX_TOKENS_PER_USER} active keys. Revoke one in Settings → Integrations, then ask Claude for a new code.`,
    };
  }

  // Spend the code atomically: two racing redemptions can't both win.
  const claimed: any = await SiteClaim.findOneAndUpdate(
    { codeHash, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();
  if (!claimed) {
    return { ok: false, status: 410, reason: "invalid_or_used", message: "This claim code was just used. Ask Claude for a new one." };
  }

  const { plaintext, hash, last4 } = generateApiToken();
  const scopes = [...PRESETS.website.scopes];
  const name = `Website (claimed ${new Date().toISOString().slice(0, 10)})`;
  await User.updateOne(
    { _id: new mongoose.Types.ObjectId(claimed.userId) },
    { $push: { "agentProfile.aiIntegrations.apiTokens": { tokenHash: hash, last4, name, scopes, createdAt: new Date() } } }
  );
  // Bound to the agent's database at birth — the site reads their listings on
  // its first request.
  await TenantModel.updateOne(
    { tenantId: claimed.tenantId, tokenHashes: { $ne: hash } },
    {
      $push: { tenant_tokens: { tokenHash: hash, last4, name, scopes, createdAt: new Date() } },
      $addToSet: { tokenHashes: hash },
    }
  );
  return {
    ok: true,
    token: plaintext,
    tenantId: claimed.tenantId,
    listings: owner.mlsFeed?.sync?.dbRows ?? null,
    associations: owner.mlsFeed?.networks ?? [],
  };
}
