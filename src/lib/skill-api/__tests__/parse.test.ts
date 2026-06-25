// src/lib/skill-api/__tests__/parse.test.ts
//
// Unit tests for the OData parser + standard envelope + error mapping
// (build_plan Agent 05). Pure logic only — NO DB, NO Next runtime. Uses the
// Node built-in test runner (`node:test` + `node:assert`) so it runs with no
// added dependency:
//
//   npx tsx --test src/lib/skill-api/__tests__/parse.test.ts
//
// (tsx resolves the project's `@/*` tsconfig path alias.)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseOdata,
  type OdataQuery,
} from "@/lib/skill-api/odata/parse";
import {
  buildOkBody,
  buildErrorBody,
  NO_STORE_HEADERS,
} from "@/lib/skill-api/response";
import {
  mapErrorToResponse,
  InvalidOdataError,
  NotFoundError,
  TenantUnavailableError,
  TenantSuspendedError,
  UnauthorizedError,
  MissingScopeError,
  ValidationError,
  statusForCode,
} from "@/lib/skill-api/errors";

// Representative field allow-list (PascalCase RESO names + a custom extras key).
const FIELDS = [
  "City",
  "ListPrice",
  "BedroomsTotal",
  "ListingKey",
  "StandardStatus",
  "PoolPrivateYN",
  "extras.waterfront",
];

// Convenience: assert a parse throws invalid_odata naming the expected param.
function expectInvalid(
  fn: () => unknown,
  expectedParam: string,
  label: string
): void {
  assert.throws(
    fn,
    (err: unknown) => {
      assert.ok(err instanceof InvalidOdataError, `${label}: expected InvalidOdataError`);
      assert.equal(err.code, "invalid_odata", `${label}: code`);
      assert.equal(err.param, expectedParam, `${label}: param`);
      return true;
    },
    label
  );
}

// ===========================================================================
// $filter — happy path + round-trip
// ===========================================================================

test("$filter: round-trips the canonical AND example", () => {
  const q = parseOdata(
    { "$filter": "City eq 'Palm Desert' and ListPrice ge 500000" },
    { allowedFields: FIELDS }
  );
  assert.deepEqual(q.filter, [
    { field: "City", operator: "eq", value: "Palm Desert" },
    { field: "ListPrice", operator: "ge", value: 500000 },
  ]);
});

test("$filter: parses every operator", () => {
  const q = parseOdata(
    {
      "$filter":
        "City eq 'X' and City ne 'Y' and ListPrice gt 1 and ListPrice ge 2 and ListPrice lt 9 and ListPrice le 8",
    },
    { allowedFields: FIELDS }
  );
  assert.deepEqual(
    q.filter.map((c) => c.operator),
    ["eq", "ne", "gt", "ge", "lt", "le"]
  );
});

test("$filter: parses boolean and null literals", () => {
  const q = parseOdata(
    { "$filter": "PoolPrivateYN eq true and StandardStatus ne null" },
    { allowedFields: FIELDS }
  );
  assert.deepEqual(q.filter, [
    { field: "PoolPrivateYN", operator: "eq", value: true },
    { field: "StandardStatus", operator: "ne", value: null },
  ]);
});

test("$filter: parses negative and decimal numbers", () => {
  const q = parseOdata(
    { "$filter": "ListPrice ge -1.5" },
    { allowedFields: FIELDS }
  );
  assert.equal(q.filter[0].value, -1.5);
});

test("$filter: a string literal may contain the word 'and' and quotes", () => {
  const q = parseOdata(
    { "$filter": "City eq 'Rancho Mirage and Palm''s' and ListPrice ge 1" },
    { allowedFields: FIELDS }
  );
  assert.equal(q.filter.length, 2);
  assert.equal(q.filter[0].value, "Rancho Mirage and Palm's");
  assert.equal(q.filter[1].field, "ListPrice");
});

test("$filter: field name is canonicalized case-insensitively", () => {
  const q = parseOdata(
    { "$filter": "city eq 'Indio'" },
    { allowedFields: FIELDS }
  );
  assert.equal(q.filter[0].field, "City");
});

test("$filter: empty/absent yields empty array", () => {
  assert.deepEqual(parseOdata({}, { allowedFields: FIELDS }).filter, []);
  assert.deepEqual(parseOdata({ "$filter": "  " }, { allowedFields: FIELDS }).filter, []);
});

// ===========================================================================
// $filter — rejects
// ===========================================================================

test("$filter: rejects 'or'", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "City eq 'A' or City eq 'B'" }, { allowedFields: FIELDS }),
    "$filter",
    "or"
  );
});

test("$filter: rejects parentheses", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "(City eq 'A')" }, { allowedFields: FIELDS }),
    "$filter",
    "parens"
  );
});

test("$filter: rejects an unknown field", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "Bogus eq 1" }, { allowedFields: FIELDS }),
    "$filter",
    "unknown field"
  );
});

test("$filter: rejects an unsupported operator", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "City has 'A'" }, { allowedFields: FIELDS }),
    "$filter",
    "bad op"
  );
});

test("$filter: rejects a malformed comparison", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "City eq" }, { allowedFields: FIELDS }),
    "$filter",
    "missing value"
  );
});

test("$filter: rejects a dangling 'and'", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "City eq 'A' and " }, { allowedFields: FIELDS }),
    "$filter",
    "dangling and"
  );
});

test("$filter: rejects an unterminated string literal", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "City eq 'unterminated" }, { allowedFields: FIELDS }),
    "$filter",
    "unterminated"
  );
});

test("$filter: rejects an unquoted bareword value", () => {
  expectInvalid(
    () => parseOdata({ "$filter": "City eq PalmDesert" }, { allowedFields: FIELDS }),
    "$filter",
    "bareword"
  );
});

test("$filter: error carries the offending param + field detail", () => {
  try {
    parseOdata({ "$filter": "Bogus eq 1" }, { allowedFields: FIELDS });
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof InvalidOdataError);
    assert.equal(err.param, "$filter");
    assert.equal((err.details as { field: string }).field, "Bogus");
  }
});

// ===========================================================================
// $select
// ===========================================================================

test("$select: round-trips a comma list and canonicalizes case", () => {
  const q = parseOdata(
    { "$select": "listingKey, City ,ListPrice" },
    { allowedFields: FIELDS }
  );
  assert.deepEqual(q.select, ["ListingKey", "City", "ListPrice"]);
});

test("$select: absent yields null (all fields)", () => {
  assert.equal(parseOdata({}, { allowedFields: FIELDS }).select, null);
});

test("$select: rejects an unknown field", () => {
  expectInvalid(
    () => parseOdata({ "$select": "City,Bogus" }, { allowedFields: FIELDS }),
    "$select",
    "unknown select field"
  );
});

// ===========================================================================
// $orderby
// ===========================================================================

test("$orderby: round-trips 'ListPrice desc'", () => {
  const q = parseOdata(
    { "$orderby": "ListPrice desc" },
    { allowedFields: FIELDS }
  );
  assert.deepEqual(q.orderby, [{ field: "ListPrice", direction: "desc" }]);
});

test("$orderby: defaults to asc and supports multiple clauses", () => {
  const q = parseOdata(
    { "$orderby": "City, ListPrice desc" },
    { allowedFields: FIELDS }
  );
  assert.deepEqual(q.orderby, [
    { field: "City", direction: "asc" },
    { field: "ListPrice", direction: "desc" },
  ]);
});

test("$orderby: rejects a bad direction", () => {
  expectInvalid(
    () => parseOdata({ "$orderby": "ListPrice sideways" }, { allowedFields: FIELDS }),
    "$orderby",
    "bad dir"
  );
});

test("$orderby: rejects an unknown field", () => {
  expectInvalid(
    () => parseOdata({ "$orderby": "Bogus desc" }, { allowedFields: FIELDS }),
    "$orderby",
    "unknown orderby field"
  );
});

// ===========================================================================
// $top / $skip / $count
// ===========================================================================

test("$top/$skip: round-trip non-negative integers", () => {
  const q = parseOdata({ "$top": "50", "$skip": "100" }, { allowedFields: FIELDS });
  assert.equal(q.top, 50);
  assert.equal(q.skip, 100);
});

test("$top: clamps to maxTop instead of rejecting", () => {
  const q = parseOdata({ "$top": "9999" }, { allowedFields: FIELDS, maxTop: 200 });
  assert.equal(q.top, 200);
});

test("$top: rejects a negative / non-integer value", () => {
  expectInvalid(() => parseOdata({ "$top": "-5" }), "$top", "negative top");
  expectInvalid(() => parseOdata({ "$top": "1.5" }), "$top", "decimal top");
  expectInvalid(() => parseOdata({ "$top": "abc" }), "$top", "nan top");
});

test("$skip: rejects a negative value", () => {
  expectInvalid(() => parseOdata({ "$skip": "-1" }), "$skip", "negative skip");
});

test("$count=true enables the count flag; absent is false", () => {
  assert.equal(parseOdata({ "$count": "true" }).count, true);
  assert.equal(parseOdata({ "$count": "false" }).count, false);
  assert.equal(parseOdata({}).count, false);
});

test("$count rejects a non-boolean value", () => {
  expectInvalid(() => parseOdata({ "$count": "maybe" }), "$count", "bad count");
});

// ===========================================================================
// Full round-trip across all params + URLSearchParams input
// ===========================================================================

test("parseOdata: full query round-trips via URLSearchParams", () => {
  const sp = new URLSearchParams();
  sp.set("$filter", "City eq 'La Quinta' and ListPrice ge 750000");
  sp.set("$select", "ListingKey,City,ListPrice");
  sp.set("$orderby", "ListPrice desc");
  sp.set("$top", "25");
  sp.set("$skip", "25");
  sp.set("$count", "true");

  const q: OdataQuery = parseOdata(sp, { allowedFields: FIELDS });
  assert.deepEqual(q, {
    filter: [
      { field: "City", operator: "eq", value: "La Quinta" },
      { field: "ListPrice", operator: "ge", value: 750000 },
    ],
    select: ["ListingKey", "City", "ListPrice"],
    orderby: [{ field: "ListPrice", direction: "desc" }],
    top: 25,
    skip: 25,
    count: true,
  });
});

test("parseOdata: without allowedFields, fields are accepted (validated downstream)", () => {
  const q = parseOdata({ "$filter": "AnythingGoes eq 1" });
  assert.equal(q.filter[0].field, "AnythingGoes");
});

// ===========================================================================
// Response envelope (pure builders)
// ===========================================================================

test("buildOkBody: emits value + legacy items alias + meta", () => {
  const body = buildOkBody([{ id: 1 }, { id: 2 }], { top: 50, skip: 0, hasMore: true });
  assert.deepEqual(body.value, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(body.items, body.value); // legacy alias
  assert.deepEqual(body.meta, { top: 50, skip: 0, hasMore: true });
  assert.equal(body["@odata.nextLink"], null);
});

test("buildOkBody: @odata.count present ONLY when count supplied", () => {
  const without = buildOkBody([{ id: 1 }], { top: 50, skip: 0 });
  assert.ok(!("@odata.count" in without), "no count key when absent");

  const withCount = buildOkBody([{ id: 1 }], { top: 50, skip: 0, count: 123 });
  assert.equal(withCount["@odata.count"], 123);
});

test("buildOkBody: hasMore derived from count when not explicit", () => {
  // skip 0 + 2 items, total 5 -> more remain
  const more = buildOkBody([{}, {}], { top: 2, skip: 0, count: 5 });
  assert.equal(more.meta.hasMore, true);
  // skip 4 + 1 item, total 5 -> none remain
  const done = buildOkBody([{}], { top: 2, skip: 4, count: 5 });
  assert.equal(done.meta.hasMore, false);
});

test("buildOkBody: nextLink passes through", () => {
  const body = buildOkBody([], { top: 10, skip: 0, nextLink: "/api/x?$skip=10" });
  assert.equal(body["@odata.nextLink"], "/api/x?$skip=10");
});

test("buildErrorBody: wraps in { error }", () => {
  const body = buildErrorBody({ code: "not_found", message: "nope" });
  assert.deepEqual(body, { error: { code: "not_found", message: "nope" } });
});

test("NO_STORE_HEADERS sets Cache-Control: no-store", () => {
  assert.equal(NO_STORE_HEADERS["Cache-Control"], "no-store");
});

// ===========================================================================
// Error → status mapping
// ===========================================================================

test("mapErrorToResponse: TenantUnavailable -> 503", () => {
  const m = mapErrorToResponse(new TenantUnavailableError());
  assert.equal(m.status, 503);
  assert.equal(m.body.code, "tenant_unavailable");
});

test("mapErrorToResponse: NotFound -> 404", () => {
  const m = mapErrorToResponse(new NotFoundError("Listing not found"));
  assert.equal(m.status, 404);
  assert.equal(m.body.code, "not_found");
  assert.equal(m.body.message, "Listing not found");
});

test("mapErrorToResponse: TenantSuspended -> 403 (tenant_not_active)", () => {
  const m = mapErrorToResponse(new TenantSuspendedError());
  assert.equal(m.status, 403);
  assert.equal(m.body.code, "tenant_not_active");
});

test("mapErrorToResponse: validation -> 400", () => {
  const m = mapErrorToResponse(new ValidationError("bad body", { param: "name" }));
  assert.equal(m.status, 400);
  assert.equal(m.body.code, "validation_failed");
  assert.equal(m.body.param, "name");
});

test("mapErrorToResponse: invalid_odata -> 400 with param", () => {
  const m = mapErrorToResponse(new InvalidOdataError("bad filter", { param: "$filter" }));
  assert.equal(m.status, 400);
  assert.equal(m.body.code, "invalid_odata");
  assert.equal(m.body.param, "$filter");
});

test("mapErrorToResponse: unauthorized -> 401, missing_scope -> 403", () => {
  assert.equal(mapErrorToResponse(new UnauthorizedError()).status, 401);
  assert.equal(mapErrorToResponse(new MissingScopeError()).status, 403);
});

test("mapErrorToResponse: legacy { status, reason } auth shape maps by status", () => {
  const m = mapErrorToResponse({ status: 401, reason: "token_not_found" });
  assert.equal(m.status, 401);
  assert.equal(m.body.code, "unauthorized");
  assert.equal(m.body.message, "token_not_found");
});

test("mapErrorToResponse: a plain coded object is honored", () => {
  const m = mapErrorToResponse({ code: "rate_limited", message: "slow down" });
  assert.equal(m.status, 429);
  assert.equal(m.body.message, "slow down");
});

test("mapErrorToResponse: unknown throwable -> 500, message NOT leaked", () => {
  const m = mapErrorToResponse(new Error("secret connection string here"));
  assert.equal(m.status, 500);
  assert.equal(m.body.code, "internal_error");
  assert.equal(m.body.message, "Internal server error");
});

test("statusForCode: covers the documented mapping", () => {
  assert.equal(statusForCode("invalid_odata"), 400);
  assert.equal(statusForCode("not_found"), 404);
  assert.equal(statusForCode("tenant_not_active"), 403);
  assert.equal(statusForCode("tenant_unavailable"), 503);
  assert.equal(statusForCode("unauthorized"), 401);
  assert.equal(statusForCode("missing_scope"), 403);
  assert.equal(statusForCode("rate_limited"), 429);
  assert.equal(statusForCode("internal_error"), 500);
});
