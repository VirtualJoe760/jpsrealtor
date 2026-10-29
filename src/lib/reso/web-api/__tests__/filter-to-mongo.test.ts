// Unit tests for the RESO $filter → Mongo translator. Pure logic, no DB:
//
//   npx tsx --conditions=import --test src/lib/reso/web-api/__tests__/filter-to-mongo.test.ts
//
// `--conditions=import` is required: @reso-standards/odata-expression-parser is
// ESM-only (its exports map has only an "import" condition) and tsx loads this
// repo's .ts as CommonJS, so without it the require fails with
// ERR_PACKAGE_PATH_NOT_EXPORTED. Next's bundler resolves it fine.

import { test } from "node:test";
import assert from "node:assert/strict";

import { filterToMongo } from "@/lib/reso/web-api/filter-to-mongo";
import { PROPERTY_FIELDS, LOOKUP_FIELDS, fieldMap } from "@/lib/reso/web-api/fields";
import { matches } from "@/lib/reso/web-api/match";
import { ResoError } from "@/lib/reso/web-api/errors";

const P = fieldMap(PROPERTY_FIELDS);
const t = (f: string) => filterToMongo(f, P);

const status = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ResoError ? e.status : -1;
  }
  return 0;
};

test("integer comparisons map to the stored source field", () => {
  assert.deepEqual(t("BedroomsTotal eq 3"), { bedsTotal: 3 });
  assert.deepEqual(t("BedroomsTotal gt 3"), { bedsTotal: { $gt: 3 } });
  assert.deepEqual(t("BedroomsTotal le 3"), { bedsTotal: { $lte: 3 } });
});

test("ne excludes nulls (SQL three-valued logic)", () => {
  assert.deepEqual(t("ListPrice ne 5"), { listPrice: { $nin: [5, null] } });
});

test("and / or / not", () => {
  assert.deepEqual(t("BedroomsTotal gt 1 and BedroomsTotal lt 5"), {
    $and: [{ bedsTotal: { $gt: 1 } }, { bedsTotal: { $lt: 5 } }],
  });
  assert.deepEqual(t("BedroomsTotal eq 1 or BedroomsTotal eq 5"), { $or: [{ bedsTotal: 1 }, { bedsTotal: 5 }] });
  assert.deepEqual(t("not (BedroomsTotal le -1)"), { $nor: [{ bedsTotal: { $lte: -1 } }] });
});

test("value op Field is flipped", () => {
  assert.deepEqual(t("3 lt BedroomsTotal"), { bedsTotal: { $gt: 3 } });
});

test("Edm.Date compares whole days over date-prefixed strings", () => {
  assert.deepEqual(t("OnMarketDate eq 2020-01-31"), { onMarketDate: { $gte: "2020-01-31", $lt: "2020-02-01" } });
  assert.deepEqual(t("OnMarketDate gt 2020-12-31"), { onMarketDate: { $gte: "2021-01-01" } });
  assert.deepEqual(t("ListingContractDate le 2020-02-28"), { listingContractDate: { $lt: "2020-02-29" } });
});

test("DateTimeOffset literals normalize to the stored whole-second UTC form", () => {
  assert.deepEqual(t("ModificationTimestamp ge 2026-01-01T10:00:00-07:00"), {
    modificationTimestamp: { $gte: "2026-01-01T17:00:00Z" },
  });
  // A fraction can't equal a stored whole second; bounds round correctly.
  assert.deepEqual(t("ModificationTimestamp gt 2026-01-01T10:00:00.5Z"), {
    modificationTimestamp: { $gt: "2026-01-01T10:00:00Z" },
  });
  assert.deepEqual(t("ModificationTimestamp le 2026-01-01T10:00:00.5Z"), {
    modificationTimestamp: { $lte: "2026-01-01T10:00:00Z" },
  });
});

test("now() becomes the current whole-second bound", () => {
  const q = t("ModificationTimestamp lt now()") as { modificationTimestamp: { $lt?: string; $lte?: string } };
  const bound = q.modificationTimestamp.$lt ?? q.modificationTimestamp.$lte!;
  assert.match(bound, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
});

test("string enumeration: eq, in, and namespaced enum literals", () => {
  assert.deepEqual(t("StandardStatus eq 'Active'"), { standardStatus: "Active" });
  assert.deepEqual(t("StandardStatus in ('Active','Pending')"), { standardStatus: { $in: ["Active", "Pending"] } });
  assert.deepEqual(t("StandardStatus eq org.reso.metadata.enums.StandardStatus'Active'"), { standardStatus: "Active" });
});

test("string functions are case-sensitive regexes with escaping", () => {
  assert.deepEqual(t("contains(City,'Palm.')"), { city: { $regex: "Palm\\." } });
  assert.deepEqual(t("startswith(City,'Palm')"), { city: { $regex: "^Palm" } });
});

test("null comparisons", () => {
  assert.deepEqual(t("YearBuilt eq null"), { yearBuilt: null });
  assert.deepEqual(t("YearBuilt ne null"), { yearBuilt: { $ne: null } });
});

test("bad input is a 400, unsupported constructs a 501", () => {
  assert.equal(status(() => t("BedroomsTotal eq")), 400);
  assert.equal(status(() => t("NoSuchField eq 1")), 400);
  assert.equal(status(() => t("BedroomsTotal eq 'three'")), 400);
  assert.equal(status(() => t("ListingContractDate eq 2020-01-01T00:00:00Z")), 400);
  assert.equal(status(() => t("tolower(City) eq 'x'")), 501);
});

test("Lookup rows filter in memory with the same semantics", () => {
  const L = fieldMap(LOOKUP_FIELDS);
  const rows = [
    { LookupKey: "StandardStatus:Active", LookupName: "StandardStatus", LookupValue: "Active" },
    { LookupKey: "PropertyType:Land", LookupName: "PropertyType", LookupValue: "Land" },
  ];
  const q = filterToMongo("LookupName eq 'StandardStatus'", L);
  assert.deepEqual(rows.filter((r) => matches(r, q)).map((r) => r.LookupKey), ["StandardStatus:Active"]);
  const ne = filterToMongo("LookupName ne 'StandardStatus'", L);
  assert.deepEqual(rows.filter((r) => matches(r, ne)).map((r) => r.LookupKey), ["PropertyType:Land"]);
});
