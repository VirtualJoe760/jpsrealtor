require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
const TEAM = "20230905131838052805000000";
const PROJ = { listingKey:1, streetNumber:1, streetName:1, unitNumber:1, city:1, propertyType:1,
  listPrice:1, subdivisionName:1, onMarketDate:1, standardStatus:1, listAgentName:1,
  coListAgentName:1, listAgentTeamKey:1, coListAgentId:1, listAgentMlsId:1, coListAgentMlsId:1,
  listOfficeName:1, photos: { $size: { $ifNull: ["$media", []] } } };

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();

  // 1. derive the roster: agents appearing opposite "The Obsidian Group" on ANY listing (active or closed-ish)
  const named = await db.collection("unifiedlistings").aggregate([
    { $match: { $or: [ { coListAgentName: /obsidian/i }, { listAgentName: /obsidian/i } ] } },
    { $project: { listAgentName:1, coListAgentName:1 } },
  ], { allowDiskUse: true }).toArray();
  const roster = new Set();
  for (const r of named) {
    for (const n of [r.listAgentName, r.coListAgentName]) {
      if (n && !/obsidian/i.test(n)) roster.add(n);
    }
  }
  console.log("listings carrying the literal team name (Active):", named.length);
  console.log("derived roster (" + roster.size + "):", [...roster].sort().join(" | "));

  const rosterArr = [...roster];
  const q = { standardStatus: "Active", $or: [
    { listAgentTeamKey: TEAM }, { coListAgentId: TEAM },
    { coListAgentName: /obsidian/i }, { listAgentName: /obsidian/i },
    { listAgentName: { $in: rosterArr } }, { coListAgentName: { $in: rosterArr } },
  ] };
  const rows = await db.collection("unifiedlistings").aggregate([
    { $match: q }, { $project: PROJ }, { $sort: { listPrice: -1 } },
  ], { allowDiskUse: true }).toArray();

  const everQueued = await db.collection("pendingposts").distinct("listingKey");
  const posted = await db.collection("pendingposts").distinct("listingKey", { status: "posted" });
  const keyMatch = new Set(rows.filter(r => r.listAgentTeamKey === TEAM || r.coListAgentId === TEAM).map(r=>r.listingKey));

  console.log("\n=== BROAD pool actives: " + rows.length + " (key-query matched: " + keyMatch.size + ") ===");
  for (const r of rows) {
    const addr = [r.streetNumber, r.streetName, r.unitNumber?("#"+r.unitNumber):""].filter(Boolean).join(" ");
    console.log([r.listingKey.padEnd(26), (r.propertyType||"?"), String(r.listPrice).padStart(9), ("ph"+r.photos).padEnd(6),
      (addr+", "+r.city).slice(0,40).padEnd(42),
      (keyMatch.has(r.listingKey)?"key":"NAME").padEnd(4),
      posted.includes(r.listingKey)?"POSTED":(everQueued.includes(r.listingKey)?"queued":"FRESH"),
      "|", String(r.listAgentName||"-").slice(0,22), "/", String(r.coListAgentName||"-").slice(0,22)].join(" | "));
  }
  const fresh = rows.filter(r=>!everQueued.includes(r.listingKey) && r.propertyType==="A" && r.photos>=12);
  console.log("\nFRESH stageable (type A, >=12 photos):", fresh.length);
  for (const r of fresh) {
    const addr = [r.streetNumber, r.streetName, r.unitNumber?("#"+r.unitNumber):""].filter(Boolean).join(" ");
    console.log("  ", r.listingKey, "$"+r.listPrice, addr+", "+r.city, "ph"+r.photos, "|", r.listAgentName, "/", r.coListAgentName);
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
