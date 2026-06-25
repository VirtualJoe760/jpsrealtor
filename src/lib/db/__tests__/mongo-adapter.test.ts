// src/lib/db/__tests__/mongo-adapter.test.ts
//
// Agent 02 contract test — the Mongo adapter reproduces TODAY'S exact Mongo
// query objects. NO live DB: the assertions compare the adapter's emitted
// filter against a hand-built reference query (the exact object today's
// `/api/skill/listings/search` + `/api/skill/contacts/search` routes hand the
// driver). A fake in-memory collection covers the read/DTO path.
//
// Run: npx tsx --test src/lib/db/__tests__/mongo-adapter.test.ts
//
// Uses the Node built-in runner ONLY (node:test + node:assert/strict) — the
// repo has no jest/vitest and we must not edit package.json.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildListingMongoQuery,
  buildContactMongoQuery,
  createMongoAdapter,
  type MongoConnLike,
  type MongoCollectionLike,
  type MongoCursorLike,
} from "../mongo-adapter";
import type { ListingFilter } from "../adapter";

// =============================================================================
// 1. Listing query reproduction — 3 sample ListingFilter inputs
// =============================================================================
//
// Each reference object is the EXACT shape the search route builds, in the same
// key order, so a structural `deepEqual` proves byte-for-byte parity.

// ---- Sample A: city + price range + beds + default status -------------------
test("listing query — city + price + beds (dual-column $or, default Active status)", () => {
  const filter: ListingFilter = {
    city: "Palm Desert",
    price: { min: 500000, max: 1500000 },
    beds: { min: 3 },
  };

  // Hand-built reference == what the route emits:
  //   { standardStatus:"Active", city, listPrice:{$gte,$lte},
  //     $and:[ { $or:[{bedroomsTotal},{bedsTotal}] } ] }
  const expected = {
    standardStatus: "Active",
    city: "Palm Desert",
    listPrice: { $gte: 500000, $lte: 1500000 },
    $and: [{ $or: [{ bedroomsTotal: { $gte: 3 } }, { bedsTotal: { $gte: 3 } }] }],
  };

  assert.deepEqual(buildListingMongoQuery(filter), expected);
});

// ---- Sample B: the onMarketDate string-vs-Date native bypass ----------------
test("listing query — onMarketDate LEXICAL string range (native .collection bypass)", () => {
  // A real ISO-8601 string cutoff — must be carried VERBATIM (never cast to a
  // Date). This is the whole reason the read uses the native collection.
  const isoMin = "2026-06-22T00:00:00.000Z";
  const isoMax = "2026-06-24T00:00:00.000Z";

  const filter: ListingFilter = {
    subdivision: "Ironwood Country Club",
    propertyType: "A",
    status: "Active",
    onMarketDate: { min: isoMin, max: isoMax },
    hasPool: true,
  };

  const expected = {
    standardStatus: "Active",
    subdivisionName: "Ironwood Country Club",
    propertyType: "A",
    onMarketDate: { $gte: isoMin, $lte: isoMax },
    $and: [{ poolFeatures: { $exists: true, $nin: [null, "", "None", "none"] } }],
  };

  const built = buildListingMongoQuery(filter);
  assert.deepEqual(built, expected);

  // The range values are STRINGS, not Dates — guard against any accidental cast.
  const gte: unknown = built.onMarketDate.$gte;
  const lte: unknown = built.onMarketDate.$lte;
  assert.equal(typeof gte, "string");
  assert.equal(typeof lte, "string");
  assert.ok(!(gte instanceof Date));
});

// ---- Sample C: bbox + baths + yearBuilt + hasPool:false ---------------------
test("listing query — bbox + baths + yearBuilt + hasPool:false", () => {
  const filter: ListingFilter = {
    status: "Active",
    yearBuilt: { min: 1950, max: 1969 },
    baths: { max: 4 },
    hasPool: false,
    bbox: { minLat: 33.6, maxLat: 33.8, minLng: -116.4, maxLng: -116.2 },
  };

  const expected = {
    standardStatus: "Active",
    yearBuilt: { $gte: 1950, $lte: 1969 },
    latitude: { $gte: 33.6, $lte: 33.8 },
    longitude: { $gte: -116.4, $lte: -116.2 },
    $and: [
      { $or: [{ bathroomsTotalInteger: { $lte: 4 } }, { bathsTotal: { $lte: 4 } }] },
      {
        $or: [
          { poolFeatures: { $exists: false } },
          { poolFeatures: { $in: [null, "", "None", "none"] } },
        ],
      },
    ],
  };

  assert.deepEqual(buildListingMongoQuery(filter), expected);
});

// ---- propertyType wildcard skip + extras exact-match ------------------------
test("listing query — propertyType 'all' is skipped; extras become exact-match predicates", () => {
  const built = buildListingMongoQuery({
    status: "Active",
    propertyType: "all",
    extras: { hasCasita: true, viewType: "mountain" },
  });
  assert.equal(built.propertyType, undefined); // wildcard → no clause
  assert.equal(built.hasCasita, true);
  assert.equal(built.viewType, "mountain");
  assert.equal(built.standardStatus, "Active");
});

// =============================================================================
// 2. Contact query reproduction — userId:ownerId scoping + $or regex
// =============================================================================

test("contact query — userId:ownerId scoping + case-insensitive $or regex + status/tag", () => {
  const built = buildContactMongoQuery({
    ownerId: "user-abc-123",
    q: "smith",
    status: "qualified",
    tag: "buyer",
  });

  // userId is the FIRST key (legacy single-tenant scoping seed).
  assert.deepEqual(Object.keys(built), ["userId", "$or", "status", "tags"]);
  assert.equal(built.userId, "user-abc-123");
  assert.equal(built.status, "qualified");
  assert.equal(built.tags, "buyer");

  // $or covers the exact field set the route searches, in order.
  const orFields = (built.$or as Array<Record<string, unknown>>).map((c) => Object.keys(c)[0]);
  assert.deepEqual(orFields, [
    "firstName",
    "lastName",
    "organization",
    "emails.address",
    "phones.number",
    "phone",
    "email",
  ]);

  // Each clause is a case-insensitive regex on the escaped query.
  for (const clause of built.$or as Array<Record<string, RegExp>>) {
    const re = Object.values(clause)[0];
    assert.ok(re instanceof RegExp);
    assert.ok(re.flags.includes("i"));
    assert.equal(re.source, "smith");
  }
});

test("contact query — regex metacharacters in q are escaped", () => {
  const built = buildContactMongoQuery({ ownerId: "u1", q: "a.b*c" });
  const re = (built.$or as Array<Record<string, RegExp>>)[0].firstName;
  assert.equal(re.source, "a\\.b\\*c");
});

test("contact query — no ownerId => no userId scoping key", () => {
  const built = buildContactMongoQuery({ q: "jones" });
  assert.equal("userId" in built, false);
});

// =============================================================================
// 3. Adapter read path — fake in-memory collection (no live DB)
// =============================================================================
//
// A tiny stub that records the filter/sort/skip/limit it was handed and returns
// canned rows, proving: (a) the adapter routes through native collection
// handles, (b) it maps rows via Agent 01's toListingDTO/toContactDTO, (c) the
// dialect + unsupported-raw-SQL contract holds.

function fakeCursor<T>(rows: T[], rec: Record<string, unknown>): MongoCursorLike<T> {
  const cursor: MongoCursorLike<T> = {
    sort(spec) {
      rec.sort = spec;
      return cursor;
    },
    skip(n) {
      rec.skip = n;
      return cursor;
    },
    limit(n) {
      rec.limit = n;
      return cursor;
    },
    project(spec) {
      rec.project = spec;
      return cursor;
    },
    async toArray() {
      return rows;
    },
  };
  return cursor;
}

function fakeConn(
  rowsByCollection: Record<string, Record<string, unknown>[]>,
  calls: Record<string, unknown>[]
): MongoConnLike {
  return {
    collection<T = Record<string, unknown>>(name: string): MongoCollectionLike<T> {
      const rows = (rowsByCollection[name] ?? []) as unknown as T[];
      return {
        find(filter) {
          const rec: Record<string, unknown> = { op: "find", name, filter };
          calls.push(rec);
          return fakeCursor(rows, rec);
        },
        async findOne(filter) {
          calls.push({ op: "findOne", name, filter });
          return (rows[0] ?? null) as T | null;
        },
        async countDocuments(filter) {
          calls.push({ op: "countDocuments", name, filter });
          return rows.length;
        },
      };
    },
  };
}

test("adapter.listings.find — uses native collection, maps to DTO, derives hasMore", async () => {
  const listingRow = {
    listingKey: "GPS-1",
    unparsedAddress: "1 Fairway Dr",
    city: "Indian Wells",
    listPrice: 950000,
    bedroomsTotal: 3,
    bathroomsTotalInteger: 4,
    listAgentName: "Jane Agent",
    listOfficeName: "Desert Realty",
  };
  const calls: Record<string, unknown>[] = [];
  const conn = fakeConn({ unified_listings: [listingRow] }, calls);
  const adapter = createMongoAdapter(conn);

  const page = await adapter.listings.find(
    { city: "Indian Wells", status: "Active" },
    { limit: 20 }
  );

  // Routed through the native listings collection with the built query.
  const findCall = calls.find((c) => c.op === "find");
  assert.ok(findCall);
  assert.equal(findCall!.name, "unified_listings");
  assert.deepEqual(findCall!.filter, {
    standardStatus: "Active",
    city: "Indian Wells",
  });

  // Row collapsed via Agent 01's mapper — attribution invariant carried.
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].listingKey, "GPS-1");
  assert.equal(page.items[0].beds, 3);
  assert.equal(page.items[0].baths, 4);
  assert.equal(page.items[0].listAgentName, "Jane Agent");
  assert.equal(page.items[0].listOfficeName, "Desert Realty");
  assert.equal(page.hasMore, false);
  assert.equal(page.total, 0 + 1); // exact total when result fits one page
});

test("adapter.contacts.find — owner-scoped query + ContactDTO mapping", async () => {
  const contactRow = {
    _id: "c1",
    firstName: "Sam",
    lastName: "Buyer",
    phones: [{ number: "+17601112222", isPrimary: true }],
    emails: [{ address: "sam@example.com", isPrimary: true }],
    status: "qualified",
  };
  const calls: Record<string, unknown>[] = [];
  const conn = fakeConn({ contacts: [contactRow] }, calls);
  const adapter = createMongoAdapter(conn, { ownerId: "owner-9" });

  const page = await adapter.contacts.find("buyer");

  const findCall = calls.find((c) => c.op === "find");
  assert.ok(findCall);
  assert.equal(findCall!.name, "contacts");
  // userId scoping present on the contact find.
  assert.equal((findCall!.filter as Record<string, unknown>).userId, "owner-9");

  assert.equal(page.items[0].id, "c1");
  assert.equal(page.items[0].name, "Sam Buyer");
  assert.equal(page.items[0].primaryPhone, "+17601112222");
  assert.equal(page.items[0].primaryEmail, "sam@example.com");
});

test("adapter — dialect is mongo and raw SQL query() is unsupported", async () => {
  const adapter = createMongoAdapter(fakeConn({}, []));
  assert.equal(adapter.dialect, "mongo");
  await assert.rejects(() => adapter.query("SELECT 1"), /unsupported/);
  // close() is a no-op (connection lifecycle owned by the resolver).
  await adapter.close();
});

test("adapter.listings.get — single read by listingKey maps to DTO or null", async () => {
  const calls: Record<string, unknown>[] = [];
  const conn = fakeConn(
    { unified_listings: [{ listingKey: "K9", listAgentName: "A", listOfficeName: "O" }] },
    calls
  );
  const adapter = createMongoAdapter(conn);

  const dto = await adapter.listings.get("K9");
  assert.ok(dto);
  assert.equal(dto!.listingKey, "K9");

  const findOneCall = calls.find((c) => c.op === "findOne");
  assert.deepEqual(findOneCall!.filter, { listingKey: "K9" });
});
