// scripts/test-query-parser.ts
// Phase A test harness for src/lib/chat-v2/query-parser.ts
// Covers ~30 representative queries spanning the 9-intent taxonomy from
// docs/chat-production/architecture.md, including the closed-data and
// dataset-detection paths added in commit 3b80bd68.
//
// Run: npx tsx scripts/test-query-parser.ts

import "dotenv/config";
import { parseQuery, type Intent, type Dataset } from "../src/lib/chat-v2/query-parser";

interface Case {
  name: string;
  message: string;
  expect: {
    intent: Intent;
    dataset?: Dataset;
    minConfidence?: number;
    entityType?: string;
    entityCount?: number;
    filters?: Record<string, any>;
    metric?: string[];
  };
}

const CASES: Case[] = [
  // ============================================================
  // Intent A: property search (active)
  // ============================================================
  {
    name: "city + bare query",
    message: "show me homes in Beverly Hills",
    expect: { intent: "listing-search", dataset: "active", entityType: "city", minConfidence: 0.8 },
  },
  {
    name: "city + filters (price + beds + amenity)",
    message: "3 bed homes under $1M in Indio with a pool",
    expect: {
      intent: "listing-search",
      dataset: "active",
      entityType: "city",
      filters: { beds: 3, maxPrice: 1_000_000, pool: true },
      minConfidence: 0.8,
    },
  },
  {
    name: "subdivision + amenity",
    message: "pool homes in PGA West",
    expect: {
      intent: "listing-search",
      dataset: "active",
      entityType: "subdivision",
      filters: { pool: true },
      minConfidence: 0.8,
    },
  },
  {
    name: "rentals (heuristic — needs propertyType:B downstream, parser keeps it conversational hint)",
    message: "rentals in Palm Springs under $3000",
    expect: {
      intent: "listing-search",
      dataset: "active",
      filters: { maxPrice: 3000 },
    },
  },

  // ============================================================
  // Intent B: specific property lookup
  // ============================================================
  {
    name: "full address",
    message: "12345 Desi Drive",
    expect: { intent: "listing-detail", dataset: "active", entityType: "address", minConfidence: 0.9 },
  },
  {
    name: "address with city",
    message: "77013 Desi Drive Indian Wells",
    expect: { intent: "listing-detail", dataset: "active", entityType: "address", minConfidence: 0.9 },
  },
  {
    name: "partial address — house# + street name, no suffix word",
    message: "45355 taos",
    expect: { intent: "listing-detail", dataset: "active", entityType: "address", minConfidence: 0.8 },
  },
  {
    name: "partial address — multi-word street name, no suffix",
    message: "45380 Taos Cove",
    expect: { intent: "listing-detail", dataset: "active", entityType: "address", minConfidence: 0.8 },
  },
  {
    name: "bare 5-digit zip stays a zip",
    message: "92210",
    expect: { intent: "listing-search", dataset: "active", entityType: "zip" },
  },

  // ============================================================
  // Intent C: street-only multi-listing
  // ============================================================
  {
    name: "street name only",
    message: "homes on Hovley Lane",
    expect: { intent: "street-listings", dataset: "active", entityType: "street", minConfidence: 0.7 },
  },
  {
    name: "bare street name — must not fuzzy-match a subdivision (Palm Springs Villas I bug)",
    message: "desi drive",
    expect: { intent: "street-listings", dataset: "active", entityType: "street", minConfidence: 0.8 },
  },
  {
    name: "bare street name with abbreviation",
    message: "el paseo dr",
    expect: { intent: "street-listings", dataset: "active", entityType: "street" },
  },
  {
    name: "street name with suffix abbreviation",
    message: "listings on El Paseo Dr",
    expect: { intent: "street-listings", dataset: "active", entityType: "street" },
  },

  // ============================================================
  // Intent D: area exploration
  // ============================================================
  {
    name: "area exploration — bare city",
    message: "tell me about Indian Wells",
    expect: { intent: "listing-search", dataset: "active", entityType: "city", minConfidence: 0.8 },
  },

  // ============================================================
  // Intent E: aggregate market questions
  // ============================================================
  {
    name: "aggregate active — average price",
    message: "average list price in Beverly Hills",
    expect: { intent: "aggregate", dataset: "active", entityType: "city", minConfidence: 0.8 },
  },
  {
    name: "aggregate closed — average sold price (dataset detection)",
    message: "average sold price last 6 months in Palm Desert",
    expect: {
      intent: "aggregate",
      dataset: "closed",
      entityType: "city",
      filters: { closedSinceDays: 180 },
      minConfidence: 0.8,
    },
  },
  {
    name: "aggregate closed — sale-to-list ratio (this routes to trend, not aggregate, because of the strong trend keyword)",
    message: "sale to list ratio in Indio",
    expect: { intent: "trend", dataset: "closed", entityType: "city" },
  },
  {
    name: "count query — how many gated",
    message: "how many gated homes in Indian Wells",
    expect: {
      intent: "aggregate",
      dataset: "active",
      entityType: "city",
      filters: { gatedCommunity: true },
    },
  },

  // ============================================================
  // Intent F: comparisons
  // ============================================================
  {
    name: "compare two subdivisions",
    message: "compare PGA West vs Indian Wells Country Club",
    expect: { intent: "compare", dataset: "active", entityCount: 2, minConfidence: 0.8 },
  },
  {
    name: "compare two cities",
    message: "Palm Desert versus La Quinta",
    expect: { intent: "compare", dataset: "active", entityCount: 2 },
  },

  // ============================================================
  // Intent G: trend / appreciation
  // ============================================================
  {
    name: "5-year appreciation",
    message: "5-year appreciation in PGA West",
    expect: {
      intent: "trend",
      dataset: "closed",
      entityType: "subdivision",
      metric: ["median_close_price_yoy"],
    },
  },
  {
    name: "is the market hot or cooling",
    message: "is the market hot or cooling in PGA West",
    expect: {
      intent: "trend",
      dataset: "closed",
      entityType: "subdivision",
    },
  },
  {
    name: "DOM trend",
    message: "has DOM gone up or down in Indian Wells",
    expect: {
      intent: "trend",
      dataset: "closed",
      entityType: "city",
      metric: ["dom_median"],
    },
  },

  // ============================================================
  // Intent H: CMA / valuation
  // ============================================================
  {
    name: "CMA for an address",
    message: "generate a CMA for 12345 Desi Drive",
    expect: { intent: "cma", dataset: "closed", entityType: "address" },
  },
  {
    name: "what is it worth",
    message: "what is 77013 Desi Drive worth",
    expect: { intent: "cma", dataset: "closed", entityType: "address" },
  },

  // ============================================================
  // Intent I: lifestyle / educational (insights)
  // ============================================================
  {
    name: "utility provider question",
    message: "where is cheaper electric in coachella valley",
    expect: { intent: "insights", minConfidence: 0.7 },
  },
  {
    name: "what's a short sale",
    message: "what's a short sale",
    expect: { intent: "insights", minConfidence: 0.6 },
  },
  {
    name: "schools in Palm Desert (city + insights — region-level routing)",
    message: "best schools in Palm Desert",
    expect: { intent: "insights" },
  },

  // ============================================================
  // Intent J: conversational fallback
  // ============================================================
  {
    name: "open-ended relocation question",
    message: "I'm thinking about relocating to California, where do I start",
    expect: { intent: "conversational" },
  },

  // ============================================================
  // Filter extraction sanity
  // ============================================================
  {
    name: "no HOA filter",
    message: "no HOA homes in La Quinta",
    expect: { intent: "listing-search", filters: { hasHOA: false } },
  },
  {
    name: "HOA range",
    message: "homes in PGA West with HOA under $300",
    expect: { intent: "listing-search", filters: { hasHOA: true, maxHOA: 300 } },
  },
  {
    name: "directional geo filter",
    message: "homes in La Quinta east of Washington Street",
    expect: { intent: "listing-search", filters: { eastOf: "Washington Street" } },
  },
  {
    name: "year range",
    message: "homes built after 2010 in Palm Desert",
    expect: { intent: "listing-search", filters: { minYear: 2010 } },
  },

  // ============================================================
  // HOA-as-filter without explicit "homes" / "with" keyword
  // ============================================================
  {
    name: "terse hoa filter — 'hoa under 500 indian wells'",
    message: "hoa under 500 indian wells",
    expect: {
      intent: "listing-search",
      entityType: "city",
      filters: { hasHOA: true, maxHOA: 500 },
    },
  },
  {
    name: "aggregate over hoa-filtered set — 'how many homes in indian wells have hoa under 500'",
    message: "how many homes in indian wells have hoa under 500",
    expect: {
      intent: "aggregate",
      entityType: "city",
      filters: { hasHOA: true, maxHOA: 500 },
    },
  },
];

// =============================================================================
// Runner
// =============================================================================

function arrayIncludesAll<T>(haystack: T[], needles: T[]): boolean {
  return needles.every((n) => haystack.includes(n));
}

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const c of CASES) {
    let result;
    try {
      result = await parseQuery(c.message);
    } catch (err: any) {
      console.log(`  FAIL  ${c.name}`);
      console.log(`        threw: ${err?.message || err}`);
      fail++;
      failures.push(c.name);
      continue;
    }

    const checks: string[] = [];

    if (c.expect.intent && result.intent !== c.expect.intent) {
      checks.push(`intent ${result.intent} !== ${c.expect.intent}`);
    }
    if (c.expect.dataset && result.dataset !== c.expect.dataset) {
      checks.push(`dataset ${result.dataset} !== ${c.expect.dataset}`);
    }
    if (c.expect.minConfidence !== undefined && result.confidence < c.expect.minConfidence) {
      checks.push(`confidence ${result.confidence.toFixed(2)} < ${c.expect.minConfidence}`);
    }
    if (c.expect.entityType !== undefined) {
      const matchesType = result.entities.some((e) => e.type === c.expect.entityType);
      if (!matchesType) {
        const got = result.entities.map((e) => e.type).join(",") || "(none)";
        checks.push(`entityType — expected one of [${c.expect.entityType}], got [${got}]`);
      }
    }
    if (c.expect.entityCount !== undefined && result.entities.length !== c.expect.entityCount) {
      checks.push(`entityCount ${result.entities.length} !== ${c.expect.entityCount}`);
    }
    if (c.expect.filters) {
      for (const [k, v] of Object.entries(c.expect.filters)) {
        if ((result.filters as any)[k] !== v) {
          checks.push(`filter ${k}=${(result.filters as any)[k]} !== expected ${v}`);
        }
      }
    }
    if (c.expect.metric) {
      const got = result.metric || [];
      if (!arrayIncludesAll(got, c.expect.metric)) {
        checks.push(`metric — expected to include ${c.expect.metric.join(",")}, got [${got.join(",") || "(none)"}]`);
      }
    }

    if (checks.length === 0) {
      pass++;
      console.log(`  PASS  ${c.name}`);
    } else {
      fail++;
      failures.push(c.name);
      console.log(`  FAIL  ${c.name}`);
      for (const ch of checks) console.log(`        ${ch}`);
      console.log(
        `        full: intent=${result.intent} dataset=${result.dataset} conf=${result.confidence.toFixed(
          2
        )} entities=[${result.entities.map((e) => `${e.type}:${(e as any).name || (e as any).street || (e as any).value}`).join(",")}] filters=${JSON.stringify(result.filters)}${result.metric ? ` metric=${JSON.stringify(result.metric)}` : ""}`
      );
    }
  }

  console.log("");
  console.log(`${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log(`failed cases: ${failures.join(", ")}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
