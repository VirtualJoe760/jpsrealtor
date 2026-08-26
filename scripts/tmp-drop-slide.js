// Scratch: remove one slide from a queued PendingPost and renumber the rest.
// Used when a single staged render is wrong and the rest of the build is good —
// docs/content-templates/auto-posting.md §"Re-measured 2026-08-23" says drop the
// slide rather than re-roll a build whose other renders passed. Safe to delete.
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
  const [id, nStr] = process.argv.slice(2);
  const drop = Number(nStr);
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const p = await db.collection("pendingposts").findOne({ _id: new ObjectId(id) });
  if (!p) throw new Error("no such post");
  const gone = p.slides.find((s) => s.n === drop);
  if (!gone) throw new Error(`slide ${drop} not on this post`);
  const kept = p.slides.filter((s) => s.n !== drop).map((s, i) => ({ ...s, n: i + 1 }));
  // generation.photoIndexes is positional against the ROOM slides in order, so
  // the dropped room's index has to come out too or a regenerate would rebuild
  // the wrong frame.
  const roomOrder = p.slides.filter((s) => s.kind === "room").map((s) => s.n);
  const gen = { ...p.generation };
  if (gone.kind === "room") {
    const at = roomOrder.indexOf(drop);
    gen.photoIndexes = (gen.photoIndexes || []).filter((_, i) => i !== at);
  }
  await db.collection("pendingposts").updateOne(
    { _id: p._id },
    { $set: { slides: kept, generation: gen, updatedAt: new Date() } }
  );
  if (gone.publicId) {
    await cloudinary.uploader.destroy(gone.publicId).then(
      (r) => console.log("cloudinary destroy:", gone.publicId, r.result),
      (e) => console.log("cloudinary destroy failed (harmless):", e.message)
    );
  }
  console.log(`dropped slide ${drop} (${gone.kind}); now ${kept.length} slides`);
  console.log("photoIndexes:", JSON.stringify(gen.photoIndexes));
  await mongoose.disconnect();
})();
