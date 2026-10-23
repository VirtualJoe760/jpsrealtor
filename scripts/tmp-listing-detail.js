require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
const KEY = process.argv[2];
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: KEY });
  const skip = new Set(["media","_id","__v","rawData","geo","location"]);
  for (const [k,v] of Object.entries(l)) {
    if (skip.has(k)) continue;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (s === "null" || s === "" || s === "undefined") continue;
    console.log(k.padEnd(32), s.slice(0, 700));
  }
  console.log("\nmedia count:", (l.media||[]).length);
  await mongoose.disconnect();
})();
