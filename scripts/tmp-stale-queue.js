require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 120000 });
  await c.connect(); const db = c.db();
  const posts = await db.collection("pendingposts")
    .find({ status: "awaiting_review" }, { projection: { listingKey:1, approvalCode:1, createdAt:1 } })
    .sort({ createdAt: 1 }).toArray();
  const keys = [...new Set(posts.map(p=>p.listingKey))];
  const rows = await db.collection("unifiedlistings").aggregate([
    { $match: { listingKey: { $in: keys } } },
    { $project: { listingKey:1, standardStatus:1, streetNumber:1, streetName:1, unitNumber:1, city:1, listPrice:1, modificationTimestamp:1 } },
  ], { allowDiskUse: true }).toArray();
  const map = new Map(rows.map(r=>[r.listingKey,r]));
  console.log("awaiting_review posts:", posts.length, "| distinct listings:", keys.length, "\n");
  for (const p of posts) {
    const r = map.get(p.listingKey);
    const addr = r ? [r.streetNumber,r.streetName,r.unitNumber?("#"+r.unitNumber):"",", "+r.city].filter(Boolean).join(" ") : "(no listing row)";
    console.log([String(p.approvalCode||"--").padEnd(4), new Date(p.createdAt).toISOString().slice(0,10),
      String(r?r.standardStatus:"MISSING").padEnd(12), addr.slice(0,44).padEnd(46)].join(" | "));
  }
  const stale = keys.filter(k => { const r = map.get(k); return !r || r.standardStatus !== "Active"; });
  console.log("\nlistings in queue no longer Active:", stale.length);
  for (const k of stale) { const r = map.get(k); console.log("  ", k, r ? r.standardStatus + " | " + [r.streetNumber,r.streetName,r.city].join(" ") : "MISSING"); }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
