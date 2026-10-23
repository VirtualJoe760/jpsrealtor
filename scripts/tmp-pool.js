require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const everQueued = await db.collection("pendingposts").distinct("listingKey", {});
  const posted = await db.collection("pendingposts").distinct("listingKey", { status: "posted" });
  console.log("ever queued:", everQueued.length, " posted:", posted.length);

  // derive roster
  const teamListings = await db.collection("unifiedlistings").find({
    standardStatus: "Active",
    $or: [{ coListAgentName: /obsidian/i }, { listAgentName: /obsidian/i }],
  }).project({ listAgentName:1, coListAgentName:1 }).toArray();
  const roster = new Set();
  for (const l of teamListings) {
    if (/obsidian/i.test(l.coListAgentName||"") && l.listAgentName) roster.add(l.listAgentName);
    if (/obsidian/i.test(l.listAgentName||"") && l.coListAgentName) roster.add(l.coListAgentName);
  }
  roster.add("Joseph Sardella");
  console.log("roster:", [...roster].join(" | "));

  const pool = await db.collection("unifiedlistings").find({
    standardStatus: "Active",
    $or: [
      { coListAgentName: /obsidian/i }, { listAgentName: /obsidian/i },
      { listAgentName: { $in: [...roster] } }, { coListAgentName: { $in: [...roster] } },
    ],
  }).project({ listingKey:1, unparsedAddress:1, city:1, listPrice:1, propertyType:1, photosCount:1, onMarketDate:1, bedroomsTotal:1, bathroomsTotalInteger:1, livingArea:1, listAgentName:1, coListAgentName:1, subdivisionName:1 }).toArray();

  console.log("\nTEAM ACTIVES:", pool.length);
  const nq = pool.filter(l => !everQueued.includes(l.listingKey));
  console.log("never queued:", nq.length);
  const cands = nq.filter(l => l.propertyType === "A" && (l.photosCount||0) >= 12).sort((a,b)=> (b.onMarketDate?new Date(b.onMarketDate):0) - (a.onMarketDate?new Date(a.onMarketDate):0));
  console.log("\nNEVER-QUEUED SALES >=12 photos:", cands.length);
  for (const l of cands) {
    console.log([
      l.listingKey,
      String(l.unparsedAddress).slice(0,34).padEnd(36),
      String(l.city).slice(0,16).padEnd(18),
      ("$"+(l.listPrice||0).toLocaleString()).padEnd(12),
      ("ph:"+(l.photosCount||0)).padEnd(7),
      (l.bedroomsTotal||"?")+"bd/"+(l.bathroomsTotalInteger||"?")+"ba " + (l.livingArea||"?")+"sf",
      " onmkt:"+(l.onMarketDate? new Date(l.onMarketDate).toISOString().slice(0,10):"?"),
      " | "+ (l.listAgentName||"") + " / " + (l.coListAgentName||""),
    ].join(" "));
  }
  await mongoose.disconnect();
})();
