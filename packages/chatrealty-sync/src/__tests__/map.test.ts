// packages/chatrealty-sync/src/__tests__/map.test.ts
//
// Spec 8 — pure unit tests for mapResoProperty. No DB, no network.
// Proves a representative RESO Property record maps to the right snake_case
// columns INCLUDING the §3.8 attribution block.

import { test } from "node:test";
import assert from "node:assert/strict";

import { mapResoProperty, mappedPropertyColumns } from "../map";

/** A representative RESO Property record (PascalCase, as off the RESO wire). */
const SAMPLE: Record<string, unknown> = {
  ListingKey: "GPS-12345",
  ListingId: "219100001",
  OriginatingSystemName: "GPS",
  OriginatingSystemID: "20190211172710340762000000",
  PropertyType: "A",
  PropertySubType: "SingleFamilyResidence",
  StandardStatus: "Active",
  ListPrice: 750000,
  OriginalListPrice: 799000,
  BedroomsTotal: 3,
  BathroomsTotalInteger: 2,
  LivingArea: 1850,
  YearBuilt: 2004,
  PoolPrivateYN: "Y",
  SpaYN: false,
  ViewYN: true,
  City: "Palm Desert",
  SubdivisionName: "Palm Desert Country Club",
  StateOrProvince: "CA",
  PostalCode: "92260",
  CountyOrParish: "Riverside",
  Latitude: 33.7,
  Longitude: -116.4,
  UnparsedAddress: "123 Fairway Dr, Palm Desert, CA 92260",
  StreetNumber: "123",
  StreetName: "Fairway Dr",
  OnMarketDate: "2026-06-01T00:00:00Z",
  ModificationTimestamp: "2026-06-20T15:30:00Z",
  PublicRemarks: "Lovely home.",
  // --- ATTRIBUTION sources (§3.8) ---
  ListAgentFullName: "Joseph Sardella",
  ListAgentMlsId: "AGT-001",
  ListAgentPreferredPhone: "760-555-0100",
  ListOfficeName: "ChatRealty / eXp",
  ListOfficeMlsId: "OFF-001",
  ListOfficePhone: "760-555-0200",
  // --- an unmapped field that should fall into extras ---
  CoolingYN: true,
  AssociationFee: 350,
};

test("maps core RESO fields to their snake_case columns", () => {
  const row = mapResoProperty(SAMPLE);
  assert.ok(row, "row should not be null");
  assert.equal(row!.listing_key, "GPS-12345");
  assert.equal(row!.listing_id, "219100001");
  assert.equal(row!.mls_source, "GPS");
  assert.equal(row!.mls_id, "20190211172710340762000000");
  assert.equal(row!.property_type, "A");
  assert.equal(row!.standard_status, "Active");
  assert.equal(row!.list_price, 750000);
  assert.equal(row!.bedrooms_total, 3);
  assert.equal(row!.bathrooms_total_integer, 2);
  assert.equal(row!.year_built, 2004);
  assert.equal(row!.city, "Palm Desert");
  assert.equal(row!.subdivision_name, "Palm Desert Country Club");
  assert.equal(row!.postal_code, "92260");
});

test("ATTRIBUTION (§3.8): agent + office name/phone/mls-id map correctly", () => {
  const row = mapResoProperty(SAMPLE)!;
  assert.equal(row.list_agent_name, "Joseph Sardella");
  assert.equal(row.list_office_name, "ChatRealty / eXp");
  assert.equal(row.list_agent_preferred_phone, "760-555-0100");
  assert.equal(row.list_office_phone, "760-555-0200");
  assert.equal(row.list_agent_mls_id, "AGT-001");
  assert.equal(row.list_office_mls_id, "OFF-001");
});

test("ATTRIBUTION: NOT-NULL names never come back null even if feed omits them", () => {
  const noAttrib = { ...SAMPLE };
  delete noAttrib.ListAgentFullName;
  delete noAttrib.ListOfficeName;
  const row = mapResoProperty(noAttrib)!;
  assert.ok(row.list_agent_name, "list_agent_name must be non-null");
  assert.ok(row.list_office_name, "list_office_name must be non-null");
  assert.equal(typeof row.list_agent_name, "string");
});

test("hand-mapped quirks: PoolPrivateYN -> pool_yn boolean; Y coerces to true", () => {
  const row = mapResoProperty(SAMPLE)!;
  assert.equal(row.pool_yn, true);
  assert.equal(row.spa_yn, false);
  assert.equal(row.view_yn, true);
});

test("derives a GeoJSON Point geom from longitude/latitude", () => {
  const row = mapResoProperty(SAMPLE)!;
  assert.equal(typeof row.geom, "string");
  const geo = JSON.parse(row.geom as string);
  assert.equal(geo.type, "Point");
  assert.deepEqual(geo.coordinates, [-116.4, 33.7]);
});

test("missing coordinates yield a null geom (no crash)", () => {
  const noGeo = { ...SAMPLE };
  delete noGeo.Latitude;
  delete noGeo.Longitude;
  const row = mapResoProperty(noGeo)!;
  assert.equal(row.geom, null);
});

test("dates coerce to ISO-8601 strings", () => {
  const row = mapResoProperty(SAMPLE)!;
  assert.equal(row.on_market_date, "2026-06-01T00:00:00.000Z");
  assert.equal(row.modification_timestamp, "2026-06-20T15:30:00.000Z");
});

test("unmapped fields fall into extras; mapped ones do not", () => {
  const row = mapResoProperty(SAMPLE)!;
  const extras = row.extras as Record<string, unknown>;
  assert.ok(extras, "extras should be populated");
  assert.equal(extras.CoolingYN, true);
  assert.equal(extras.AssociationFee, 350);
  // A core mapped field must NOT leak into extras.
  assert.equal(extras.ListPrice, undefined);
  assert.equal(extras.City, undefined);
});

test("retains the raw payload in the raw column", () => {
  const row = mapResoProperty(SAMPLE)!;
  assert.deepEqual(row.raw, SAMPLE);
});

test("derives a slug when the feed omits one", () => {
  const row = mapResoProperty(SAMPLE)!;
  assert.equal(typeof row.slug, "string");
  assert.ok((row.slug as string).length > 0);
  assert.ok((row.slug as string).includes("palm-desert"));
});

test("returns null for a record with no ListingKey", () => {
  const keyless = { ...SAMPLE };
  delete keyless.ListingKey;
  assert.equal(mapResoProperty(keyless), null);
});

test("optional Claude-derived subdivision fills gaps + stamps provenance", () => {
  const noSub = { ...SAMPLE };
  delete noSub.SubdivisionName;
  const row = mapResoProperty(noSub, {
    derivedSubdivision: { subdivisionName: "Indian Wells CC", source: "derived" },
  })!;
  assert.equal(row.subdivision_name, "Indian Wells CC");
  assert.equal((row.extras as Record<string, unknown>).subdivisionSource, "derived");
});

test("derived subdivision does NOT override an authoritative MLS value", () => {
  const row = mapResoProperty(SAMPLE, {
    derivedSubdivision: { subdivisionName: "Wrong Place", source: "derived" },
  })!;
  assert.equal(row.subdivision_name, "Palm Desert Country Club");
});

test("mappedPropertyColumns includes attribution + jsonb + geom columns", () => {
  const cols = mappedPropertyColumns();
  for (const c of [
    "listing_key",
    "list_agent_name",
    "list_office_name",
    "geom",
    "extras",
    "raw",
  ]) {
    assert.ok(cols.includes(c), `expected column ${c}`);
  }
});
