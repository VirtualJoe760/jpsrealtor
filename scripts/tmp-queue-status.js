require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const rows = await db.collection("pendingposts").find({}).sort({ createdAt: 1 }).toArray();
  console.log("total pendingposts: " + rows.length);
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status]||0)+1;
  console.log(JSON.stringify(byStatus));
  console.log();
  for (const r of rows) {
    console.log([
      String(r.status||"?").padEnd(10),
      String(r.approvalCode||"--").padEnd(6),
      String(r.listingKey||"").padEnd(28),
      String((r.listing&&(r.listing.address||r.listing.unparsedAddress))||r.slug||"").slice(0,44).padEnd(46),
      "slides=" + ((r.slides||[]).length),
      "  " + (r.createdAt ? new Date(r.createdAt).toISOString().slice(0,10) : "?"),
    ].join(""));
  }
  await mongoose.disconnect();
})();
