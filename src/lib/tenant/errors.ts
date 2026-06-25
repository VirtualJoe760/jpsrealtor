// src/lib/tenant/errors.ts
//
// Agent 07 — control-plane tenant errors.
//
// These are the typed failures the tenant resolver throws. They are mapped to
// HTTP status by the REST surface's centralized `mapErrorToResponse`
// (build_plan §3.5): TenantUnavailable → 503, TenantNotFound → 404. Keeping
// them as distinct named classes (with a stable `code`) lets that mapper switch
// on `instanceof`/`code` without string-matching messages.
//
// NEVER put a connection string, token plaintext, or decrypted secret in an
// error message — these messages may be logged (build_plan §3.7 #6).

/** Base class for control-plane tenant failures. Carries a stable `code`. */
export class TenantError extends Error {
  /** Stable machine code the error→status mapper switches on. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    // Restore prototype chain for `instanceof` across transpile targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * The tenant exists in the registry but cannot currently serve requests — it is
 * not `active` (pending/provisioning/suspended/teardown/...), or its data plane
 * is otherwise unreachable. Maps to HTTP 503.
 *
 * `status` is a security boundary checked on every request (build_plan §6.1
 * gotchas): a non-active tenant is treated as unavailable, never silently
 * served.
 */
export class TenantUnavailableError extends TenantError {
  /** The tenant's current status, when known (omitted to avoid leaking on a bare miss). */
  readonly status?: string;

  constructor(message = "Tenant is not available", status?: string) {
    super("tenant_unavailable", message);
    this.status = status;
  }
}

/**
 * No tenant matches the given identifier / token hash at all. Maps to HTTP 404.
 * Distinct from `TenantUnavailableError` so a missing tenant and a suspended
 * one are not conflated.
 */
export class TenantNotFoundError extends TenantError {
  constructor(message = "Tenant not found") {
    super("tenant_not_found", message);
  }
}
