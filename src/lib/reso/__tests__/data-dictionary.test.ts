// src/lib/reso/__tests__/data-dictionary.test.ts
//
// Agent 03 — catalog invariants. Node built-in runner only (no vitest/jest):
//   npx tsx --test src/lib/reso/__tests__/data-dictionary.test.ts
//
// Pure-logic tests (build_plan §3.6): no DB, no network.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESOURCES,
  RESOURCE_NAMES,
  DATA_DICTIONARY_VERSION,
  getResource,
  getField,
  getFields,
  getRequiredFields,
  getIndexedFields,
  resoNameToFieldName,
  fieldNameToColumn,
  type ResoResource,
} from "../data-dictionary";

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/;
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

test("RESOURCES exports Property, Member, Office, Media", () => {
  assert.deepEqual([...RESOURCE_NAMES].sort(), ["Media", "Member", "Office", "Property"]);
  for (const r of RESOURCE_NAMES) {
    assert.ok(RESOURCES[r], `missing resource ${r}`);
    assert.equal(RESOURCES[r].resource, r);
    assert.ok(RESOURCES[r].fields.length > 0, `${r} has no fields`);
  }
});

test("DATA_DICTIONARY_VERSION is a non-empty string", () => {
  assert.equal(typeof DATA_DICTIONARY_VERSION, "string");
  assert.ok(DATA_DICTIONARY_VERSION.length > 0);
});

test("no duplicate field names per resource", () => {
  for (const r of RESOURCE_NAMES) {
    const names = getFields(r).map((f) => f.name);
    assert.equal(new Set(names).size, names.length, `duplicate field name in ${r}`);
  }
});

test("no duplicate pgColumn per resource", () => {
  for (const r of RESOURCE_NAMES) {
    const cols = getFields(r).map((f) => f.pgColumn);
    assert.equal(new Set(cols).size, cols.length, `duplicate pgColumn in ${r}`);
  }
});

test("every resoName is PascalCase", () => {
  for (const r of RESOURCE_NAMES) {
    for (const f of getFields(r)) {
      assert.match(
        f.resoName,
        PASCAL_CASE,
        `${r}.${f.name} resoName "${f.resoName}" is not PascalCase`,
      );
    }
  }
});

test("every field name is camelCase", () => {
  for (const r of RESOURCE_NAMES) {
    for (const f of getFields(r)) {
      assert.match(f.name, CAMEL_CASE, `${r}.${f.name} is not camelCase`);
    }
  }
});

test("every pgColumn is snake_case", () => {
  for (const r of RESOURCE_NAMES) {
    for (const f of getFields(r)) {
      assert.match(f.pgColumn, SNAKE_CASE, `${r}.${f.name} pgColumn "${f.pgColumn}" is not snake_case`);
    }
  }
});

test("getField resolves by name, resoName, and pgColumn", () => {
  const byName = getField("Property", "listingKey");
  assert.ok(byName, "getField by name failed");
  assert.equal(byName!.resoName, "ListingKey");
  assert.equal(byName!.pgColumn, "listing_key");

  const byReso = getField("Property", "ListingKey");
  assert.ok(byReso, "getField by resoName failed");
  assert.equal(byReso!.name, "listingKey");

  const byColumn = getField("Property", "listing_key");
  assert.ok(byColumn, "getField by pgColumn failed");
  assert.equal(byColumn!.name, "listingKey");
});

test("getField returns undefined for unknown field", () => {
  assert.equal(getField("Property", "definitelyNotAField"), undefined);
});

test("getResource resolves each resource and primaryKey is a real field", () => {
  for (const r of RESOURCE_NAMES) {
    const def = getResource(r);
    assert.ok(def, `getResource(${r}) failed`);
    const pk = getField(r, def!.primaryKey);
    assert.ok(pk, `${r} primaryKey ${def!.primaryKey} is not a field`);
    assert.equal(pk!.nullable, false, `${r} primaryKey must be NOT NULL`);
    assert.equal(pk!.indexed, true, `${r} primaryKey must be indexed`);
  }
});

test("enum fields carry enumValues; non-enum fields do not", () => {
  for (const r of RESOURCE_NAMES) {
    for (const f of getFields(r)) {
      if (f.type === "enum") {
        assert.ok(f.enumValues && f.enumValues.length > 0, `${r}.${f.name} enum has no enumValues`);
      } else {
        assert.equal(f.enumValues, undefined, `${r}.${f.name} (${f.type}) should not carry enumValues`);
      }
    }
  }
});

test("standardStatus is the canonical enum example", () => {
  const f = getField("Property", "standardStatus");
  assert.ok(f);
  assert.equal(f!.type, "enum");
  assert.ok(f!.enumValues!.includes("Active"));
  assert.ok(f!.enumValues!.includes("Closed"));
});

// --- Attribution invariant (build_plan §3.8) ---

test("listing-attribution fields are REQUIRED on Property", () => {
  const required = getRequiredFields("Property").map((f) => f.name);
  for (const name of [
    "listAgentName",
    "listOfficeName",
    "listAgentPreferredPhone",
    "listOfficePhone",
  ]) {
    assert.ok(required.includes(name), `attribution field ${name} must be required (§3.8)`);
  }
});

test("listAgentName comes from ListAgentFullName and listOfficeName from ListOfficeName", () => {
  const agent = getField("Property", "listAgentName");
  const office = getField("Property", "listOfficeName");
  assert.equal(agent!.resoName, "ListAgentFullName");
  assert.equal(office!.resoName, "ListOfficeName");
  // Attribution names/offices are NOT NULL — structurally impossible to drop.
  assert.equal(agent!.nullable, false);
  assert.equal(office!.nullable, false);
});

// --- Convenience helpers ---

test("resoNameToFieldName and fieldNameToColumn round-trip", () => {
  assert.equal(resoNameToFieldName("Property", "BedroomsTotal"), "bedroomsTotal");
  assert.equal(fieldNameToColumn("Property", "bedroomsTotal"), "bedrooms_total");
  assert.equal(resoNameToFieldName("Property", "PoolPrivateYN"), "poolYN");
  assert.equal(fieldNameToColumn("Property", "poolYN"), "pool_yn");
});

test("getIndexedFields includes the primary key and city for Property", () => {
  const indexed = getIndexedFields("Property").map((f) => f.name);
  assert.ok(indexed.includes("listingKey"));
  assert.ok(indexed.includes("city"));
});

test("helpers are defensive for unknown resource", () => {
  const bogus = "Nope" as unknown as ResoResource;
  assert.equal(getResource(bogus), undefined);
  assert.equal(getField(bogus, "x"), undefined);
  assert.deepEqual(getFields(bogus), []);
});
