require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const p = await db.collection("pendingposts").findOne({ _id: new ObjectId(process.argv[2]) });
  console.log("status:", p.status, "| code:", p.approvalCode, "| slides:", p.slides.length);
  console.log("photoIndexes:", JSON.stringify(p.generation.photoIndexes));
  p.slides.forEach(s => console.log(s.n, s.kind, "\n   ", s.url));
  await mongoose.disconnect();
})();
