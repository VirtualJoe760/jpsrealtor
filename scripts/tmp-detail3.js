require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const key = process.argv[2];
  const r = await db.collection("unifiedlistings").findOne({ listingKey: key }, { projection: { media: 0 } });
  if (!r) { console.log("not found"); await c.close(); return; }
  for (const k of Object.keys(r)) {
    const v = r[k];
    if (v === null || v === undefined || v === "" ) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    console.log(k + " = " + JSON.stringify(v).slice(0, 900));
  }
  const m = await db.collection("unifiedlistings").findOne({ listingKey: key }, { projection: { media: 1 } });
  console.log("\nMEDIA count:", (m.media||[]).length);
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
