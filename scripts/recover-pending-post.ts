/**
 * Re-render the COVER slide of an already-queued PendingPost.
 *
 *   npx ts-node -O '{"module":"commonjs"}' scripts/recover-pending-post.ts <slug> <postId> [photoIndex]
 *
 * Same reasoning as reband-pending-post.ts, applied to slide 1. The cover is a
 * pure Cloudinary transformation over a base photo — no depth model, no Gemini
 * render, no identity gate — so a cover that needs fixing does not justify
 * re-running the generator and re-gambling three good staged frames on a fresh
 * `selectStagingPhotos` draw.
 *
 * Two things bring you here:
 *   - the accent colour or hook changed in the config
 *   - the template changed (16430 Evans Lane shipped with "DESERT HOT SPRINGS"
 *     bisected by the panel edge; the width cap that fixes it lives in
 *     simple-luxury.ts and every already-queued cover needs re-rendering to
 *     pick it up)
 *
 * Pass photoIndex to switch the base photo as well; omit it to keep the
 * config's coverPhotoIndex and just re-run the transformation.
 */
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import { listingCredits } from "../src/lib/spark-roster";
import { buildSimpleLuxuryTransformations } from "../src/lib/cover-templates/simple-luxury";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const HEADSHOT_ID = "headshots/head-shot-2026";

function money(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? "$" + Math.round(v).toLocaleString("en-US") : "";
}

(async () => {
  const [slug, postId, idxArg] = process.argv.slice(2);
  if (!slug || !postId) {
    throw new Error("usage: recover-pending-post.ts <slug> <postId> [photoIndex]");
  }
  const CFG = require(`./data/pending/${slug}`).default ?? require(`./data/pending/${slug}`);

  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;

  const post: any = await db.collection("pendingposts").findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error(`post ${postId} not found`);
  // Same guard as the reband: a posted or declined record is history, not a
  // draft, and rewriting its slides rewrites what the agent already decided on.
  if (post.status !== "awaiting_review") {
    throw new Error(`post is ${post.status}, not awaiting_review — refusing to touch it`);
  }

  const listing: any = await db
    .collection("unifiedlistings")
    .findOne({ listingKey: CFG.listingKey });
  if (!listing) throw new Error(`listing ${CFG.listingKey} not found`);

  const photoUrls: string[] = (listing.media || [])
    .map((m: any) => m.MediaURL || m.uri2048 || m.url)
    .filter(Boolean);

  const index = idxArg != null ? Number(idxArg) : (CFG.coverPhotoIndex ?? 0);
  if (!Number.isFinite(index) || !photoUrls[index]) {
    throw new Error(`no photo at index ${index} (listing has ${photoUrls.length})`);
  }

  const coverSrc = await cloudinary.uploader.upload(photoUrls[index], {
    folder: `jpsrealtor/pending/${slug}/cover`,
  });

  // Kept identical to build-pending-post.ts, including the unit-number split —
  // a recover that reconstructs the address differently from the build silently
  // changes the slide it is supposed to be repairing.
  const addr = String(listing.unparsedAddress || "").split(",")[0].trim();
  const unit = String(listing.unitNumber ?? listing.streetAdditionalInfo ?? "").trim();
  const cityLine = [unit && `#${unit}`, `${listing.city}, ${listing.stateOrProvince}`]
    .filter(Boolean).join("  ·  ");
  const beds = listing.bedroomsTotal ?? listing.bedsTotal;
  const baths = listing.bathroomsTotalInteger ?? listing.bathsTotal;
  const specs = [
    beds && `${beds} BD`,
    baths && `${baths} BA`,
    listing.livingArea && `${Number(listing.livingArea).toLocaleString()} SQFT`,
  ].filter(Boolean).join("  |  ");

  // Credit both listing agents, exactly as build-pending-post.ts does — a cover
  // rebuilt without this drops the co-list credit off the one slide that
  // carries it.
  const credits = await listingCredits(db, listing);
  const names = [credits.primary?.name, credits.secondary?.name].filter(Boolean);
  const credit = names.length && listing.listOfficeName
    ? `Listed by ${names.join("  &  ")}  ·  ${listing.listOfficeName}`
    : "";

  const url = cloudinary.url(coverSrc.public_id, {
    transformation: buildSimpleLuxuryTransformations({
      basePhotoPublicId: coverSrc.public_id,
      headshotPublicId: HEADSHOT_ID,
      hook: CFG.hook,
      city: String(listing.city || "").toUpperCase(),
      price: money(listing.listPrice),
      addressLine1: addr.toUpperCase(),
      addressLine2: cityLine.toUpperCase(),
      specs,
      body: CFG.coverBody,
      listingCredit: credit,
      accentColor: CFG.accentColor,
    } as any),
  });

  const slides = post.slides.map((s: any) =>
    s.kind === "cover" ? { ...s, url, publicId: coverSrc.public_id } : { ...s }
  );

  await db.collection("pendingposts").updateOne(
    { _id: post._id },
    { $set: { slides, "generation.coverPhotoIndex": index, updatedAt: new Date() } }
  );

  console.log(`   cover photo #${index}  ${coverSrc.public_id}`);
  console.log(`\nRECOVERED  ${post.approvalCode}`);
  await mongoose.disconnect();
})().catch((e) => { console.error("\nfatal:", e.message); process.exit(1); });
