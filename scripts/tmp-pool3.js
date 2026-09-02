require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
const TEAM = "20230905131838052805000000";
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 120000 });
  await c.connect();
  const db = c.db();
  const all = await db.collection("pendingposts")
    .find({}, { projection: { listingKey:1,status:1,address:1,approvalCode:1,createdAt:1,"slides.order":1 } })
    .sort({ createdAt: 1 }).toArray();
  const byStatus = {};
  for (const p of all) byStatus[p.status] = (byStatus[p.status]||0)+1;
  console.log("=== pendingposts total " + all.length + " ===", JSON.stringify(byStatus));
  for (const p of all) console.log([String(p.status||"").padEnd(16),String(p.approvalCode||"--").padEnd(4),String(p.listingKey||"").padEnd(26),String(p.address||"").slice(0,42).padEnd(44),"sl="+((p.slides||[]).length),p.createdAt?new Date(p.createdAt).toISOString().slice(0,10):""].join(" | "));
  const posted = await db.collection("pendingposts").distinct("listingKey", { status: "posted" });
  const everQueued = await db.collection("pendingposts").distinct("listingKey");
  console.log("\nposted:", posted.length, "everQueued:", everQueued.length);

  const rows = await db.collection("unifiedlistings").aggregate([
    { $match: { standardStatus:"Active", $or:[{listAgentTeamKey:TEAM},{coListAgentId:TEAM}] } },
    { $project: { listingKey:1, streetNumber:1, streetName:1, unitNumber:1, city:1, propertyType:1,
      listPrice:1, subdivisionName:1, onMarketDate:1, bedroomsTotal:1, bathroomsTotalInteger:1,
      livingArea:1, poolYN:1, furnished:1, listAgentFullName:1, coListAgentFullName:1,
      photos: { $size: { $ifNull: ["$media", []] } } } },
    { $sort: { listPrice: -1 } },
  ], { allowDiskUse: true }).toArray();

  console.log("\n=== team actives: " + rows.length + " ===");
  for (const r of rows) {
    const addr = [r.streetNumber, r.streetName, r.unitNumber?("#"+r.unitNumber):""].filter(Boolean).join(" ");
    console.log([r.listingKey.padEnd(26),(r.propertyType||"?"),String(r.listPrice).padStart(9),("ph"+r.photos).padEnd(6),
      (addr+", "+r.city).slice(0,44).padEnd(46), String(r.subdivisionName||"").slice(0,20).padEnd(22),
      r.onMarketDate?new Date(r.onMarketDate).toISOString().slice(0,10):"          ",
      posted.includes(r.listingKey)?"POSTED":(everQueued.includes(r.listingKey)?"queued":"FRESH")].join(" | "));
  }
  const fresh = rows.filter(r=>!everQueued.includes(r.listingKey));
  console.log("\nFRESH total:", fresh.length, "| FRESH type A >=12 photos:");
  for (const r of fresh.filter(r=>r.propertyType==="A"&&r.photos>=12)) {
    const addr = [r.streetNumber, r.streetName, r.unitNumber?("#"+r.unitNumber):""].filter(Boolean).join(" ");
    console.log("  ", r.listingKey, "$"+r.listPrice, addr+", "+r.city, "ph"+r.photos, "bd"+r.bedroomsTotal, "ba"+r.bathroomsTotalInteger, r.livingArea+"sf", "pool="+r.poolYN, "furn="+r.furnished, "|", r.listAgentFullName, "/", r.coListAgentFullName);
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message); process.exit(1);});
