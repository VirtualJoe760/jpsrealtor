// scripts/verify-chat-stats.ts
// Phase 2 verification: compare OLD chat-v2 stats logic (50-row JS sample)
// against the NEW $facet aggregation for Beverly Hills and Irvine.
//
// Run: npx tsx scripts/verify-chat-stats.ts

import "dotenv/config";
import dbConnect from "../src/lib/mongodb";
import UnifiedListing from "../src/models/unified-listing";
import { computeAreaStats } from "../src/lib/chat-v2/listing-query";

interface OldStats {
  totalListings: number;
  newListingsCount: number;
  avgPrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  hoaMin: number | null;
  hoaMax: number | null;
  poolPct: number;
  spaPct: number;
  viewPct: number;
  propertyTypes: Array<{ subType: string; count: number; avgPrice: number }>;
  sampleSize: number; // how many rows the JS averaging actually saw
}

/**
 * Faithful reconstruction of the pre-Phase-2 executeSearchHomes stats logic.
 * Pulled from git: tool-executors.ts lines 261-378 in commit before a20503b7.
 * The point is to demonstrate sample bias on cities >50 listings.
 */
async function oldStyleStats(cityName: string): Promise<OldStats> {
  const dbQuery: any = {
    standardStatus: "Active",
    propertyType: "A",
    propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
    city: new RegExp(`^${cityName}$`, "i"),
  };

  const totalListings = await UnifiedListing.countDocuments(dbQuery);

  const newAgg = await UnifiedListing.aggregate([
    { $match: dbQuery },
    {
      $addFields: {
        daysOnMarket: {
          $cond: [
            { $ne: ["$onMarketDate", null] },
            {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), { $toDate: "$onMarketDate" }] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
            null,
          ],
        },
      },
    },
    { $match: { daysOnMarket: { $lte: 7, $ne: null } } },
    { $count: "n" },
  ]);
  const newListingsCount = newAgg[0]?.n || 0;

  const sample: any[] = await UnifiedListing.find(dbQuery)
    .select(
      "listPrice livingArea propertySubType associationFee poolYn spaYn viewYn"
    )
    .limit(50)
    .lean();

  const prices = sample.map((l) => l.listPrice).filter(Boolean) as number[];
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const avgPrice = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;
  const medianPrice = sortedPrices.length
    ? sortedPrices[Math.floor(sortedPrices.length / 2)]
    : 0;

  const hoaFees = sample
    .map((l) => l.associationFee)
    .filter((f) => f && f > 0) as number[];
  const hoaMin = hoaFees.length ? Math.min(...hoaFees) : null;
  const hoaMax = hoaFees.length ? Math.max(...hoaFees) : null;

  const poolCount = sample.filter((l) => l.poolYn === true).length;
  const spaCount = sample.filter((l) => l.spaYn === true).length;
  const viewCount = sample.filter((l) => l.viewYn === true).length;

  const subTypeCounts: Record<string, { count: number; sum: number }> = {};
  for (const l of sample) {
    const k = l.propertySubType || "Unknown";
    if (!subTypeCounts[k]) subTypeCounts[k] = { count: 0, sum: 0 };
    subTypeCounts[k].count++;
    subTypeCounts[k].sum += l.listPrice || 0;
  }
  const propertyTypes = Object.entries(subTypeCounts)
    .map(([subType, v]) => ({
      subType,
      count: v.count,
      avgPrice: Math.round(v.sum / v.count),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalListings,
    newListingsCount,
    avgPrice,
    medianPrice,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    hoaMin,
    hoaMax,
    poolPct: sample.length ? Math.round((poolCount / sample.length) * 100) : 0,
    spaPct: sample.length ? Math.round((spaCount / sample.length) * 100) : 0,
    viewPct: sample.length ? Math.round((viewCount / sample.length) * 100) : 0,
    propertyTypes,
    sampleSize: sample.length,
  };
}

function dollar(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

async function compareCity(cityName: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${cityName.toUpperCase()}`);
  console.log("=".repeat(70));

  const oldS = await oldStyleStats(cityName);
  const newS = await computeAreaStats(
    { type: "city", cityName, cityId: cityName.toLowerCase().replace(/\s+/g, "-") },
    {}
  );

  console.log(`\nMatched listings:  total=${oldS.totalListings}`);
  console.log(`OLD JS sample size:  ${oldS.sampleSize} rows`);
  console.log(`NEW $facet sample:   ${newS.totalListings} rows (full set)`);

  console.log(`\n${"Field".padEnd(24)} ${"OLD (50-row sample)".padEnd(22)} ${"NEW (full set)".padEnd(20)} delta`);
  console.log("-".repeat(80));

  const row = (label: string, oldV: number | string, newV: number | string, isMoney = false) => {
    const oldStr = isMoney && typeof oldV === "number" ? dollar(oldV) : String(oldV);
    const newStr = isMoney && typeof newV === "number" ? dollar(newV) : String(newV);
    let delta = "";
    if (typeof oldV === "number" && typeof newV === "number" && oldV > 0) {
      const pct = (((newV - oldV) / oldV) * 100).toFixed(1);
      delta = `${pct}%`;
    }
    console.log(`${label.padEnd(24)} ${oldStr.padEnd(22)} ${newStr.padEnd(20)} ${delta}`);
  };

  row("Total listings", oldS.totalListings, newS.totalListings);
  row("New (7 days)", oldS.newListingsCount, newS.newListingsCount);
  row("Avg price", oldS.avgPrice, newS.avgPrice, true);
  row("Median price", oldS.medianPrice, newS.medianPrice, true);
  row("Min price", oldS.priceRange.min, newS.priceRange.min, true);
  row("Max price", oldS.priceRange.max, newS.priceRange.max, true);
  row("HOA min", oldS.hoaMin ?? 0, newS.hoa?.min ?? 0, true);
  row("HOA max", oldS.hoaMax ?? 0, newS.hoa?.max ?? 0, true);
  row("Pool %", `${oldS.poolPct}%`, `${newS.amenities.poolPct}%`);
  row("Spa %", `${oldS.spaPct}%`, `${newS.amenities.spaPct}%`);
  row("View %", `${oldS.viewPct}%`, `${newS.amenities.viewPct}%`);

  console.log("\nProperty subtype breakdown (OLD vs NEW):");
  console.log(`  ${"SubType".padEnd(28)} ${"OLD count".padEnd(12)} ${"NEW count".padEnd(12)} ${"OLD avg".padEnd(15)} ${"NEW avg"}`);
  console.log("  " + "-".repeat(85));
  const allSubTypes = new Set<string>([
    ...oldS.propertyTypes.map((p) => p.subType),
    ...newS.propertyTypes.map((p) => p.subType),
  ]);
  for (const st of allSubTypes) {
    const o = oldS.propertyTypes.find((p) => p.subType === st);
    const n = newS.propertyTypes.find((p) => p.subType === st);
    console.log(
      `  ${st.padEnd(28)} ${String(o?.count ?? 0).padEnd(12)} ${String(n?.count ?? 0).padEnd(12)} ${dollar(o?.avgPrice ?? 0).padEnd(15)} ${dollar(n?.avgPrice ?? 0)}`
    );
  }
}

(async () => {
  await dbConnect();
  await compareCity("Beverly Hills");
  await compareCity("Irvine");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
