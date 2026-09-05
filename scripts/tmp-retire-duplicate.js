// Scratch: retire the losing build when one listing holds two live PendingPosts.
// source-post.md §4: "Pick the better build and delete the other — the record
// *and* its Cloudinary assets — before you report." 71817 Samarkand queued twice
// on 2026-08-16 (R4 and F2) and both sat awaiting_review for 20 days, which is
// the duplicate the skill says is the agent's problem to untangle. Safe to delete.
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const { v2: cloudinary } = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
(async () => {
  const [id, keepId] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const p = await db.collection("pendingposts").findOne({ _id: new ObjectId(id) });
  if (!p) throw new Error("no such post");
  const keeper = await db.collection("pendingposts").findOne({ _id: new ObjectId(keepId) });
  if (!keeper) throw new Error("keeper not found");
  if (keeper.listingKey !== p.listingKey) throw new Error("keeper is a different listing — refusing");
  if (p.status === "posted") throw new Error("refusing to delete a posted record");
  // Only the uploaded derivatives carry a publicId; text/CTA slides are pure
  // transformations over `sample` and own no asset to destroy.
  const keeperIds = new Set((keeper.slides || []).map((s) => s.publicId).filter(Boolean));
  for (const s of p.slides || []) {
    if (!s.publicId) continue;
    if (keeperIds.has(s.publicId)) { console.log("shared with keeper, kept:", s.publicId); continue; }
    await cloudinary.uploader.destroy(s.publicId).then(
      (r) => console.log("destroy", s.publicId, r.result),
      (e) => console.log("destroy failed (harmless):", e.message)
    );
  }
  await db.collection("pendingposts").deleteOne({ _id: p._id });
  console.log(`deleted ${p.approvalCode} (${p.slides.length} slides) — kept ${keeper.approvalCode}`);
  await mongoose.disconnect();
})();
