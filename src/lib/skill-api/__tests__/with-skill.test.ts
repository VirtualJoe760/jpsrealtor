// src/lib/skill-api/__tests__/with-skill.test.ts
//
// Unit tests for the `withSkill` route wrapper (build_plan Spec 6 Task B).
//
//   npx tsx --test src/lib/skill-api/__tests__/with-skill.test.ts
//
// NO live DB. The wrapper's two collaborators — the bearer auth check and the
// keystone adapter resolver — are swapped through `__setWithSkillDeps`, so this
// suite never opens a Mongo/Neon connection. We assert the full control-flow:
// auth failure → 401, TenantUnavailable → 503, success calls the handler with a
// `{ adapter, odata }` context, thrown errors are mapped, and EVERY response
// carries `Cache-Control: no-store`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { NextRequest, NextResponse } from "next/server";

import {
  withSkill,
  __setWithSkillDeps,
  type SkillContext,
} from "@/lib/skill-api/with-skill";
import type { SkillAuthResult, SkillAuthSuccess } from "@/lib/skill-auth";
import type { DbAdapter } from "@/lib/db/adapter";
import type { TenantBoundAuth } from "@/lib/tenant/resolve-connection";
import { TenantUnavailableError, NotFoundError } from "@/lib/skill-api/errors";

// ---------------------------------------------------------------------------
// Fakes — zero live connections.
// ---------------------------------------------------------------------------

/** A NextRequest stand-in: the wrapper only reads `req.url` (for OData). */
function fakeReq(url = "https://x.test/api/skill/listings"): NextRequest {
  return { url } as unknown as NextRequest;
}

/** A successful auth result. Optionally bound to a tenant. */
function authOk(tenantId?: string): SkillAuthSuccess {
  return {
    ok: true,
    user: { _id: "u1" },
    tokenName: "test-token",
    tokenLast4: "abcd",
    scopes: [],
    isLegacyScopes: true,
    // `tenantId` is read by the keystone via TenantBoundAuth; absent → default.
    ...(tenantId !== undefined ? { tenantId } : {}),
  } as SkillAuthSuccess;
}

/** A minimal DbAdapter sentinel — identity-checked, never exercised. */
function fakeAdapter(dialect: "mongo" | "postgres" = "postgres"): DbAdapter {
  return { dialect, __fake: true } as unknown as DbAdapter;
}

/** Read a NextResponse's JSON body without a live HTTP round-trip. */
async function readJson(res: NextResponse): Promise<any> {
  return res.json();
}

// ---------------------------------------------------------------------------
// 1. Auth failure → 401 (mapped through the standard error envelope).
// ---------------------------------------------------------------------------

test("auth failure short-circuits with its status (401) and no-store", async () => {
  let handlerCalled = false;
  const restore = __setWithSkillDeps({
    authenticate: async (): Promise<SkillAuthResult> => ({
      ok: false,
      status: 401,
      reason: "missing_or_malformed_token",
    }),
    resolveAdapter: async () => {
      throw new Error("resolveAdapter must NOT run when auth fails");
    },
  });

  try {
    const route = withSkill(async () => {
      handlerCalled = true;
      return undefined as unknown as NextResponse;
    });
    const res = await route(fakeReq());

    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(handlerCalled, false, "handler must not run on auth failure");

    const body = await readJson(res);
    assert.equal(body.error.code, "unauthorized");
    assert.equal(body.error.message, "missing_or_malformed_token");
  } finally {
    restore();
  }
});

test("a 403 auth failure maps to forbidden/403", async () => {
  const restore = __setWithSkillDeps({
    authenticate: async (): Promise<SkillAuthResult> => ({
      ok: false,
      status: 403,
      reason: "token_revoked",
    }),
    resolveAdapter: async () => {
      throw new Error("must not run");
    },
  });
  try {
    const res = await withSkill(async () => fakeResponse())(fakeReq());
    assert.equal(res.status, 403);
    const body = await readJson(res);
    assert.equal(body.error.code, "forbidden");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// 2. TenantUnavailable → 503.
// ---------------------------------------------------------------------------

test("TenantUnavailable from the keystone maps to 503 and no-store", async () => {
  let handlerCalled = false;
  const restore = __setWithSkillDeps({
    authenticate: async () => authOk(),
    resolveAdapter: async (_auth: TenantBoundAuth): Promise<DbAdapter> => {
      throw new TenantUnavailableError("Tenant __t__ is not available");
    },
  });

  try {
    const res = await withSkill(async () => {
      handlerCalled = true;
      return fakeResponse();
    })(fakeReq());

    assert.equal(res.status, 503);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(handlerCalled, false, "handler must not run when adapter fails");

    const body = await readJson(res);
    assert.equal(body.error.code, "tenant_unavailable");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// 3. Success → handler invoked with { adapter, odata }; default no-OData path.
// ---------------------------------------------------------------------------

test("success injects the resolved adapter and passes auth through", async () => {
  const adapter = fakeAdapter("postgres");
  let seen: SkillContext | null = null;
  let resolvedWith: TenantBoundAuth | null = null;

  const restore = __setWithSkillDeps({
    authenticate: async () => authOk("tenant-42"),
    resolveAdapter: async (auth: TenantBoundAuth) => {
      resolvedWith = auth;
      return adapter;
    },
  });

  try {
    const route = withSkill(async (ctx) => {
      seen = ctx;
      return fakeResponse({ ok: 1 });
    });
    const res = await route(fakeReq());

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");

    assert.ok(seen, "handler ran");
    assert.equal(seen!.adapter, adapter, "the resolved adapter is injected");
    assert.equal(seen!.auth.ok, true);
    assert.equal(seen!.odata, undefined, "no OData parsed without opts.odata");

    // The keystone receives the auth object so it can read tenantId.
    assert.ok(resolvedWith, "resolveAdapter was called");
    assert.equal((resolvedWith as TenantBoundAuth).tenantId, "tenant-42");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// 4. OData: opts.odata parses the query and passes a structured OdataQuery.
// ---------------------------------------------------------------------------

test("opts.odata parses $filter/$top/$skip/$select/$orderby into ctx.odata", async () => {
  let seen: SkillContext | null = null;
  const restore = __setWithSkillDeps({
    authenticate: async () => authOk(),
    resolveAdapter: async () => fakeAdapter(),
  });

  try {
    const url =
      "https://x.test/api/skill/listings" +
      "?$filter=city eq 'Palm Desert' and beds ge 3" +
      "&$select=city,beds&$orderby=beds desc&$top=10&$skip=5&$count=true";
    const route = withSkill(
      async (ctx) => {
        seen = ctx;
        return fakeResponse();
      },
      { odata: true, allowedFields: ["city", "beds"] },
    );
    const res = await route(fakeReq(url));

    assert.equal(res.status, 200);
    assert.ok(seen!.odata, "odata parsed");
    const q = seen!.odata!;
    assert.equal(q.filter.length, 2);
    assert.equal(q.filter[0].field, "city");
    assert.equal(q.filter[0].value, "Palm Desert");
    assert.deepEqual(q.select, ["city", "beds"]);
    assert.equal(q.orderby[0].direction, "desc");
    assert.equal(q.top, 10);
    assert.equal(q.skip, 5);
    assert.equal(q.count, true);
  } finally {
    restore();
  }
});

test("opts.odata with an unknown field maps to invalid_odata (400)", async () => {
  const restore = __setWithSkillDeps({
    authenticate: async () => authOk(),
    resolveAdapter: async () => fakeAdapter(),
  });
  try {
    const route = withSkill(async () => fakeResponse(), {
      odata: true,
      allowedFields: ["city"],
    });
    const res = await route(
      fakeReq("https://x.test/api/skill/listings?$filter=bogus eq 1"),
    );
    assert.equal(res.status, 400);
    const body = await readJson(res);
    assert.equal(body.error.code, "invalid_odata");
    assert.equal(body.error.param, "$filter");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// 5. A handler that throws is mapped through mapErrorToResponse.
// ---------------------------------------------------------------------------

test("a thrown NotFoundError from the handler maps to 404", async () => {
  const restore = __setWithSkillDeps({
    authenticate: async () => authOk(),
    resolveAdapter: async () => fakeAdapter(),
  });
  try {
    const route = withSkill(async () => {
      throw new NotFoundError("Listing not found");
    });
    const res = await route(fakeReq());
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const body = await readJson(res);
    assert.equal(body.error.code, "not_found");
    assert.equal(body.error.message, "Listing not found");
  } finally {
    restore();
  }
});

test("an unknown thrown value maps to a generic 500 (no leak)", async () => {
  const restore = __setWithSkillDeps({
    authenticate: async () => authOk(),
    resolveAdapter: async () => fakeAdapter(),
  });
  try {
    const route = withSkill(async () => {
      throw new Error("boom with a secret conn string");
    });
    const res = await route(fakeReq());
    assert.equal(res.status, 500);
    const body = await readJson(res);
    assert.equal(body.error.code, "internal_error");
    assert.equal(body.error.message, "Internal server error");
    assert.ok(
      !JSON.stringify(body).includes("secret"),
      "the original message must not leak",
    );
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// 6. Success response gets no-store even if the handler set other headers.
// ---------------------------------------------------------------------------

test("withNoStore overwrites a handler's cache-control", async () => {
  const restore = __setWithSkillDeps({
    authenticate: async () => authOk(),
    resolveAdapter: async () => fakeAdapter(),
  });
  try {
    const route = withSkill(async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json(
        { ok: 1 },
        { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
      );
    });
    const res = await route(fakeReq());
    assert.equal(res.headers.get("cache-control"), "no-store");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// Small helper: build a success NextResponse inside a test.
// ---------------------------------------------------------------------------

function fakeResponse(body: unknown = { ok: true }): NextResponse {
  // Lazily require to keep the top-level import list tidy; next/server is
  // already loaded by the wrapper under test.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NextResponse } = require("next/server");
  return NextResponse.json(body, { status: 200 });
}
