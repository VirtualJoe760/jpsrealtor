require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const rows = await db.collection("pendingposts").find({}, { projection: { slides: 0 } }).sort({ createdAt: 1 }).toArray();
  for (const r of rows) {
    console.log([String(r.status).padEnd(16), String(r.approvalCode||"--").padEnd(4),
      String(r.listingKey).padEnd(26),
      String(r.address || r.listingAddress || r.title || "?").slice(0,42).padEnd(44),
      new Date(r.createdAt).toISOString().slice(0,10),
      r.declinedAt ? ("dec:"+new Date(r.declinedAt).toISOString().slice(0,10)) : "",
      r.declineReason ? String(r.declineReason).slice(0,60) : "",
    ].join(" "));
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
