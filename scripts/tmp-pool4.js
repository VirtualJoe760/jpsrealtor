require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
const TEAM = "20230905131838052805000000";
const PROJ = { listingKey:1, streetNumber:1, streetName:1, unitNumber:1, city:1, propertyType:1,
  listPrice:1, subdivisionName:1, onMarketDate:1, standardStatus:1, listAgentName:1,
  coListAgentName:1, listAgentTeamKey:1, coListAgentId:1, listAgentMlsId:1, coListAgentMlsId:1,
  listOfficeName:1, photos: { $size: { $ifNull: ["$media", []] } } };

// The roster aggregate is a full scan of unifiedlistings (~85k) with two regexes
// and no index to help it; on 2026-09-15 it ran past the old 180s socket timeout
// and died AFTER printing the roster, which reads like a completed run. 900s.
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 120000, socketTimeoutMS: 900000, connectTimeoutMS: 120000 });
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
  // The pool is reported as two counts, and two runs that print the same counts
  // can still hold different listings. 2026-09-16 went 36/29 -> 35/28 with one
  // arrival and one departure that netted to zero, and the drift was noticed but
  // not attributable, because no run had ever recorded WHICH keys it saw. Snapshot
  // the membership so the next run can diff it instead of re-deriving it.
  const fs = require("fs"), path = require("path");
  const SNAPDIR = "F:/web-clients/joseph-sardella/jpsrealtor/scripts/data/pool-snapshots";
  fs.mkdirSync(SNAPDIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const snap = { date: today, broad: rows.length, keyMatched: keyMatch.size,
    keys: rows.map(r => ({ k: r.listingKey, a: [r.streetNumber, r.streetName].filter(Boolean).join(" ") + ", " + r.city,
      p: r.listPrice, ph: r.photos, t: r.propertyType, m: keyMatch.has(r.listingKey) ? "key" : "NAME" })) };

  const prior = fs.readdirSync(SNAPDIR).filter(f => f.endsWith(".json") && f.slice(0, 10) < today).sort().pop();
  if (prior) {
    const was = JSON.parse(fs.readFileSync(path.join(SNAPDIR, prior), "utf8"));
    const wasK = new Map(was.keys.map(r => [r.k, r]));
    const nowK = new Map(snap.keys.map(r => [r.k, r]));
    const gone = was.keys.filter(r => !nowK.has(r.k));
    const came = snap.keys.filter(r => !wasK.has(r.k));
    const moved = snap.keys.filter(r => wasK.has(r.k) && wasK.get(r.k).p !== r.p);
    console.log("\n=== POOL DIFF vs " + prior.replace(".json", "") +
      " (was " + was.broad + "/" + was.keyMatched + ", now " + rows.length + "/" + keyMatch.size + ") ===");
    if (!gone.length && !came.length && !moved.length) console.log("   no change — same listings, same prices");
    for (const r of gone) console.log("   LEFT   " + r.k + " $" + r.p + " " + r.a);
    for (const r of came) console.log("   ARRIVED" + " " + r.k + " $" + r.p + " " + r.a + " ph" + r.ph);
    for (const r of moved) console.log("   PRICE  " + r.k + " $" + wasK.get(r.k).p + " -> $" + r.p + " " + r.a);
  } else {
    console.log("\n=== POOL DIFF: no prior snapshot — this run is the baseline ===");
  }
  fs.writeFileSync(path.join(SNAPDIR, today + ".json"), JSON.stringify(snap, null, 1));
  console.log("snapshot written: scripts/data/pool-snapshots/" + today + ".json");

  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
