require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  (l.media||[]).forEach(m => console.log(m.MediaURL||m.mediaURL||m.uri1600||""));
  await mongoose.disconnect();
})();
