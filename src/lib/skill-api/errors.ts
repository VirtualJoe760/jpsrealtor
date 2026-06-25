// src/lib/skill-api/errors.ts
//
// Standard error-code union + the centralized error→HTTP-status mapping for
// every /api/skill/* response. See build_plan §3.5: the envelope's `error`
// object is { code, message, param?, details? } and `mapErrorToResponse`
// is the ONE place a thrown error becomes an HTTP status.
//
// Pure logic — NO Next.js or DB imports. The Next `Response` is constructed by
// response.ts (`fail`), which consumes the plain shape this module produces.

// ---------------------------------------------------------------------------
// Error-code union
// ---------------------------------------------------------------------------
//
// The closed set of machine-readable `error.code` values a skill route may
// return. Keep this in sync with docs/chatrealty-api (LLM-first error table).

export type SkillErrorCode =
  // ---- request / validation (400) ----
  | "invalid_odata" // a $-query param was malformed or referenced an unknown field
  | "validation_failed" // a POST/PUT body failed validation
  | "bad_request" // generic 400 catch-all
  // ---- auth / scope (401 / 403) ----
  | "unauthorized" // missing/invalid token (401)
  | "missing_scope" // valid token, lacks the required scope (403)
  | "forbidden" // generic 403 catch-all
  // ---- tenant lifecycle ----
  | "tenant_not_active" // tenant exists but is suspended/teardown (403)
  | "tenant_unavailable" // tenant DB unreachable / failed to wake (503)
  // ---- resource ----
  | "not_found" // single-resource lookup miss (404)
  // ---- rate limiting ----
  | "rate_limited" // 429
  // ---- server ----
  | "internal_error"; // 500 catch-all

// ---------------------------------------------------------------------------
// Error payload shape (the `error` object inside the envelope)
// ---------------------------------------------------------------------------

export interface SkillErrorBody {
  code: SkillErrorCode;
  message: string;
  /** The offending query/body param, e.g. "$filter" for an OData error. */
  param?: string;
  /** Free-form structured context (never secrets). */
  details?: Record<string, unknown>;
}

/** What `mapErrorToResponse` returns: a status + the error body to serialize. */
export interface MappedError {
  status: number;
  body: SkillErrorBody;
}

// ---------------------------------------------------------------------------
// Typed error classes the subsystems throw. mapErrorToResponse recognizes
// these structurally (by a `code` field) so callers can throw a plain object
// or one of these classes interchangeably.
// ---------------------------------------------------------------------------

/** Base class carrying a SkillErrorCode + optional param/details. */
export class SkillError extends Error {
  readonly code: SkillErrorCode;
  readonly param?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: SkillErrorCode,
    message: string,
    opts?: { param?: string; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = "SkillError";
    this.code = code;
    this.param = opts?.param;
    this.details = opts?.details;
  }
}

/** $filter/$select/$orderby/etc. was malformed or named an unknown field. */
export class InvalidOdataError extends SkillError {
  constructor(
    message: string,
    opts?: { param?: string; details?: Record<string, unknown> }
  ) {
    super("invalid_odata", message, opts);
    this.name = "InvalidOdataError";
  }
}

/** A single-resource lookup missed. → 404 */
export class NotFoundError extends SkillError {
  constructor(message = "Resource not found", opts?: { details?: Record<string, unknown> }) {
    super("not_found", message, opts);
    this.name = "NotFoundError";
  }
}

/** Tenant DB unreachable / failed to wake (scale-to-zero). → 503 */
export class TenantUnavailableError extends SkillError {
  constructor(message = "Tenant database is temporarily unavailable", opts?: { details?: Record<string, unknown> }) {
    super("tenant_unavailable", message, opts);
    this.name = "TenantUnavailableError";
  }
}

/** Tenant exists but is suspended / in teardown. → 403 */
export class TenantSuspendedError extends SkillError {
  constructor(message = "Tenant is not active", opts?: { details?: Record<string, unknown> }) {
    super("tenant_not_active", message, opts);
    this.name = "TenantSuspendedError";
  }
}

/** Missing/invalid token. → 401 */
export class UnauthorizedError extends SkillError {
  constructor(message = "Unauthorized", opts?: { details?: Record<string, unknown> }) {
    super("unauthorized", message, opts);
    this.name = "UnauthorizedError";
  }
}

/** Valid token, missing the required scope. → 403 */
export class MissingScopeError extends SkillError {
  constructor(message = "Missing required scope", opts?: { param?: string; details?: Record<string, unknown> }) {
    super("missing_scope", message, opts);
    this.name = "MissingScopeError";
  }
}

/** Generic request validation failure. → 400 */
export class ValidationError extends SkillError {
  constructor(message = "Validation failed", opts?: { param?: string; details?: Record<string, unknown> }) {
    super("validation_failed", message, opts);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// code → HTTP status
// ---------------------------------------------------------------------------
//
// build_plan §3.5: TenantUnavailable→503, NotFound→404,
// TenantSuspended/tenant_not_active→403, validation→400, OAuth/scope→401/403.

const CODE_STATUS: Record<SkillErrorCode, number> = {
  invalid_odata: 400,
  validation_failed: 400,
  bad_request: 400,
  unauthorized: 401,
  missing_scope: 403,
  forbidden: 403,
  tenant_not_active: 403,
  tenant_unavailable: 503,
  not_found: 404,
  rate_limited: 429,
  internal_error: 500,
};

/** The HTTP status for a known error code (defaults to 500 for safety). */
export function statusForCode(code: SkillErrorCode): number {
  return CODE_STATUS[code] ?? 500;
}

// ---------------------------------------------------------------------------
// mapErrorToResponse — the centralized mapping
// ---------------------------------------------------------------------------
//
// Takes anything thrown (a SkillError, a plain { code, message } shape, a
// generic Error, or an unknown) and returns a { status, body } pair. It never
// throws and never leaks a stack trace or secret into the body.

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  param?: unknown;
  details?: unknown;
  // Some legacy throwers used `reason`/`status` (e.g. skill-auth failures).
  reason?: unknown;
  status?: unknown;
}

const KNOWN_CODES = new Set<SkillErrorCode>(
  Object.keys(CODE_STATUS) as SkillErrorCode[]
);

function isSkillErrorCode(v: unknown): v is SkillErrorCode {
  return typeof v === "string" && KNOWN_CODES.has(v as SkillErrorCode);
}

/**
 * Map any thrown value to a status + serializable error body.
 *
 * Resolution order:
 *  1. A SkillError (or anything with a recognized `code`) → its mapped status.
 *  2. A legacy auth-style failure ({ reason, status }) → that status, code
 *     inferred from the status.
 *  3. Anything else → 500 internal_error with a generic message.
 */
export function mapErrorToResponse(err: unknown): MappedError {
  // 1. SkillError instance or a structurally-coded object.
  if (err instanceof SkillError) {
    return {
      status: statusForCode(err.code),
      body: {
        code: err.code,
        message: err.message,
        ...(err.param !== undefined ? { param: err.param } : {}),
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
  }

  if (err && typeof err === "object") {
    const e = err as ErrorLike;

    if (isSkillErrorCode(e.code)) {
      const code = e.code;
      return {
        status: statusForCode(code),
        body: {
          code,
          message: typeof e.message === "string" ? e.message : code,
          ...(typeof e.param === "string" ? { param: e.param } : {}),
          ...(e.details && typeof e.details === "object"
            ? { details: e.details as Record<string, unknown> }
            : {}),
        },
      };
    }

    // 2. Legacy { reason, status } auth failure shape.
    if (typeof e.status === "number") {
      const status = e.status;
      const code = statusToCode(status);
      const message =
        typeof e.reason === "string"
          ? e.reason
          : typeof e.message === "string"
            ? e.message
            : code;
      return { status, body: { code, message } };
    }
  }

  // 3. Unknown — never leak the original message; log upstream, return generic.
  return {
    status: 500,
    body: { code: "internal_error", message: "Internal server error" },
  };
}

/** Best-effort inverse: a bare HTTP status → the closest SkillErrorCode. */
function statusToCode(status: number): SkillErrorCode {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 429:
      return "rate_limited";
    case 503:
      return "tenant_unavailable";
    default:
      return status >= 500 ? "internal_error" : "bad_request";
  }
}
