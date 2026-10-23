require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
const TEAM = "20230905131838052805000000";
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  for (const q of ["Warren Vista","Apache Trail","Harbor Drive","San Diego"]) {
    const rows = await db.collection("unifiedlistings").find({ unparsedAddress: new RegExp(q,"i"), $or:[{listAgentTeamKey:TEAM},{coListAgentId:TEAM}] }).project({listingKey:1,unparsedAddress:1,standardStatus:1,listPrice:1,photosCount:1}).toArray();
    console.log(q + ":", rows.map(r=>`${r.unparsedAddress} [${r.standardStatus}] $${r.listPrice} ${r.photosCount}ph ${r.listingKey}`).join(" | ") || "none");
  }
  // any pendingpost for those?
  const pp = await db.collection("pendingposts").find({}, {projection:{listingKey:1,status:1,"listingSnapshot.address":1}}).toArray();
  console.log("\nall pendingposts:", pp.length);
  await mongoose.disconnect();
})();
