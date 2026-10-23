require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const rows = await db.collection("pendingposts").find({ listingKey: { $exists: true } })
    .project({ approvalCode:1, listingKey:1, status:1, createdAt:1, slides:1, "listingSnapshot.address":1 }).toArray();
  const byKey = {};
  rows.forEach(r => (byKey[r.listingKey] = byKey[r.listingKey] || []).push(r));
  Object.values(byKey).filter(v => v.length > 1).forEach(v => {
    console.log("DUPLICATE listingKey " + v[0].listingKey + " — " + (v[0].listingSnapshot?.address||"?"));
    v.forEach(r => console.log("   " + r.approvalCode + "  " + r.status + "  slides=" + (r.slides||[]).length + "  " + new Date(r.createdAt).toISOString() + "  _id=" + r._id));
  });
  await mongoose.disconnect();
})();
