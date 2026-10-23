require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000, socketTimeoutMS: 180000 });
  await c.connect(); const db = c.db();
  const col = db.collection("unifiedlistings");
  for (const f of ["listAgentFullName","coListAgentFullName","listAgentName","coListAgentName","listAgentTeamKey","coListAgentId","listAgentMlsId","coListAgentMlsId","listAgentKey","coListAgentKey"]) {
    const n = await col.countDocuments({ [f]: { $exists: true, $ne: null } }, { maxTimeMS: 120000 });
    console.log(f.padEnd(24), n);
  }
  const sample = await col.findOne({ listAgentTeamKey: "20230905131838052805000000" });
  console.log("\nagent-ish fields on a team doc:");
  for (const k of Object.keys(sample)) if (/agent|office|team/i.test(k)) console.log("  ", k, "=", JSON.stringify(sample[k]).slice(0,80));
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
