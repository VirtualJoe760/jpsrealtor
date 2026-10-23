// Read-only check of the listing-party search filters (src/lib/skill-api/listing-party-filter.ts)
// and the two type-ahead lookups beside them (agents/search, market/places), against real data:
// no new params → no clause; mine → the licence finds every registration; an agent and a brokerage
// picked by name filter the listings.
// npx tsx scripts/check-listing-party-filter.ts <licenceNumber> <agent name> <brokerage name> <place>
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const [license = "", agentName = "", brokerName = "", place = ""] = process.argv.slice(2);
  const { listingPartyClauses } = await import("../src/lib/skill-api/listing-party-filter");
  const mongoose = (await import("mongoose")).default;
  const user = { licenseNumber: license, agentProfile: { mlsDataSources: [] } };

  const none = await listingPartyClauses(new URLSearchParams("city=Palm Desert&maxDaysOnMarket=7"), user);
  console.log("no new params → clauses:", none.ok ? none.clauses.length : none);

  const noId = await listingPartyClauses(new URLSearchParams("mine=true"), { agentProfile: {} });
  console.log("mine with no licence →", noId.ok ? "unexpected ok" : noId.error);

  const mine = await listingPartyClauses(new URLSearchParams("mine=true"), user);
  if (!mine.ok) throw new Error(mine.message);
  console.log("mine →", JSON.stringify(mine.clauses));

  const db = mongoose.connection.db!;
  const recent = new Date(Date.now() - 30 * 86400000).toISOString();
  const count = async (clauses: Record<string, any>[], label: string) => {
    const t = Date.now();
    const n = await db
      .collection("unified_listings")
      .countDocuments({ standardStatus: "Active", onMarketDate: { $gte: recent }, $and: clauses }, { maxTimeMS: 60000 });
    console.log(`${label}: ${n} active, on the market ≤30 days (${Date.now() - t} ms)`);
  };
  await count(mine.clauses, "mine");

  const a = await db
    .collection("agents")
    .find({ "identity.searchNames": { $regex: `^${agentName.toLowerCase()}` }, "identity.isSentinel": { $ne: true } })
    .sort({ "production.activeListings": -1 })
    .limit(1)
    .project({ _id: 1, "identity.name": 1, "production.activeListings": 1 })
    .toArray();
  console.log("agent search", agentName, "→", JSON.stringify(a));
  if (a[0]) {
    const r = await listingPartyClauses(new URLSearchParams(`agentIds=${a[0]._id}`), user);
    if (r.ok) await count(r.clauses, `agent ${a[0]._id}`);
  }

  const b = await db
    .collection("brokerages")
    .find({ normalizedName: { $regex: `^${brokerName.toLowerCase()}` } })
    .sort({ "active.listings": -1 })
    .limit(1)
    .project({ _id: 1, name: 1, officeCount: 1, "active.listings": 1 })
    .toArray();
  console.log("brokerage search", brokerName, "→", JSON.stringify(b));
  if (b[0]) {
    const r = await listingPartyClauses(new URLSearchParams(`brokerages=${b[0]._id}`), user);
    if (r.ok) await count(r.clauses, `brokerage ${b[0]._id}`);
  }

  const cities = await db.collection("cities").find({ normalizedName: { $regex: `^${place.toLowerCase()}` } }).sort({ listingCount: -1 }).limit(3).project({ name: 1, listingCount: 1 }).toArray();
  const subs = await db.collection("subdivisions").find({ normalizedName: { $regex: `^${place.toLowerCase()}` } }).sort({ listingCount: -1 }).limit(3).project({ name: 1, city: 1, listingCount: 1 }).toArray();
  console.log("places", place, "→ cities", JSON.stringify(cities.map((c) => c.name)), "subdivisions", JSON.stringify(subs.map((s) => `${s.name} (${s.city})`)));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
