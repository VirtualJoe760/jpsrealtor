// Read-only check of the agent/brokerage search and profile queries (src/app/api/skill/agents/*,
// src/app/api/skill/brokerages/profile) against the real collections: the fields they read exist, the city and name
// paths use their indexes (timed), and one person's registrations fold into one row.
// npx tsx scripts/check-agent-search.ts
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const { MongoClient } = await import("mongodb");
  const { agentCard } = await import("../src/lib/skill-api/agent-card");
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db();
  const agents = db.collection("agents");
  const timed = async <T>(label: string, f: () => Promise<T>): Promise<T> => {
    const t = Date.now();
    const r = await f();
    console.log(`${label}: ${Date.now() - t} ms`);
    return r;
  };

  const byName = await timed("name 'sardella'", () =>
    agents.find({ "identity.isSentinel": { $ne: true }, "identity.searchNames": { $regex: "^sardella" } }).sort({ "production.activeListings": -1, "production.last12moDeals": -1, _id: 1 }).limit(30).toArray()
  );
  const persons = new Set(byName.map((a: any) => a.identity?.personId || String(a._id)));
  console.log(`  ${byName.length} registrations, ${persons.size} people:`, byName.map((a: any) => `${a._id} (${a.identity?.personId ?? "no person"})`).join(", "));

  const inCity = await timed("city palm-desert by volume", () =>
    agents.find({ "identity.isSentinel": { $ne: true }, "location.cities.slug": "palm-desert" }).sort({ "production.windowVolume": -1, _id: 1 }).limit(5).toArray()
  );
  for (const a of inCity) {
    const c = agentCard(a, "palm-desert");
    console.log(`  ${c.name} — ${c.brokerage} — 5y $${Math.round(c.windowVolume / 1e6)}M, here ${JSON.stringify((c as any).inCity)}`);
  }

  const brk = await timed("brokerages in la-quinta by volume", () => db.collection("brokerages").find({ "cities.slug": "la-quinta" }).sort({ "closed.volume": -1, _id: 1 }).limit(3).toArray());
  console.log("  ", brk.map((b: any) => `${b.name} (${b.agentCount} agents, ${b.active?.listings} active)`).join(" | "));

  const me: any = await agents.findOne({ _id: "GPS:d83203" as any });
  console.log("profile GPS:d83203:", me ? `${me.identity?.name}, person ${me.identity?.personId}, licence ${me.identity?.licenseNumber}, cities ${me.location?.cities?.length}, byYear ${me.closed?.byYear?.length}, notes ${me.coverage?.notes?.length}` : "missing");
  if (me?.identity?.personId) console.log("  siblings:", (await agents.find({ "identity.personId": me.identity.personId, _id: { $ne: me._id } }).project({ _id: 1 }).toArray()).map((s: any) => s._id).join(", ") || "none");

  const fathom: any = await db.collection("brokerages").findOne({ _id: "fathom-realty-group" as any });
  console.log("brokerage fathom-realty-group:", fathom ? `${fathom.agentCount} agents, ${fathom.officeCount} offices, ${fathom.topAgents?.length} top agents, ${fathom.cities?.length} cities` : "missing");
  await client.close();
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
