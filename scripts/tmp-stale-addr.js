require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
const KEYS = ["20260203160658521251000000","20260506205122773540000000","20260501212503801855000000","20260819022822999139000000"];
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
  await c.connect(); const db = c.db();
  for (const k of KEYS) {
    const p = await db.collection("pendingposts").findOne({ listingKey: k, status: "awaiting_review" }, { projection: { listingSnapshot:1, approvalCode:1, createdAt:1 } });
    const s = p && p.listingSnapshot || {};
    console.log(String(p.approvalCode).padEnd(4), new Date(p.createdAt).toISOString().slice(0,10),
      JSON.stringify({ addr: s.address || s.unparsedAddress || [s.streetNumber,s.streetName,s.city].filter(Boolean).join(" "), city: s.city, price: s.listPrice, sub: s.subdivisionName }));
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
