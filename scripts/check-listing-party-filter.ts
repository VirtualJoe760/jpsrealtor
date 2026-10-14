// Read-only check of the listing-party search filters (src/lib/skill-api/listing-party-filter.ts):
// no new params → no clause; mine → the licence resolves through the roster; the clauses match real rows.
// npx tsx scripts/check-listing-party-filter.ts <licenceNumber>
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const { listingPartyClauses } = await import("../src/lib/skill-api/listing-party-filter");
  const license = process.argv[2] || "";
  const user = { licenseNumber: license, agentProfile: { mlsDataSources: [] } };

  const none = await listingPartyClauses(new URLSearchParams("city=Palm Desert&maxDaysOnMarket=7"), user);
  console.log("no new params → clauses:", none.ok ? none.clauses.length : none);

  const noId = await listingPartyClauses(new URLSearchParams("mine=true"), { agentProfile: {} });
  console.log("mine with no licence →", noId.ok ? "unexpected ok" : noId.error);

  const mine = await listingPartyClauses(new URLSearchParams("mine=true"), user);
  if (!mine.ok) throw new Error(mine.message);
  console.log("mine →", JSON.stringify(mine.clauses));

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("no Mongo URI in .env.local");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const closed = await db.collection("unified_closed_listings").countDocuments({ $and: mine.clauses });
  const active = await db.collection("unifiedlistings").countDocuments({ standardStatus: "Active", $and: mine.clauses });
  console.log(`mine: ${closed} closed, ${active} active`);

  const office = await listingPartyClauses(new URLSearchParams("listOfficeMlsIds=oD22403"), user);
  if (office.ok) {
    const n = await db.collection("unifiedlistings").countDocuments({ standardStatus: "Active", $and: office.clauses });
    console.log(`office oD22403: ${n} active`);
  }
  await client.close();
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
