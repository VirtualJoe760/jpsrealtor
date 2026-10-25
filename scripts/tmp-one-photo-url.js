// Scratch: print the first media URL for a listingKey, so tmp-gemini-probe.ts
// can be pointed at a real frame. Safe to delete.
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  const urls = (l.media || []).map((m) => m.MediaURL || m.uri2048 || m.url).filter(Boolean);
  console.log(urls[0]);
  await mongoose.disconnect();
})();
