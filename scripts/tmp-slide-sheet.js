require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient, ObjectId } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const r = await db.collection("pendingposts").findOne({ _id: new ObjectId(process.argv[2]) });
  for (const s of r.slides) console.log(s.url);
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
