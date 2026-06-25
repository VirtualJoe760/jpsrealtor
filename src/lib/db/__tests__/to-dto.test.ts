// src/lib/db/__tests__/to-dto.test.ts
//
// Agent 01 contract tests for the DTO mappers.
//
// Asserts:
//   1. The dual-column collapses (beds, baths) pick the right source.
//   2. The pool collapse handles poolYN / poolYn / pool / poolFeatures.
//   3. The photo-URL fallback chain resolves + the optimized thumb is derived.
//   4. THE ATTRIBUTION INVARIANT (build_plan §3.8): every mapped listing carries
//      `listAgentName` + `listOfficeName` — a DTO without them FAILS the test.
//   5. `toContactDTO` collapses primary phone/email + full-name fallback.
//
// The repo has no test runner wired up (no jest/vitest in package.json, and we
// must not edit package.json or run npm install). So this file is written to
// EITHER run under a future Jest/Vitest (standard describe/it/expect) OR stand
// alone via `npx tsx src/lib/db/__tests__/to-dto.test.ts` — a tiny built-in
// harness backfills the globals only when a real runner isn't present.

import { toListingDTO, toContactDTO } from "../to-dto";
import type { ListingDTO } from "../adapter";

// -----------------------------------------------------------------------------
// Minimal test harness (no-op when a real runner provides these globals)
// -----------------------------------------------------------------------------

type Fn = () => void | Promise<void>;

// Typed matcher surface used by these tests. When a real runner (jest/vitest)
// is present these resolve to its globals; otherwise the harness below backfills
// them. Declared (not imported) so the file type-checks with no runner types
// installed — the repo has no @types/jest and we must not add it.
interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toContain(sub: string): void;
  toHaveProperty(key: string): void;
}
declare function describe(name: string, fn: Fn): void;
declare function it(name: string, fn: Fn): void;
declare function expect(actual: unknown): Matchers;

const g = globalThis as any;
const HAS_RUNNER = typeof g.it === "function" && typeof g.expect === "function";

const queue: Array<{ name: string; fn: Fn }> = [];
let failures = 0;

if (!HAS_RUNNER) {
  g.describe = (_name: string, fn: Fn) => {
    void fn();
  };
  g.it = (name: string, fn: Fn) => {
    queue.push({ name, fn });
  };
  g.test = g.it;
  g.expect = (actual: unknown) => ({
    toBe(expected: unknown) {
      if (!Object.is(actual, expected)) {
        throw new Error(`expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) throw new Error(`expected ${a} to equal ${b}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`expected ${JSON.stringify(actual)} to be null`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`expected ${JSON.stringify(actual)} to be truthy`);
    },
    toContain(sub: string) {
      if (typeof actual !== "string" || !actual.includes(sub)) {
        throw new Error(`expected ${JSON.stringify(actual)} to contain ${JSON.stringify(sub)}`);
      }
    },
    toHaveProperty(key: string) {
      if (!(actual as any) || !Object.prototype.hasOwnProperty.call(actual, key)) {
        throw new Error(`expected object to have property ${key}`);
      }
    },
  });
}

// -----------------------------------------------------------------------------
// Fixtures — three representative listing rows (Mongo lean, Postgres-ish, sparse)
// -----------------------------------------------------------------------------

/** A lean Mongo doc with the RESO-cased YN fields + nested media. */
const rowMongoLean: Record<string, any> = {
  listingKey: "GPS-219123456",
  unparsedAddress: "73-111 El Paseo, Palm Desert, CA 92260",
  city: "Palm Desert",
  subdivisionName: "Ironwood Country Club",
  propertyTypeLabel: "Residential",
  standardStatus: "Active",
  listPrice: 1295000,
  bedroomsTotal: 4,
  bathroomsTotalInteger: 5,
  livingArea: 3200,
  yearBuilt: 1998,
  poolYN: true,
  daysOnMarket: 12,
  onMarketDate: "2026-06-12T07:00:00Z",
  media: [{ uri1024: "https://cdn.example.com/a/1024.jpg" }],
  listAgentName: "Jane Agent",
  listAgentPreferredPhone: "+17605550101",
  listOfficeName: "Desert Realty Group",
  listOfficePhone: "+17605550100",
};

/** A Postgres-style row: dual-column ALTERNATES populated, poolYn alias, PascalCase media. */
const rowPostgres: Record<string, any> = {
  listingKey: "CRMLS-987654",
  unparsedAddress: "1 Quarry Ln, La Quinta, CA 92253",
  city: "La Quinta",
  subdivision: "The Quarry",
  propertyType: "Residential",
  status: "Active",
  listPrice: 4500000,
  // dual-column: only the *alternate* names populated → exercises the fallback
  bedsTotal: 6,
  bathsTotal: 7,
  buildingAreaTotal: 7800,
  yearBuilt: 2005,
  poolYn: true, // alias casing
  onMarketDate: "2026-05-01T07:00:00Z", // no daysOnMarket → derive
  media: [{ Uri800: "https://cdn.example.com/b/800.jpg" }],
  listAgentMarketingName: "The Smith Team", // attribution via marketing-name fallback
  listOfficeViewName: "Quarry Estates Inc.",
};

/** A sparse row missing attribution + photos + facts — must still be compliant. */
const rowSparse: Record<string, any> = {
  listingKey: "X1",
  listPrice: 350000,
  poolFeatures: "None",
  // no agent/office at all → attribution must still be present (empty string)
};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe("toListingDTO — dual-column collapses", () => {
  it("collapses beds = bedroomsTotal || bedsTotal", () => {
    expect(toListingDTO(rowMongoLean).beds).toBe(4); // primary name
    expect(toListingDTO(rowPostgres).beds).toBe(6); // alternate name
  });

  it("collapses baths = bathroomsTotalInteger || bathsTotal", () => {
    expect(toListingDTO(rowMongoLean).baths).toBe(5);
    expect(toListingDTO(rowPostgres).baths).toBe(7);
  });

  it("collapses sqft = livingArea || buildingAreaTotal", () => {
    expect(toListingDTO(rowMongoLean).sqft).toBe(3200);
    expect(toListingDTO(rowPostgres).sqft).toBe(7800);
  });
});

describe("toListingDTO — pool collapse (poolYN / poolYn / pool / poolFeatures)", () => {
  it("reads canonical poolYN", () => {
    expect(toListingDTO(rowMongoLean).pool).toBe(true);
  });
  it("reads the poolYn alias", () => {
    expect(toListingDTO(rowPostgres).pool).toBe(true);
  });
  it("reads the legacy pool boolean", () => {
    expect(toListingDTO({ listingKey: "p", pool: true }).pool).toBe(true);
  });
  it("treats poolFeatures='None' as no pool", () => {
    expect(toListingDTO(rowSparse).pool).toBe(false);
  });
  it("treats a real poolFeatures string as a pool", () => {
    expect(toListingDTO({ listingKey: "p", poolFeatures: "In Ground, Heated" }).pool).toBe(true);
  });
});

describe("toListingDTO — photo-URL fallback chain", () => {
  it("resolves primaryPhotoUrl from the nested media variant", () => {
    expect(toListingDTO(rowMongoLean).primaryPhotoUrl).toBe("https://cdn.example.com/a/1024.jpg");
    expect(toListingDTO(rowPostgres).primaryPhotoUrl).toBe("https://cdn.example.com/b/800.jpg");
  });

  it("prefers a top-level primaryPhotoUrl when present", () => {
    const dto = toListingDTO({ listingKey: "p", primaryPhotoUrl: "https://cdn/top.jpg", media: [{ uri1024: "https://cdn/nested.jpg" }] });
    expect(dto.primaryPhotoUrl).toBe("https://cdn/top.jpg");
  });

  it("derives a render-ready optimized thumbUrl from the raw url", () => {
    const dto = toListingDTO(rowMongoLean);
    expect(dto.thumbUrl).toContain("/_next/image?url=");
    expect(dto.thumbUrl).toContain(encodeURIComponent("https://cdn.example.com/a/1024.jpg"));
    expect(dto.thumbUrl).toContain("w=640");
  });

  it("returns null photos when no media is present", () => {
    const dto = toListingDTO(rowSparse);
    expect(dto.primaryPhotoUrl).toBeNull();
    expect(dto.thumbUrl).toBeNull();
  });
});

describe("toListingDTO — derived market timing + identity", () => {
  it("uses the MLS daysOnMarket snapshot when present", () => {
    expect(toListingDTO(rowMongoLean).daysOnMarket).toBe(12);
  });
  it("derives daysOnMarket from onMarketDate when the snapshot is absent", () => {
    const dto = toListingDTO(rowPostgres);
    // Derived value must be a non-negative number, not null.
    expect(typeof dto.daysOnMarket).toBe("number");
    expect(dto.daysOnMarket !== null && dto.daysOnMarket >= 0).toBeTruthy();
  });
  it("builds slug + detailUrl from listingKey", () => {
    const dto = toListingDTO(rowMongoLean);
    expect(dto.slug).toBe("/mls-listings/GPS-219123456");
    expect(dto.detailUrl).toBe("https://www.chatrealty.io/mls-listings/GPS-219123456");
  });
});

describe("ATTRIBUTION INVARIANT (build_plan §3.8) — present on EVERY mapped listing", () => {
  const allRows = [rowMongoLean, rowPostgres, rowSparse];

  it("every DTO has listAgentName + listOfficeName as own string properties", () => {
    for (const row of allRows) {
      const dto: ListingDTO = toListingDTO(row);
      // Structural presence — must be own properties, never undefined.
      expect(dto).toHaveProperty("listAgentName");
      expect(dto).toHaveProperty("listOfficeName");
      expect(typeof dto.listAgentName).toBe("string");
      expect(typeof dto.listOfficeName).toBe("string");
    }
  });

  it("populates attribution from the primary RESO fields", () => {
    const dto = toListingDTO(rowMongoLean);
    expect(dto.listAgentName).toBe("Jane Agent");
    expect(dto.listOfficeName).toBe("Desert Realty Group");
    expect(dto.listAgentPreferredPhone).toBe("+17605550101");
    expect(dto.listOfficePhone).toBe("+17605550100");
  });

  it("falls back through marketing/view-name aliases", () => {
    const dto = toListingDTO(rowPostgres);
    expect(dto.listAgentName).toBe("The Smith Team");
    expect(dto.listOfficeName).toBe("Quarry Estates Inc.");
  });

  it("emits empty strings (NOT undefined) when the row has no attribution at all", () => {
    const dto = toListingDTO(rowSparse);
    // A compliance bug would be a missing/undefined field; empty string keeps
    // the field structurally present for the downstream rendering surfaces.
    expect(dto.listAgentName).toBe("");
    expect(dto.listOfficeName).toBe("");
    expect(dto.listAgentPreferredPhone).toBeNull();
    expect(dto.listOfficePhone).toBeNull();
  });
});

describe("toContactDTO — primary phone/email + name fallback", () => {
  it("collapses the primary phone/email from the structured arrays", () => {
    const dto = toContactDTO({
      _id: "abc123",
      firstName: "Sam",
      lastName: "Buyer",
      phones: [
        { number: "+17601112222", isPrimary: false },
        { number: "+17603334444", isPrimary: true },
      ],
      emails: [{ address: "sam@example.com", isPrimary: true }],
      tags: ["buyer"],
      status: "qualified",
      source: "website",
    });
    expect(dto.id).toBe("abc123");
    expect(dto.name).toBe("Sam Buyer");
    expect(dto.primaryPhone).toBe("+17603334444");
    expect(dto.primaryEmail).toBe("sam@example.com");
    expect(dto.status).toBe("qualified");
  });

  it("falls back to deprecated scalar phone/email then organization name", () => {
    const dto = toContactDTO({
      _id: "org1",
      organization: "Acme Holdings",
      phone: "+17605556666",
      email: "info@acme.com",
    });
    expect(dto.name).toBe("Acme Holdings");
    expect(dto.primaryPhone).toBe("+17605556666");
    expect(dto.primaryEmail).toBe("info@acme.com");
  });

  it("uses 'Unnamed contact' when there is no name or organization", () => {
    expect(toContactDTO({ _id: "x" }).name).toBe("Unnamed contact");
  });
});

// -----------------------------------------------------------------------------
// Standalone runner (only when no jest/vitest is present)
// -----------------------------------------------------------------------------

if (!HAS_RUNNER) {
  (async () => {
    for (const t of queue) {
      try {
        await t.fn();
        // eslint-disable-next-line no-console
        console.log(`  ok  ${t.name}`);
      } catch (err) {
        failures++;
        // eslint-disable-next-line no-console
        console.error(`FAIL  ${t.name}\n      ${(err as Error).message}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\n${queue.length - failures}/${queue.length} passed`);
    if (failures > 0) process.exit(1);
  })();
}
