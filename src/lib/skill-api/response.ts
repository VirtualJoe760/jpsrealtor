// src/lib/skill-api/response.ts
//
// The standard OData-flavored response envelope for every /api/skill/* route
// (build_plan section 3.5). Three helpers:
//
//   ok(items, meta)   -> collection envelope ({ value, @odata.count?, @odata.nextLink, meta, items })
//   okOne(resource)   -> single-resource envelope (the bare object)
//   fail(error)       -> error envelope ({ error: { code, message, param?, details? } })
//
// Every response sets `Cache-Control: no-store` — per-tenant data is never
// shared-cacheable (architecture "Auth-Gated Cache Leak" memory).
//
// MCP back-compat (section 3.5 + section 6.6): `ok()` emits BOTH the new
// `value` array AND the legacy `items` alias during the MCP deprecation window,
// so the MCP server's current `{ items, total, skip, limit, hasMore }`
// consumers keep working at cutover. Recorded in docs/tech-debt.md by the
// owning agent.
//
// This module DOES import `next/server` (it builds real `NextResponse`s); the
// pure pieces (envelope shaping) are exported separately as `buildOkBody` etc.
// so they can be unit-tested without Next if desired.

import { NextResponse } from "next/server";
import {
  mapErrorToResponse,
  type SkillErrorBody,
  type SkillErrorCode,
} from "@/lib/skill-api/errors";

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

/** Header set stamped on EVERY skill response. */
export const NO_STORE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store",
};

// ---------------------------------------------------------------------------
// Envelope types
// ---------------------------------------------------------------------------

/** Pagination/meta block carried on a collection response. */
export interface CollectionMeta {
  /** The effective page size ($top), after clamping. */
  top: number;
  /** The effective offset ($skip). */
  skip: number;
  /** True when more rows exist past this page. */
  hasMore: boolean;
}

/** Options controlling how a collection envelope is built. */
export interface OkOptions {
  /** Effective $top used for the query (page size). */
  top: number;
  /** Effective $skip used for the query (offset). */
  skip: number;
  /**
   * Total matching count. ONLY include this when the caller passed
   * `$count=true` — counting is expensive, never unconditional (section 3.5).
   * When provided, it populates `@odata.count` and drives `hasMore`.
   */
  count?: number;
  /**
   * Whether more rows exist past this page. If `count` is provided this is
   * derived (`skip + items.length < count`); otherwise pass it explicitly
   * (e.g. the adapter fetched `top + 1` rows to peek).
   */
  hasMore?: boolean;
  /**
   * Absolute or relative URL for the next page, or null. When omitted and
   * `hasMore` is true, callers may pass a `nextLink` they computed from the
   * request URL; this module does not synthesize one (it has no request).
   */
  nextLink?: string | null;
}

/** The collection envelope shape (what `ok` serializes). */
export interface CollectionEnvelope<T> {
  value: T[];
  /** Present ONLY when a count was supplied. */
  "@odata.count"?: number;
  "@odata.nextLink": string | null;
  meta: CollectionMeta;
  /** Legacy alias for `value` — MCP back-compat deprecation window. */
  items: T[];
}

// ---------------------------------------------------------------------------
// Pure envelope builders (no Next dependency) — exported for unit tests.
// ---------------------------------------------------------------------------

/**
 * Build the collection envelope object (without wrapping in a NextResponse).
 * Pure — safe to unit-test with no Next import.
 */
export function buildOkBody<T>(items: T[], opts: OkOptions): CollectionEnvelope<T> {
  const { top, skip } = opts;

  // Derive hasMore: prefer an explicit flag, else compute from count, else
  // false (we can't know without one of them).
  const hasMore =
    opts.hasMore !== undefined
      ? opts.hasMore
      : opts.count !== undefined
        ? skip + items.length < opts.count
        : false;

  const envelope: CollectionEnvelope<T> = {
    value: items,
    "@odata.nextLink": opts.nextLink ?? null,
    meta: { top, skip, hasMore },
    items, // legacy alias (same reference) — MCP deprecation window
  };

  // @odata.count is emitted ONLY when a count was supplied ($count=true).
  if (opts.count !== undefined) {
    envelope["@odata.count"] = opts.count;
  }

  return envelope;
}

/** Build the error envelope object. Pure. */
export function buildErrorBody(error: SkillErrorBody): { error: SkillErrorBody } {
  return { error };
}

// ---------------------------------------------------------------------------
// NextResponse helpers
// ---------------------------------------------------------------------------

/**
 * Collection response. Emits the section-3.5 envelope with `value` + legacy
 * `items`, optional `@odata.count` (only when `count` is supplied), `meta`, and
 * `@odata.nextLink`. Always `no-store`.
 */
export function ok<T>(items: T[], opts: OkOptions): NextResponse {
  return NextResponse.json(buildOkBody(items, opts), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * Single-resource response. The body IS the bare resource object (no envelope
 * wrapping), per section 3.5. Always `no-store`. Status defaults to 200; pass
 * 201 for a freshly-created resource.
 */
export function okOne<T>(resource: T, status: 200 | 201 = 200): NextResponse {
  return NextResponse.json(resource, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * Error response. Accepts either:
 *   - a structured `{ code, message, param?, details? }` body (preferred), or
 *   - any thrown value, which is routed through `mapErrorToResponse`.
 *
 * The HTTP status is derived from the error code via `mapErrorToResponse`, so
 * a route never has to remember the code→status mapping. Always `no-store`.
 *
 *   return fail({ code: "not_found", message: "Listing not found" });
 *   return fail(err); // anything thrown
 */
export function fail(
  error: SkillErrorBody | { code: SkillErrorCode; message: string; param?: string; details?: Record<string, unknown> } | unknown
): NextResponse {
  const mapped = mapErrorToResponse(error);
  return NextResponse.json(buildErrorBody(mapped.body), {
    status: mapped.status,
    headers: NO_STORE_HEADERS,
  });
}
