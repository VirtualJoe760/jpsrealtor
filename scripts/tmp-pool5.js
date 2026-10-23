require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
const PROJ = { listingKey:1, streetNumber:1, streetName:1, unitNumber:1, city:1, propertyType:1,
  listPrice:1, standardStatus:1, listAgentName:1, coListAgentName:1, listOfficeName:1,
  photos: { $size: { $ifNull: ["$media", []] } } };
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  // agent's own name must always be in the pool (auto-posting.md)
  const rows = await db.collection("unifiedlistings").aggregate([
    { $match: { standardStatus: "Active", $or: [
      { listAgentName: /sardella/i }, { coListAgentName: /sardella/i },
      { listAgentName: /klaess/i }, { coListAgentName: /klaess/i },
    ] } },
    { $project: PROJ }, { $sort: { listPrice: -1 } },
  ], { allowDiskUse: true }).toArray();
  const everQueued = await db.collection("pendingposts").distinct("listingKey");
  console.log("sardella/klaess actives:", rows.length);
  for (const r of rows) {
    const addr = [r.streetNumber, r.streetName, r.unitNumber?("#"+r.unitNumber):""].filter(Boolean).join(" ");
    console.log([r.listingKey, r.propertyType, "$"+r.listPrice, "ph"+r.photos,
      (addr+", "+r.city).slice(0,40), everQueued.includes(r.listingKey)?"queued":"FRESH",
      String(r.listAgentName||"-"), "/", String(r.coListAgentName||"-")].join(" | "));
  }
  // queue state
  const agg = await db.collection("pendingposts").aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray();
  console.log("\nqueue by status:", JSON.stringify(agg));
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
