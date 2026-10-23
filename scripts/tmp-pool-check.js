// Scratch: pool + queue state for the daily-carousel run. Safe to delete.
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");

const TEAM = "20230905131838052805000000";

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const all = await db.collection("pendingposts")
    .find({}, { projection: { listingKey: 1, status: 1, address: 1, approvalCode: 1, createdAt: 1, slides: 1 } })
    .sort({ createdAt: 1 }).toArray();

  console.log("=== pendingposts (" + all.length + ") ===");
  for (const p of all) {
    console.log([
      String(p._id),
      String(p.status || "").padEnd(16),
      String(p.approvalCode || "--").padEnd(4),
      String(p.listingKey || "").padEnd(26),
      String(p.address || "").slice(0, 40).padEnd(42),
      "slides=" + ((p.slides || []).length),
      p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "",
    ].join(" | "));
  }

  const posted = await db.collection("pendingposts").distinct("listingKey", { status: "posted" });
  const everQueued = await db.collection("pendingposts").distinct("listingKey");
  console.log("\nposted keys:", posted.length, "| ever queued keys:", everQueued.length);

  const team = await db.collection("unifiedlistings").find({
    standardStatus: "Active",
    $or: [{ listAgentTeamKey: TEAM }, { coListAgentId: TEAM }],
  }).toArray();

  console.log("\n=== team actives: " + team.length + " ===");
  const rows = team.map((l) => ({
    key: l.listingKey,
    addr: [l.streetNumber, l.streetName, l.unitNumber ? "#" + l.unitNumber : ""].filter(Boolean).join(" "),
    city: l.city,
    type: l.propertyType,
    price: l.listPrice,
    photos: l.photosCount != null ? l.photosCount : (l.media || []).length,
    subdivision: l.subdivisionName,
    onMarket: l.onMarketDate ? new Date(l.onMarketDate).toISOString().slice(0, 10) : "",
    posted: posted.includes(l.listingKey),
    queued: everQueued.includes(l.listingKey),
  })).sort((a, b) => (b.price || 0) - (a.price || 0));

  for (const r of rows) {
    console.log([
      r.key.padEnd(26), (r.type || "?"), String(r.price).padStart(9),
      ("ph" + r.photos).padEnd(6),
      (r.addr + ", " + r.city).slice(0, 44).padEnd(46),
      String(r.subdivision || "").slice(0, 22).padEnd(24),
      r.onMarket,
      r.posted ? "POSTED" : (r.queued ? "queued" : "FRESH"),
    ].join(" | "));
  }

  console.log("\nFRESH (never in pendingposts), type A:", rows.filter(r => !r.queued && r.type === "A").length);
  console.log("NEVER POSTED, type A, >=12 photos:", rows.filter(r => !r.posted && r.type === "A" && r.photos >= 12).length);

  await mongoose.disconnect();
})();
