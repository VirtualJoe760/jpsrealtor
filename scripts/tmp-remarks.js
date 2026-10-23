require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  console.log("REMARKS:\n" + l.publicRemarks + "\n");
  console.log("privateRemarks:", l.privateRemarks || "-");
  console.log("laundry:", l.laundryFeatures, "| lotFeatures:", l.lotFeatures);
  console.log("exteriorFeatures:", l.exteriorFeatures, "| patio:", l.patioAndPorchFeatures);
  console.log("poolFeatures:", l.poolFeatures, "| utilities:", l.utilities);
  console.log("\n=== MEDIA (first 60) ===");
  (l.media||[]).slice(0,60).forEach((m,i) => console.log(String(i).padStart(2), (m.Caption||m.caption||"-").slice(0,60).padEnd(62), (m.MediaURL||m.mediaURL||m.uri1600||"").slice(0,110)));
  await mongoose.disconnect();
})();
