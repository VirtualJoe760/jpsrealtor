require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
const TEAM = "20230905131838052805000000";
const KEYS = ["20260818204024734236000000","20260413015035446628000000","20260626022823230603000000"];
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
  await c.connect(); const db = c.db();
  const rows = await db.collection("unifiedlistings").aggregate([
    { $match: { listingKey: { $in: KEYS } } },
    { $project: { listingKey:1, standardStatus:1, streetNumber:1, streetName:1, city:1,
      listAgentTeamKey:1, coListAgentId:1, listAgentMlsId:1, listAgentFullName:1,
      coListAgentFullName:1, listOfficeName:1, coListOfficeName:1, modificationTimestamp:1 } },
  ]).toArray();
  for (const r of rows) console.log(JSON.stringify(r, null, 1));
  console.log("\nTEAM =", TEAM);
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
