require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
const TEAM = "20230905131838052805000000";
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection("unifiedlistings");

  const byKey = { $or: [{ listAgentTeamKey: TEAM }, { coListAgentId: TEAM }] };
  const byName = { $or: [
    { coListAgentName: /obsidian/i },
    { listAgentName: /obsidian/i },
    { coListOfficeName: /obsidian/i },
    { listOfficeName: /obsidian/i },
  ]};

  const a = await col.countDocuments({ standardStatus: "Active", ...byKey });
  const b = await col.countDocuments({ standardStatus: "Active", ...byName });
  console.log("actives by team key:", a, " by obsidian name:", b);

  // union
  const union = await col.find({ standardStatus:"Active", $or: [ byKey.$or, byName.$or ].flat() }).toArray();
  console.log("union actives:", union.length);

  const queued = await db.collection("pendingposts").distinct("listingKey", {});
  const fresh = union.filter(l => !queued.includes(l.listingKey));
  console.log("union never-queued:", fresh.length);
  for (const c of fresh) {
    console.log([
      String(c.listingKey).padEnd(28),
      ("$"+(c.listPrice||0).toLocaleString()).padEnd(12),
      String(c.unparsedAddress||"?").slice(0,42).padEnd(44),
      "type=" + (c.propertyType||"?"),
      " photos=" + (c.media||[]).length,
      " onMkt=" + String(c.onMarketDate||"").slice(0,10),
      " furn=" + (c.furnished||"-"),
    ].join(""));
  }
  await mongoose.disconnect();
})();
