require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const waiting = await db.collection("pendingposts")
    .find({ status: "awaiting_review" }, { projection: { approvalCode:1, listingKey:1, createdAt:1, slides:1, "listingSnapshot.address":1, "listingSnapshot.city":1 } })
    .sort({ createdAt: 1 }).toArray();
  console.log("AWAITING REVIEW: " + waiting.length);
  for (const p of waiting) {
    console.log("  " + String(p.approvalCode).padEnd(4) +
      String((p.listingSnapshot&&p.listingSnapshot.address)||"?").slice(0,34).padEnd(36) +
      String((p.listingSnapshot&&p.listingSnapshot.city)||"").slice(0,18).padEnd(20) +
      "slides=" + (p.slides||[]).length + "  " + new Date(p.createdAt).toISOString().slice(0,10));
  }
  const codes = waiting.map(p=>p.approvalCode);
  const dupes = codes.filter((c,i)=>codes.indexOf(c)!==i);
  console.log("\nduplicate approval codes in queue:", dupes.length ? [...new Set(dupes)].join(",") : "none");
  console.log("approved (not yet posted):", await db.collection("pendingposts").countDocuments({ status:"approved" }));
  console.log("posted:", await db.collection("pendingposts").countDocuments({ status:"posted" }));
  await mongoose.disconnect();
})();
