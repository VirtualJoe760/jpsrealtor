require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
const TEAM = "20230905131838052805000000";
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const used = await db.collection("pendingposts").distinct("listingKey", {});
  const cands = await db.collection("unifiedlistings").find({
    standardStatus: "Active",
    $or: [{ listAgentTeamKey: TEAM }, { coListAgentId: TEAM }],
    listingKey: { $nin: used },
  }).sort({ listPrice: -1 }).toArray();
  console.log("total unposted/unqueued candidates: " + cands.length + "\n");
  for (const c of cands) {
    const photos = (c.media||[]).length;
    console.log([
      String(c.listingKey).padEnd(14),
      ("$"+(c.listPrice||0).toLocaleString()).padEnd(12),
      String(c.unparsedAddress||c.address||"?").slice(0,38).padEnd(40),
      String(c.city||"").slice(0,18).padEnd(20),
      String(c.propertySubType||c.propertyType||"").slice(0,14).padEnd(16),
      "photos=" + photos,
      " bd=" + (c.bedroomsTotal||"?") + " ba=" + (c.bathroomsTotalInteger||"?"),
      " sqft=" + (c.livingArea||"?"),
    ].join(""));
  }
  await mongoose.disconnect();
})();
