import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildTenantListingFilter } from "../tenant-listing-filter";

describe("buildTenantListingFilter", () => {
  it("maps city/price/beds/baths and defaults status + propertyType", () => {
    const f = buildTenantListingFilter(
      new URLSearchParams("city=La Quinta&minPrice=500000&maxPrice=900000&minBeds=3&maxBaths=2"),
    );
    assert.equal(f.city, "La Quinta");
    assert.equal(f.status, "Active");
    assert.equal(f.propertyType, "A");
    assert.deepEqual(f.price, { min: 500000, max: 900000 });
    assert.deepEqual(f.beds, { min: 3, max: undefined });
    assert.deepEqual(f.baths, { min: undefined, max: 2 });
  });

  it("omits ranges entirely when no bounds are given", () => {
    const f = buildTenantListingFilter(new URLSearchParams("city=Palm Desert"));
    assert.equal(f.price, undefined);
    assert.equal(f.beds, undefined);
    assert.equal(f.yearBuilt, undefined);
    assert.equal(f.hasPool, undefined);
  });

  it("parses hasPool true / false / absent", () => {
    assert.equal(buildTenantListingFilter(new URLSearchParams("hasPool=true")).hasPool, true);
    assert.equal(buildTenantListingFilter(new URLSearchParams("hasPool=no")).hasPool, false);
    assert.equal(buildTenantListingFilter(new URLSearchParams("")).hasPool, undefined);
  });

  it("turns maxDaysOnMarket into an onMarketDate.min lower bound (recent listings)", () => {
    const f = buildTenantListingFilter(new URLSearchParams("maxDaysOnMarket=7"));
    assert.ok(f.onMarketDate?.min, "min should be set");
    assert.equal(f.onMarketDate?.max, undefined);
    assert.ok(!Number.isNaN(Date.parse(f.onMarketDate!.min!)), "min is a valid ISO date");
  });

  it("honors explicit status + propertyType overrides", () => {
    const f = buildTenantListingFilter(new URLSearchParams("status=Closed&propertyType=B"));
    assert.equal(f.status, "Closed");
    assert.equal(f.propertyType, "B");
  });
});
