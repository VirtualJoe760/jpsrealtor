// src/lib/reso/web-api/errors.ts
//
// OData error bodies for /api/skill/reso. `reso-cert core` asserts 400 for bad
// query syntax and 404 for an unknown resource, so every failure mode below
// carries its HTTP status rather than being mapped later.

export class ResoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly target?: string,
  ) {
    super(message);
    this.name = "ResoError";
  }
}

export const badRequest = (message: string, target?: string) =>
  new ResoError(400, "BadRequest", message, target);

/** A valid OData construct this server doesn't implement (OData §9.1.6: 501). */
export const notImplemented = (message: string, target?: string) =>
  new ResoError(501, "NotImplemented", message, target);

export const notFound = (message: string) => new ResoError(404, "NotFound", message);

export function errorBody(err: ResoError) {
  return {
    error: {
      code: err.code,
      message: err.message,
      ...(err.target ? { target: err.target } : {}),
      details: [] as unknown[],
    },
  };
}
