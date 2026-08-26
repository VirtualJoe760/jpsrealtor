// Scratch: re-render the TEXT and CTA slides of a queued PendingPost from the
// current scripts/data/pending/<slug>.ts, and refresh the caption.
//
// Same principle as reband-pending-post.ts: these slides are pure Cloudinary
// transformations over the "sample" asset, so a wording fix costs no Gemini and
// re-rolls no staging. Used when copy was corrected after a build had already
// required the config. Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { ObjectId } from "mongodb";
const { buildTextPostTransformation, buildCtaTransformation } =
  require("../src/lib/cover-templates/carousel-slides.js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const HANDLE = "@instadella";

(async () => {
  const [slug, id] = process.argv.slice(2);
  const CFG = require(`./data/pending/${slug}`).default ?? require(`./data/pending/${slug}`);
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db as any;
  const p = await db.collection("pendingposts").findOne({ _id: new ObjectId(id) });
  if (!p) throw new Error("no such post");
  if (p.status !== "awaiting_review") throw new Error("refusing: status " + p.status);

  const texts = CFG.textPosts.map((t: any) =>
    cloudinary.url("sample", { transformation: buildTextPostTransformation(t, HANDLE) })
  );
  // The CTA is left alone on purpose: buildCtaTransformation needs the agent
  // record's name and licence and the headshot/logo public_ids, all of which
  // live in build-pending-post.ts. Re-deriving them here to rebuild a slide
  // whose copy did not change is how you ship a broken CTA.

  let ti = 0, changed = 0;
  const slides = p.slides.map((s: any) => {
    let url = s.url;
    if (s.kind === "text") url = texts[ti++] ?? s.url;
    if (url !== s.url) changed++;
    return { ...s, url };
  });
  if (ti !== texts.length) throw new Error(`config has ${texts.length} text slides, record has ${ti}`);

  await db.collection("pendingposts").updateOne(
    { _id: p._id },
    { $set: { slides, caption: CFG.caption, updatedAt: new Date() } }
  );
  console.log(`re-rendered ${ti} text slide(s); ${changed} URL(s) changed; caption refreshed`);
  await mongoose.disconnect();
})();
