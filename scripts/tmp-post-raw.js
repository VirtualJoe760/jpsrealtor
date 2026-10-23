require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient, ObjectId } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const r = await db.collection("pendingposts").findOne({ _id: new ObjectId(process.argv[2]) });
  console.log(JSON.stringify(r, null, 1).slice(0, 6000));
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
