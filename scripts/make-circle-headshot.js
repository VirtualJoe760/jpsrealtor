/**
 * Bake a circular headshot badge and upload it as its own Cloudinary asset.
 *
 *   node scripts/make-circle-headshot.js [publicId] [--bg RRGGBB]
 *   node scripts/make-circle-headshot.js headshots/head-shot-2026
 *
 * Produces `<publicId>-circle`.
 *
 * WHY BAKE IT INSTEAD OF DOING IT IN THE SLIDE URL
 * ------------------------------------------------
 * The CTA slide shipped with a HOLE where the agent should be. The builder
 * asked for a circular overlay in one transformation step:
 *
 *   { overlay: id, width: 200, height: 200, crop: "thumb", gravity: "face",
 *     radius: "max", y: 170 }
 *
 * which the SDK flattens to `c_thumb,g_face,h_200,l_<id>,r_max,w_200,y_170`.
 * In a single component Cloudinary reads `g_face` as where to POSITION the
 * layer rather than what to centre its crop on, and the layer renders as
 * nothing at all — no error, just a plausible-looking card with the agent
 * missing.
 *
 * Splitting it with `fl_layer_apply` made the headshot appear but square, and
 * reset the positioning context so every overlay below it moved. Several
 * `r_max` spellings then filled the square with the background colour instead
 * of masking it.
 *
 * So the circle stops being a URL problem. It is baked here, once, where the
 * result can actually be looked at, and the slide only has to do the thing
 * Cloudinary is reliable at: place a finished PNG. Re-run this whenever the
 * headshot changes.
 */
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const sharp = require("sharp");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SIZE = 600; // generous: slides scale down, never up

async function main() {
  const publicId = process.argv[2] || "headshots/head-shot-2026";
  const bgArg = process.argv.indexOf("--bg");
  // The source headshot is a cutout on transparency, so a circle drawn over it
  // would show the slide's own colour through the face's backdrop and read as
  // a floating head. Fill behind the person first, then mask.
  const bg = bgArg > -1 ? process.argv[bgArg + 1] : "D9D4CB";
  const rgb = {
    r: parseInt(bg.slice(0, 2), 16),
    g: parseInt(bg.slice(2, 4), 16),
    b: parseInt(bg.slice(4, 6), 16),
  };

  // Cloudinary's face-centred square crop is reliable; it is only the RADIUS
  // that misbehaves, so let it do the framing and do the mask here.
  const src = cloudinary.url(publicId, {
    transformation: [{ width: SIZE, height: SIZE, crop: "thumb", gravity: "face" }],
    format: "png",
  });
  const res = await fetch(src);
  if (!res.ok) throw new Error(`source ${res.status}: ${src}`);
  const square = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(SIZE, SIZE, { fit: "cover" })
    .flatten({ background: rgb })
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`
  );
  const circle = await sharp(square)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Prove it before uploading: the corner must be transparent and the centre
  // must not be. This is the check whose absence let a hole ship.
  const { data, info } = await sharp(circle).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => data[(y * info.width + x) * 4 + 3];
  const corner = at(4, 4);
  const centre = at(SIZE >> 1, SIZE >> 1);
  console.log(`corner alpha ${corner} (want 0), centre alpha ${centre} (want 255)`);
  if (corner !== 0 || centre !== 255) throw new Error("mask did not apply — refusing to upload");

  const up = await cloudinary.uploader.upload(
    "data:image/png;base64," + circle.toString("base64"),
    { public_id: `${publicId}-circle`, overwrite: true, invalidate: true, format: "png" }
  );
  console.log("uploaded:", up.public_id, `${up.width}x${up.height}`);
  console.log("url:", up.secure_url);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
