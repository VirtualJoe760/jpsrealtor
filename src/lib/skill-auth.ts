// src/lib/skill-auth.ts
//
// Bearer-token auth for /api/skill/* routes (called by the Claude Code /
// Claude Desktop skill). NOT a NextAuth session — these routes are reachable
// from outside a browser, so they auth via a token the agent provisioned in
// Settings → Integrations.
//
// Contract:
//   Authorization: Bearer crt_live_<32-byte base64url>
//
// We sha256 the incoming token and look for a matching, non-revoked entry on
// any User. On hit, we bump lastUsedAt and return the User document.

import { NextResponse, type NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { hashToken } from "@/lib/secrets";
import { checkRateLimit } from "@/lib/rate-limit";
import { LEGACY_DEFAULT_SCOPES, type Scope } from "@/lib/skill-scopes";
import { resolveTenantByTokenHash } from "@/lib/tenant/resolve-tenant";

export type SkillAuthSuccess = {
  ok: true;
  user: any; // mongoose user doc — full doc, caller decides what to read
  tokenName: string;
  tokenLast4: string;
  /**
   * Effective scopes for this request. Pulled from the token's stored scopes
   * array; if it's empty (legacy token minted before scopes existed), falls
   * back to LEGACY_DEFAULT_SCOPES so existing skill installs don't break.
   */
  scopes: Scope[];
  /** True if scopes were filled from the legacy fallback rather than the token. */
  isLegacyScopes: boolean;

  // ---------------------------------------------------------------------------
  // Tenant binding (Agent 11 — ADDITIVE, build_plan §6.6 / §3.3).
  // ---------------------------------------------------------------------------
  //
  // OPTIONAL by design. After the token authenticates, we best-effort resolve
  // the per-tenant Neon DB the token is bound to (control-plane lookup by token
  // hash). When the token maps to an ACTIVE tenant, `tenantId` is its stable id
  // and `getSql()` lazily opens that tenant's pooled SQL handle (the keystone's
  // LRU-cached connection — identity-only routes like `whoami` never call it,
  // so they never trigger a Neon wake).
  //
  // LEGACY / UNMAPPED tokens leave BOTH `undefined`: callers fall back to
  // DEFAULT_TENANT (the keystone's Mongo dogfood path). The tenant lookup is
  // best-effort — a control-DB hiccup leaves these undefined but never fails
  // auth (see authenticateSkillRequest).

  /**
   * Where this token's DATA comes from — ChatRealty is PURELY BYOD (ship-
   * strategy, corrected 2026-07-23):
   *   "tenant"  → bound to the caller's own tenant DB (their own MLS feed).
   *   "dogfood" → the platform owner's internal dataset. ADMIN ACCOUNTS ONLY —
   *               the owner's MLS license does not permit serving this data to
   *               anyone else.
   *   "none"    → no data source connected yet. Data reads and tenant writes
   *               MUST refuse (403 no_data_source) rather than fall back to
   *               dogfood — falling back is a data-license violation and a
   *               cross-tenant leak (an unbound token's leads would land in
   *               the shared default tenant).
   */
  dataSource: "tenant" | "dogfood" | "none";
  /**
   * Stable id of the tenant this token is bound to, or `undefined` for legacy /
   * unmapped tokens (callers fall back to DEFAULT_TENANT).
   */
  tenantId?: string;
  /**
   * Lazily resolve this tenant's pooled SQL handle via the keystone resolver.
   * Present ONLY when `tenantId` is set. Calling it is what opens the Neon
   * connection, so identity-only paths can skip it and avoid a cold-start wake.
   */
  getSql?: () => Promise<import("@/lib/tenant/resolve-connection").TenantSql>;
};

export type SkillAuthFailure = {
  ok: false;
  status: 401 | 403;
  reason: string;
};

export type SkillAuthResult = SkillAuthSuccess | SkillAuthFailure;

export async function authenticateSkillRequest(req: NextRequest): Promise<SkillAuthResult> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(crt_live_[A-Za-z0-9_-]+)$/);
  if (!match) {
    return { ok: false, status: 401, reason: "missing_or_malformed_token" };
  }
  const token = match[1];
  const hash = hashToken(token);

  await dbConnect();
  // Index hint: agentProfile.aiIntegrations.apiTokens.tokenHash. If the
  // collection grows large, add an index on this dotted path.
  const user = await User.findOne({
    "agentProfile.aiIntegrations.apiTokens.tokenHash": hash,
  });
  if (!user) {
    return { ok: false, status: 401, reason: "token_not_found" };
  }
  const entry = (user.agentProfile as any)?.aiIntegrations?.apiTokens?.find(
    (t: any) => t.tokenHash === hash
  );
  if (!entry) {
    return { ok: false, status: 401, reason: "token_not_found" };
  }
  if (entry.revokedAt) {
    return { ok: false, status: 403, reason: "token_revoked" };
  }

  // Touch lastUsedAt — fire and forget, don't block the response on it.
  entry.lastUsedAt = new Date();
  user.markModified("agentProfile.aiIntegrations.apiTokens");
  user.save().catch(() => {
    // Best-effort — don't fail the request on a save error here.
  });

  // Resolve effective scopes. Empty/missing → legacy fallback so tokens
  // minted before scopes shipped keep working in their original capacity.
  const storedScopes: string[] = Array.isArray(entry.scopes) ? entry.scopes : [];
  const isLegacyScopes = storedScopes.length === 0;
  const scopes = (isLegacyScopes ? LEGACY_DEFAULT_SCOPES : (storedScopes as Scope[]));

  // Best-effort tenant binding (ADDITIVE — never blocks or fails auth). See
  // `buildTenantBinding` for the resolve-and-attach logic + its test seam.
  const tenantBinding = await buildTenantBinding(hash);

  // BYOD data-source resolution (2026-07-23): tenant-bound tokens use their
  // own DB; the dogfood dataset is reserved for admin (platform owner)
  // accounts; everyone else has NO data source until their tenant is
  // provisioned. See the SkillAuthSuccess.dataSource doc comment.
  const dataSource: SkillAuthSuccess["dataSource"] = tenantBinding.tenantId
    ? "tenant"
    : user.isAdmin
      ? "dogfood"
      : "none";

  return {
    ok: true,
    user,
    tokenName: entry.name,
    tokenLast4: entry.last4,
    scopes,
    isLegacyScopes,
    dataSource,
    // Spread is empty for legacy/unmapped tokens, so `tenantId`/`getSql` stay
    // absent and callers fall back to DEFAULT_TENANT.
    ...tenantBinding,
  };
}

// ---------------------------------------------------------------------------
// Tenant binding (Agent 11 — ADDITIVE seam)
// ---------------------------------------------------------------------------
//
// The optional `{ tenantId, getSql }` slice of a successful auth. Factored out
// of `authenticateSkillRequest` so the best-effort resolve-and-attach logic is
// unit-testable WITHOUT mocking the whole Mongo/User import graph: the test
// injects a fake `resolveTenant` + `loadTenantSql` and asserts the three
// behaviors (mapped→tenantId, unmapped→undefined, control-DB throw→undefined).

/** The optional tenant slice attached to a `SkillAuthSuccess`. */
export type TenantBinding = {
  tenantId?: string;
  getSql?: SkillAuthSuccess["getSql"];
};

/** Injectable deps for `buildTenantBinding` (TEST-ONLY seam). */
export interface TenantBindingDeps {
  /** Control-plane lookup: token hash → ACTIVE tenant (or null). */
  resolveTenant: (hash: string) => Promise<{ tenantId?: string } | null>;
  /** Lazily open the keystone's pooled SQL handle for a tenant. */
  loadTenantSql: (
    tenantId: string
  ) => Promise<import("@/lib/tenant/resolve-connection").TenantSql>;
}

const tenantBindingDeps: TenantBindingDeps = {
  resolveTenant: (hash) => resolveTenantByTokenHash(hash),
  loadTenantSql: async (tenantId) => {
    // Lazy import: identity-only routes that never call `getSql()` never pull
    // the keystone (and its Neon/Drizzle deps) into the module graph.
    const { getTenantSql } = await import("@/lib/tenant/resolve-connection");
    return getTenantSql(tenantId);
  },
};

/**
 * Swap `buildTenantBinding`'s deps. TEST-ONLY. Returns a restore function.
 */
export function __setTenantBindingDeps(
  patch: Partial<TenantBindingDeps>
): () => void {
  const prev = { ...tenantBindingDeps };
  Object.assign(tenantBindingDeps, patch);
  return () => Object.assign(tenantBindingDeps, prev);
}

/**
 * Best-effort resolve the tenant a token hash is bound to and build the
 * optional `{ tenantId, getSql }` binding.
 *
 * - Token maps to an ACTIVE tenant → `{ tenantId, getSql }` (lazy SQL handle).
 * - Legacy / unmapped token (resolver returns `null`) → `{}` (no tenant).
 * - Control-DB throw → `{}` (swallowed): tenant binding is best-effort and
 *   MUST NEVER break auth of an otherwise-valid token (build_plan §6.6).
 */
export async function buildTenantBinding(hash: string): Promise<TenantBinding> {
  let tenantId: string | undefined;
  try {
    const tenant = await tenantBindingDeps.resolveTenant(hash);
    if (tenant?.tenantId) {
      tenantId = tenant.tenantId;
    }
  } catch {
    // Swallow — legacy callers fall back to DEFAULT_TENANT.
    return {};
  }

  if (!tenantId) return {};

  const boundTenantId = tenantId;
  return {
    tenantId: boundTenantId,
    getSql: () => tenantBindingDeps.loadTenantSql(boundTenantId),
  };
}

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Convenience for route handlers — checks that the auth succeeded AND
 * carries the required scope. Returns a Response to short-circuit on
 * failure, or null when the request is good to proceed.
 *
 *   const auth = await authenticateSkillRequest(req);
 *   const denied = requireScope(auth, "landing_pages:write");
 *   if (denied) return denied;
 *   // auth is narrowed to SkillAuthSuccess here
 */
// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
//
// Per-token sliding window. Tiers match docs/mcp/scopes-and-safety.md:
//   identity  → 200/min   (whoami, my_*)
//   read      → 100/min   (any :read scope)
//   write     → 30/min    (any :write scope, draft-only)
//   send      → 5/min     (campaigns:send only)
//
// In-memory; survives the lifetime of the serverless function instance only.
// Switch to Upstash Redis when we need cross-instance counts.

export type RateLimitTier = "identity" | "read" | "write" | "send" | "research";

const RATE_LIMIT_TIERS: Record<RateLimitTier, { max: number; windowMs: number }> = {
  identity: { max: 200, windowMs: 60_000 },
  read: { max: 100, windowMs: 60_000 },
  write: { max: 30, windowMs: 60_000 },
  send: { max: 5, windowMs: 60_000 },
  // Research read surface (build_plan §6.6 Agent 11). Sits between read and
  // write: research callers fan out a lot of read traffic but the saved-search
  // write is rare. Additive — no existing tier changed.
  research: { max: 60, windowMs: 60_000 },
};

/**
 * Check the rate limit for an authenticated request. Call AFTER auth +
 * requireScope; uses the token's identity (last4 + name fingerprint) as the
 * bucket key so distinct tokens can't share each other's quota.
 *
 * Returns a 429 Response on block, or null when the request may proceed.
 */
export function skillRateLimit(
  auth: SkillAuthSuccess,
  tier: RateLimitTier
): NextResponse | null {
  const config = RATE_LIMIT_TIERS[tier];
  // Bucket key combines tier + tokenLast4 so each tier is its own window.
  // tokenLast4 isn't unique on its own (collision space is 14 bits) but
  // we're scoped to a single Vercel instance anyway — collisions only
  // cause slight under-limit, never wrongful blocks.
  const key = `skill:${tier}:${auth.tokenLast4}:${auth.tokenName}`;
  const r = checkRateLimit(key, config);
  if (r.ok) return null;
  return NextResponse.json(
    {
      error: "rate_limited",
      message: r.error,
      tier,
      retryAfter: r.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(r.retryAfter),
      },
    }
  );
}

// Scopes that read LISTING/MARKET data. These require a data source: BYOD
// tenants read their own DB; admin reads dogfood; unbound tokens get an
// explicit refusal instead of silently seeing the owner's dataset. Per-agent
// surfaces (CMS, CRM reads, analytics — all keyed to the token's own user)
// are NOT gated here.
const DATA_SCOPES: ReadonlySet<Scope> = new Set([
  "listings:read",
  "market:read",
  "research:read",
] as Scope[]);

/** The standard 403 for a token with no connected data source. */
export function noDataSourceResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "no_data_source",
      message:
        "You haven't connected your listing data yet. ChatRealty is bring-your-own-data — your own MLS feed lives in your own database, so there's nothing to show until it's set up. Set it up yourself in a couple of minutes: run `npx @chatrealty/sync init --token <your ChatRealty token>`, add your MLS feed credentials, then `npx chatrealty-sync run`. After the first sync, listings and market data light up here automatically.",
      dataSource: "none",
    },
    { status: 403, headers: NO_STORE }
  );
}

export function requireScope(
  auth: SkillAuthResult,
  scope: Scope
): NextResponse | null {
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status, headers: NO_STORE }
    );
  }
  // BYOD gate: data reads refuse loudly when no data source is connected —
  // never fall through to the dogfood dataset (license + isolation).
  if (auth.dataSource === "none" && DATA_SCOPES.has(scope)) {
    return noDataSourceResponse();
  }
  if (!auth.scopes.includes(scope)) {
    return NextResponse.json(
      {
        error: "missing_scope",
        message: `This token does not have the '${scope}' scope. Re-mint with that scope from Settings → Integrations.`,
        required: scope,
        tokenScopes: auth.scopes,
        isLegacyToken: auth.isLegacyScopes,
      },
      { status: 403, headers: NO_STORE }
    );
  }
  return null;
}
