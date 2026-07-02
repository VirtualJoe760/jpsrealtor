// apps/api/src/common/core-exception.filter.ts
//
// Global exception filter that reuses the Next app's centralized error mapper
// (src/lib/skill-api/errors.ts → mapErrorToResponse). Any error thrown out of a
// handler — including the control-plane TenantUnavailableError from the keystone
// resolver — becomes the SAME { status, body:{ code, message } } envelope the
// Next skill routes emit, so error shapes stay identical across both surfaces.
//
// NestJS HttpExceptions (thrown by the guard, ValidationPipe, or a handler's
// NotFoundException) are passed through with their own status + body.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";

import { mapErrorToResponse } from "@/lib/skill-api/errors";

@Catch()
export class CoreExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    // Let Nest's own HTTP exceptions (guard 401/403, ValidationPipe 400,
    // handler 404) keep their native status + body.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).set("Cache-Control", "no-store").json(body);
      return;
    }

    // Everything else — notably the keystone's TenantUnavailableError and the
    // reused skill-api SkillErrors — goes through the shared mapper.
    const mapped = mapErrorToResponse(exception);
    res
      .status(mapped.status)
      .set("Cache-Control", "no-store")
      .json({ error: mapped.body });
  }
}
