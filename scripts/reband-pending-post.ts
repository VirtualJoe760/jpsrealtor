/**
 * Re-apply the room band (label + caption) to an ALREADY-STAGED PendingPost.
 *
 *   npx ts-node -O '{"module":"commonjs"}' scripts/reband-pending-post.ts <slug> <postId> <room,room,room>
 *
 * Why this exists: staging is the expensive, non-deterministic half of the
 * pipeline — ~3 minutes and a Gemini render per photo, and `selectStagingPhotos`
 * returns a different set every run, so re-running the generator to fix a typo
 * throws away good renders and gambles on getting comparable ones back. The
 * band, by contrast, is a pure Cloudinary transformation over a public_id that
 * is already stored on the record.
 *
 * The captions are the part that gets edited most, because a caption can only
 * be judged against the frame the stager happened to pick — 1062 E Via San
 * Michael shipped "granite island, gas cooktop, and the pool through the slider"
 * over a frame containing the island and neither of the other two.
 *
 * Rooms are passed in because the PendingPost stores no per-slide room key —
 * only kind/url/publicId. Read them off the build log's PASS lines, in order.
 */
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";

const { buildBannerTransform } = require("../src/lib/cover-templates/carousel-slides.js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Kept in sync with build-pending-post.ts by hand. Duplicated rather than
// exported because that file is a top-level script, not a module.
//
// THE `outdoor` KEY IS LOAD-BEARING AND THIS COPY WAS MISSING IT. Without it,
// ROOM_LABELS["outdoor"] is undefined and the lookup falls through to
// ROOM_LABELS[norm("outdoor")] === "THE POOL DECK". 83633 Lapis Drive
// (poolYN: false) was banded OUTDOOR LIVING correctly by the generator, and
// then a caption-only reband silently RE-labelled the same covered patio as a
// pool deck — a false claim about another brokerage's listing, on a slide
// nothing else was changing. This is the identical failure 46109 Roadrunner
// Lane caught in build-pending-post.ts; hand-syncing the table reintroduced it
// in the one script whose whole purpose is to leave the render alone.
const ROOM_LABELS: Record<string, string> = {
  living: "THE GREAT ROOM", kitchen: "THE KITCHEN", dining: "THE DINING ROOM",
  primary_bedroom: "THE PRIMARY", bedroom: "THE BEDROOM", game_room: "THE GAME ROOM",
  office: "THE OFFICE", outdoor: "OUTDOOR LIVING", outdoor_living: "OUTDOOR LIVING",
  pool: "THE POOL DECK", exterior: "THE GROUNDS", other: "INSIDE",
};
const ROOM_ALIASES: Record<string, string> = {
  great_room: "living", outdoor: "pool", outdoor_living: "pool",
  bedroom: "primary_bedroom", office: "living", other: "living",
};
const norm = (r: string) => ROOM_ALIASES[r] || r;

(async () => {
  const [slug, postId, roomArg] = process.argv.slice(2);
  if (!slug || !postId || !roomArg) {
    throw new Error("usage: reband-pending-post.ts <slug> <postId> <room,room,...>");
  }
  const rooms = roomArg.split(",").map((s) => s.trim());
  const CFG = require(`./data/pending/${slug}`).default ?? require(`./data/pending/${slug}`);

  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;
  const post: any = await db.collection("pendingposts").findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error(`post ${postId} not found`);
  if (post.status !== "awaiting_review") {
    throw new Error(`post is ${post.status}, not awaiting_review — refusing to touch it`);
  }

  const roomSlides = post.slides.filter((s: any) => s.kind === "room");
  if (roomSlides.length !== rooms.length) {
    throw new Error(`post has ${roomSlides.length} room slides, got ${rooms.length} rooms`);
  }

  const slides = post.slides.map((s: any) => ({ ...s }));
  let i = 0;
  for (const s of slides) {
    if (s.kind !== "room") continue;
    const room = rooms[i++];
    const key = norm(room);
    const label = ROOM_LABELS[room] || ROOM_LABELS[key] || "INSIDE";
    const byRoom = (CFG.rooms || []).find((r: any) => norm(r.room) === key);
    const caption = byRoom?.caption || CFG.fallbackCaption || "";
    if (!byRoom) console.log(`   note: no caption written for "${room}" — using the spare line`);
    s.url = cloudinary.url(s.publicId, { transformation: buildBannerTransform(label, caption) });
    console.log(`   slide ${s.n}  ${room} -> ${label}\n      ${caption}`);
  }

  await db.collection("pendingposts").updateOne(
    { _id: post._id },
    { $set: { slides, updatedAt: new Date() } }
  );
  console.log(`\nREBANDED  ${post.approvalCode}  ${roomSlides.length} room slides`);
  await mongoose.disconnect();
})().catch((e) => { console.error("\nfatal:", e.message); process.exit(1); });
