// apps/api/src/common/tenant.decorator.ts
//
// @Tenant() — param decorator that pulls the resolved tenantId off the request
// (set by CrtAuthGuard). Guarantees a string: if it's somehow absent the guard
// did not run, which is a wiring bug, so we throw rather than silently defaulting.

import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from "@nestjs/common";
import type { AuthedRequest } from "./crt-auth.guard";

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const tenantId = req.tenantId;
    if (!tenantId) {
      // Reaching a handler without a tenantId means the CrtAuthGuard was not
      // applied to this route — a programming error, not a client error.
      throw new InternalServerErrorException(
        "tenant context missing — CrtAuthGuard did not run for this route",
      );
    }
    return tenantId;
  },
);
