require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const q = process.argv[2];
  const rows = await db.collection("pendingposts").find(
    /^[0-9a-f]{24}$/.test(q) ? { _id: new (require("mongodb").ObjectId)(q) } : { listingKey: q }
  ).toArray();
  for (const r of rows) {
    console.log("\n=== _id", String(r._id), "| code", r.approvalCode, "| status", r.status, "| created", new Date(r.createdAt).toISOString().slice(0,10));
    console.log("slides:", (r.slides||[]).length, "| photoIndexes:", JSON.stringify(r.generation?.photoIndexes || r.photoIndexes || null));
    (r.slides||[]).forEach((s,i)=>console.log("  ", i+1, s.publicId || s.url || JSON.stringify(s).slice(0,120)));
    if (r.caption) console.log("caption:", String(r.caption).slice(0,400));
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
