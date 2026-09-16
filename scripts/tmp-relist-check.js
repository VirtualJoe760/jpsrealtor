require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 120000, socketTimeoutMS: 900000 });
  await c.connect(); const db = c.db();
  const posts = await db.collection("pendingposts").find({ status: "awaiting_review" }).project({approvalCode:1,listingKey:1,"listingSnapshot.address":1,"listingSnapshot.city":1,"listingSnapshot.price":1,slides:1,createdAt:1}).toArray();
  const active = new Set(await db.collection("unifiedlistings").distinct("listingKey", { standardStatus: "Active" }));
  const stale = posts.filter(p => !active.has(p.listingKey));
  console.log("stale awaiting_review:", stale.length, "\n");
  for (const p of stale) {
    const s = p.listingSnapshot || {};
    const num = String(s.address||"").trim().split(/\s+/)[0];
    const rest = String(s.address||"").trim().split(/\s+/).slice(1).join(" ");
    console.log("=====", p.approvalCode, "|", s.address, ",", s.city, "|", s.price, "| slides", (p.slides||[]).length, "| built", String(p.createdAt).slice(0,10));
    const rel = await db.collection("unifiedlistings").find({ streetNumber: num, city: s.city })
      .project({listingKey:1,streetNumber:1,streetName:1,city:1,standardStatus:1,listPrice:1,onMarketDate:1,photos:{$size:{$ifNull:["$media",[]]}}}).toArray();
    const hits = rel.filter(r => String(r.streetName||"").toLowerCase().split(" ")[0] === rest.toLowerCase().split(" ")[0].replace(/^n\.?$/,""));
    const show = hits.length ? hits : rel;
    if (!show.length) console.log("   NO active/any row for", num, rest, s.city);
    for (const r of show) console.log("   ->", r.listingKey, r.standardStatus, "$"+r.listPrice, r.streetNumber, r.streetName, r.city, "ph"+r.photos, String(r.onMarketDate).slice(0,10));
    const closed = await db.collection("unified_closed_listings").countDocuments({ listingKey: p.listingKey });
    console.log("   original key in closed collection:", closed);
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
