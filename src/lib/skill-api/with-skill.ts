// src/lib/skill-api/with-skill.ts
//
// `withSkill` — the additive route-handler seam for the /api/skill/* REST
// surface (build_plan Spec 6 Task B / §6.6). It fuses, in this exact order:
//
//   auth → tenant adapter injection (keystone) → OData-parse → handler
//
// and stamps `Cache-Control: no-store` + maps any thrown error through the
// centralized `mapErrorToResponse`. This is the seam routes adopt LATER; it
// imports the existing surfaces and changes NO existing route or
// `src/lib/skill-auth.ts`. (Agent 13's richer `handler.ts` — scope + rate-limit
// + field-maps — is a separate file; this wrapper is intentionally the minimal,
// composable core.)
//
// TENANT-SCOPING (build_plan §3.3): the wrapper NEVER constructs an adapter,
// never opens a Pool, never imports a module-level `db`. It calls the keystone's
// pooled, LRU-cached `resolveAdapterForRequest(auth)`, which falls back to the
// DEFAULT_TENANT (legacy Mongo) adapter when the auth carries no `tenantId`.
//
// MOCKABILITY: the two collaborators (`authenticateSkillRequest`,
// `resolveAdapterForRequest`) are reached through a module-level `deps` object a
// test swaps via `__setWithSkillDeps`. That keeps the unit test free of any live
// Mongo/Neon connection while exercising the real wrapper control-flow — the
// same seam pattern the keystone uses (`__setResolveConnectionDeps`).

import { NextResponse, type NextRequest } from "next/server";

import {
  authenticateSkillRequest,
  type SkillAuthResult,
  type SkillAuthSuccess,
} from "@/lib/skill-auth";
import {
  resolveAdapterForRequest,
  type TenantBoundAuth,
} from "@/lib/tenant/resolve-connection";
import type { DbAdapter } from "@/lib/db/adapter";
import {
  parseOdata,
  type OdataQuery,
  type ParseOdataOptions,
} from "@/lib/skill-api/odata/parse";
import { mapErrorToResponse } from "@/lib/skill-api/errors";
import { NO_STORE_HEADERS } from "@/lib/skill-api/response";

// ---------------------------------------------------------------------------
// Injectable dependencies (the ONLY seam tests swap — no live Mongo/Neon)
// ---------------------------------------------------------------------------

export interface WithSkillDeps {
  /** Existing bearer auth check (`src/lib/skill-auth.ts`). */
  authenticate: (req: NextRequest) => Promise<SkillAuthResult>;
  /** Keystone resolver: auth → pooled, tenant-scoped `DbAdapter`. */
  resolveAdapter: (auth: TenantBoundAuth) => Promise<DbAdapter>;
}

const deps: WithSkillDeps = {
  authenticate: authenticateSkillRequest,
  resolveAdapter: resolveAdapterForRequest,
};

/**
 * Swap the wrapper's collaborators (auth + adapter resolver). TEST-ONLY.
 * Returns a restore function.
 */
export function __setWithSkillDeps(patch: Partial<WithSkillDeps>): () => void {
  const prev = { ...deps };
  Object.assign(deps, patch);
  return () => Object.assign(deps, prev);
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Options controlling what the wrapper does before invoking the handler. */
export interface WithSkillOptions {
  /**
   * When set, the wrapper parses the request's OData query params
   * (`$filter/$select/$orderby/$top/$skip/$count`) and passes the structured
   * `OdataQuery` to the handler. When omitted, `ctx.odata` is `undefined` and
   * no parsing (or field validation) runs.
   */
  odata?: boolean;
  /**
   * The allow-list of queryable field names for OData validation. Only
   * meaningful when `odata` is true; an unknown field yields `invalid_odata`
   * (→400) via `mapErrorToResponse`. May be any iterable of canonical names.
   */
  allowedFields?: Iterable<string>;
  /** Hard ceiling on `$top` (clamped, not rejected). Forwarded to `parseOdata`. */
  maxTop?: number;
}

/**
 * The context object handed to a `withSkill` handler. Carries the original
 * request, the narrowed auth success, the resolved tenant adapter, and — when
 * `opts.odata` was set — the parsed OData query.
 */
export interface SkillContext {
  readonly req: NextRequest;
  readonly auth: SkillAuthSuccess;
  readonly adapter: DbAdapter;
  /** Present only when `opts.odata` was set; otherwise `undefined`. */
  readonly odata?: OdataQuery;
}

/** A route handler driven by the wrapper. Returns the NextResponse to send. */
export type SkillHandler = (ctx: SkillContext) => Promise<NextResponse> | NextResponse;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stamp `Cache-Control: no-store` onto a response, preserving its other headers. */
function withNoStore(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

/** Build the standard error envelope `NextResponse` for a thrown value. */
function failResponse(err: unknown): NextResponse {
  const mapped = mapErrorToResponse(err);
  return NextResponse.json(
    { error: mapped.body },
    { status: mapped.status, headers: NO_STORE_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// withSkill
// ---------------------------------------------------------------------------

/**
 * Wrap a Next App-Router route handler with the skill-API pipeline.
 *
 * Pipeline (build_plan §6.6 order):
 *  1. Authenticate via the existing bearer check. Failure → its status
 *     (401/403) through the standard error envelope.
 *  2. Resolve the tenant `DbAdapter` via the keystone (DEFAULT_TENANT fallback
 *     when the auth carries no `tenantId`). A `TenantUnavailableError` maps to
 *     503; a suspended tenant to 403 — both via `mapErrorToResponse`.
 *  3. When `opts.odata`, parse the OData query against `opts.allowedFields`. A
 *     malformed query / unknown field → `invalid_odata` (400).
 *  4. Invoke `handler({ req, auth, adapter, odata })`.
 *  5. Any thrown value is mapped via `mapErrorToResponse`; every response —
 *     success or failure — carries `Cache-Control: no-store`.
 *
 * ADDITIVE: this wrapper changes no existing route and does not modify
 * `src/lib/skill-auth.ts`. Routes opt in by adopting it later.
 */
export function withSkill(
  handler: SkillHandler,
  opts: WithSkillOptions = {},
): (req: NextRequest) => Promise<NextResponse> {
  return async function skillRoute(req: NextRequest): Promise<NextResponse> {
    try {
      // 1. Auth (existing bearer check). A failure short-circuits with its own
      //    status, routed through the standard envelope.
      const auth = await deps.authenticate(req);
      if (!auth.ok) {
        return failResponse(auth); // { ok:false, status, reason } → mapped
      }

      // 2. Tenant adapter injection (keystone). Never opens a client here.
      const adapter = await deps.resolveAdapter(auth as TenantBoundAuth);

      // 3. OData parse (opt-in). Unknown field / malformed → invalid_odata 400.
      let odata: OdataQuery | undefined;
      if (opts.odata) {
        const parseOpts: ParseOdataOptions = {};
        if (opts.allowedFields !== undefined) parseOpts.allowedFields = opts.allowedFields;
        if (opts.maxTop !== undefined) parseOpts.maxTop = opts.maxTop;
        odata = parseOdata(new URL(req.url).searchParams, parseOpts);
      }

      // 4. Hand off to the route's handler.
      const res = await handler({ req, auth, adapter, odata });

      // 5. Always no-store (per-tenant data is never shared-cacheable).
      return withNoStore(res);
    } catch (err) {
      // 5 (error path). Centralized mapping; no stack/secret leaks; no-store.
      return failResponse(err);
    }
  };
}
