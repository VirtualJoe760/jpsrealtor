require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const l = await mongoose.connection.db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  const skip = new Set(["media","_id"]);
  for (const [k,v] of Object.entries(l)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined || v === "" ) continue;
    console.log(k + ": " + JSON.stringify(v).slice(0,300));
  }
  await mongoose.disconnect();
})();
