// apps/api/src/common/crt-auth.guard.ts
//
// The NestJS equivalent of the Next app's skill-auth (src/lib/skill-auth.ts).
// It reuses the SAME token hashing (hashToken) and the SAME control-plane
// resolver (resolveTenantByTokenHash) so a `crt_live_*` token minted in the
// Next app authenticates here identically.
//
// Flow:
//   Authorization: Bearer crt_live_<...>  →  hashToken(token)
//     →  resolveTenantByTokenHash(hash)  →  ITenant | null
//
//   • no / malformed token            → 401 unauthorized
//   • token present, no ACTIVE tenant → 403 forbidden (valid-looking token but
//                                       it is not bound to a live tenant)
//   • token maps to an ACTIVE tenant  → attach { tenantId } to the request and
//                                       allow.
//
// The resolved tenantId is stashed on `req.tenantId` (read by the @Tenant()
// param decorator and the request-scoped adapter provider).

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import type { Request } from "express";

import { hashToken } from "@/lib/secrets";
import { resolveTenantByTokenHash } from "@/lib/tenant/resolve-tenant";

/** The bearer-token grammar the Next skill-auth accepts, mirrored here. */
const BEARER_RE = /^Bearer\s+(crt_live_[A-Za-z0-9_-]+)$/;

/** A request that has passed the guard carries its resolved tenant id. */
export interface AuthedRequest extends Request {
  tenantId?: string;
}

@Injectable()
export class CrtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    const header =
      req.headers["authorization"] ||
      (req.headers["Authorization" as keyof typeof req.headers] as
        | string
        | undefined) ||
      "";

    const match = String(header).match(BEARER_RE);
    if (!match) {
      throw new UnauthorizedException("missing_or_malformed_token");
    }

    const token = match[1];
    const hash = hashToken(token);

    // Control-plane lookup (Mongo, Neon-free). Returns the tenant ONLY when it
    // is status:"active" AND the matched token is not revoked.
    const tenant = await resolveTenantByTokenHash(hash);
    if (!tenant) {
      // A syntactically valid token that resolves to no active tenant: the
      // token is unknown, revoked, or the tenant is suspended/teardown.
      throw new ForbiddenException("invalid_token_or_inactive_tenant");
    }

    req.tenantId = tenant.tenantId;
    return true;
  }
}
