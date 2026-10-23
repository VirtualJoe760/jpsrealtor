require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
  await c.connect(); const db = c.db();
  const posted = await db.collection("pendingposts").find({ status: "posted" },
    { projection: { listingKey:1, approvalCode:1, postedAt:1, permalink:1, "listingSnapshot.address":1 } }).toArray();
  console.log("POSTED:", posted.length);
  for (const p of posted) console.log(" ", p.approvalCode, p.listingKey, p.listingSnapshot?.address, p.postedAt);
  console.log("\nApache 20260527231221167213000000 ever queued?",
    await db.collection("pendingposts").countDocuments({ listingKey: "20260527231221167213000000" }));
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
