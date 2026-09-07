// Scratch: copy one staged room slide from a DONOR PendingPost into a KEEPER,
// as a new room slide banded from the keeper's config. Safe to delete.
//
// Why this exists, once: the generator always inserts a fresh PendingPost and
// never supersedes, so a rebuild aimed at fixing one bad render produces a
// second build with its own independent draw. 57730 Cantata Drive ended up with
// build 1 holding a good kitchen and a good great room, and build 2 — run to
// replace a render that had the agent standing in the swimming pool — holding a
// good outdoor frame and nothing else new. Neither build was shippable alone at
// 2 room slides; together they are three.
//
// Grafting is only defensible because a staged slide is self-contained: the
// Cloudinary asset is a finished composite of THIS listing's photo, and the
// band over it is a pure transform read from the keeper's own config. Nothing
// is fabricated and nothing crosses between listings. The asset is COPIED into
// the keeper's folder rather than referenced, so retiring the donor afterwards
// cannot destroy a slide the keeper is still serving.
//
//   node scripts/tmp-graft-slide.js <keeperId> <donorId> <donorSlideN> <room>
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
// The pending configs are TypeScript; build-pending-post.ts only resolves them
// because it is itself run under ts-node. This script is plain node, so it has
// to register the compiler before requiring one.
// skipProject, because the repo tsconfig sets options that make ts-node refuse
// to register from a .js entrypoint (TS5095).
require("ts-node").register({
  skipProject: true,
  transpileOnly: true,
  compilerOptions: { module: "commonjs", target: "es2019" },
});
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const { v2: cloudinary } = require("cloudinary");
const { buildBannerTransform } = require("../src/lib/cover-templates/carousel-slides.js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Kept in sync with build-pending-post.ts and reband-pending-post.ts by hand.
// `outdoor` must be present: without it the lookup falls through to
// norm("outdoor") === "pool" and labels a dry patio THE POOL DECK, which is a
// false claim about another brokerage's listing (46109 Roadrunner Lane).
const ROOM_LABELS = {
  living: "THE GREAT ROOM", kitchen: "THE KITCHEN", dining: "THE DINING ROOM",
  primary_bedroom: "THE PRIMARY", bedroom: "THE BEDROOM", game_room: "THE GAME ROOM",
  office: "THE OFFICE", outdoor: "OUTDOOR LIVING", outdoor_living: "OUTDOOR LIVING",
  pool: "THE POOL DECK", exterior: "THE GROUNDS", other: "INSIDE",
};
const ROOM_ALIASES = {
  great_room: "living", outdoor: "pool", outdoor_living: "pool",
  bedroom: "primary_bedroom", office: "living", other: "living",
};
const norm = (r) => ROOM_ALIASES[r] || r;

(async () => {
  const [keeperId, donorId, nStr, room] = process.argv.slice(2);
  if (!keeperId || !donorId || !nStr || !room) {
    throw new Error("usage: tmp-graft-slide.js <keeperId> <donorId> <donorSlideN> <room>");
  }
  const donorN = Number(nStr);

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const keeper = await db.collection("pendingposts").findOne({ _id: new ObjectId(keeperId) });
  const donor = await db.collection("pendingposts").findOne({ _id: new ObjectId(donorId) });
  if (!keeper) throw new Error("keeper not found");
  if (!donor) throw new Error("donor not found");
  if (keeper.status !== "awaiting_review") throw new Error(`keeper is ${keeper.status}`);
  if (String(keeper.listingKey) !== String(donor.listingKey)) {
    throw new Error("refusing to graft across listings");
  }

  const src = donor.slides.find((s) => s.n === donorN);
  if (!src) throw new Error(`donor has no slide ${donorN}`);
  if (src.kind !== "room") throw new Error(`donor slide ${donorN} is ${src.kind}, not a room slide`);

  const slug = keeper.generation && keeper.generation.slug;
  const CFG = require(`./data/pending/${slug || "cantata-drive"}`).default
    ?? require(`./data/pending/${slug || "cantata-drive"}`);

  // No copy. Both builds of the same slug upload into the same folder
  // (jpsrealtor/pending/<slug>/staged), so the asset is already where it
  // belongs and re-uploading would only orphan a duplicate. The consequence is
  // that retiring the donor MUST NOT blanket-destroy its assets — see
  // tmp-retire-cantata-loser.js, which skips any publicId the keeper still
  // serves.
  const copied = { public_id: src.publicId };

  const key = norm(room);
  const label = ROOM_LABELS[room] || ROOM_LABELS[key] || "INSIDE";
  const byRoom = (CFG.rooms || []).find((r) => norm(r.room) === key);
  const caption = (byRoom && byRoom.caption) || CFG.fallbackCaption || "";

  // Insert after the last existing room slide, then renumber everything.
  const slides = keeper.slides.map((s) => ({ ...s }));
  const lastRoomIdx = slides.map((s) => s.kind).lastIndexOf("room");
  const inserted = {
    ...src,
    kind: "room",
    publicId: copied.public_id,
    url: cloudinary.url(copied.public_id, { transformation: buildBannerTransform(label, caption) }),
  };
  slides.splice(lastRoomIdx + 1, 0, inserted);
  slides.forEach((s, i) => { s.n = i + 1; });

  const donorIdx = (donor.generation && donor.generation.photoIndexes) || [];
  const donorRoomSlides = donor.slides.filter((s) => s.kind === "room").map((s) => s.n);
  const photoIndex = donorIdx[donorRoomSlides.indexOf(donorN)];
  const idx = ((keeper.generation && keeper.generation.photoIndexes) || []).slice();
  const keeperRoomPos = slides.filter((s) => s.kind === "room").findIndex((s) => s.publicId === copied.public_id);
  if (photoIndex != null) idx.splice(keeperRoomPos, 0, photoIndex);

  await db.collection("pendingposts").updateOne(
    { _id: keeper._id },
    { $set: { slides, "generation.photoIndexes": idx, updatedAt: new Date() } }
  );

  console.log(`grafted donor slide ${donorN} (#${photoIndex}, ${room} -> ${label})`);
  console.log(`   ${caption}`);
  console.log(`now ${slides.length} slides | photoIndexes: ${JSON.stringify(idx)}`);
  await mongoose.disconnect();
})().catch((e) => { console.error("fatal:", e.message); process.exit(1); });
