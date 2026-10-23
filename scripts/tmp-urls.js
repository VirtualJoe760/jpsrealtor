require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const r = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] }, { projection: { media: 1 } });
  for (const m of (r.media || [])) {
    console.log(m.uri1024 || m.Uri1024 || m.uri800 || m.uriLarge || m.uri640);
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
