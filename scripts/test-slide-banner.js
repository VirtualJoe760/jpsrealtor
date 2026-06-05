// scripts/test-slide-banner.js
//
// Apply an "interior slide" treatment to a staged photo:
//   - Crop to IG 4:5 (1080x1350)
//   - Black semi-transparent banner across the bottom ~25%
//   - Small room label + 1-2 line magazine-style caption inside the banner
//
// Tested first on slide-02 (twilight great room with Joseph). Once locked
// in, this gets applied to slides 2-10 with per-photo copy.

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = "75809-via-pisa";
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const SOURCE_FILE = path.join(EDITS_DIR, "slide-02.png");

// Slide-02 copy
const D = {
  label: "THE GREAT ROOM",
  caption: "Pocket sliders dissolve at twilight, drawing the golf course into the home.",
};

const FONT = "Poppins";

(async () => {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error("Source not found:", SOURCE_FILE);
    process.exit(1);
  }

  // Upload the staged photo so we can apply transformations
  const base = await cloudinary.uploader.upload(SOURCE_FILE, {
    folder: `jpsrealtor/ai-staged/${SLUG}/banner-test`,
    public_id: `slide-02-test-${Date.now()}`,
  });
  console.log("Uploaded:", base.public_id);

  const url = cloudinary.url(base.public_id, {
    transformation: [
      // 1. Crop to exactly 4:5 (1080x1350) — IG carousel-optimal
      { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },

      // 2. Black semi-transparent banner across the bottom ~25% (340px tall)
      {
        overlay: "sample",
        effect: "colorize:100",
        color: "rgb:000000",
        opacity: 75,
        width: 1080, height: 340,
        crop: "scale",
        gravity: "south",
      },

      // 3. Room label — small caps, letter-spaced, at top of banner
      {
        overlay: {
          font_family: FONT,
          font_size: 22,
          font_weight: "light",
          text: D.label,
          letter_spacing: 8,
        },
        color: "rgb:DDDDDD",
        gravity: "south", y: 250,
      },

      // 4. Short divider line under label
      {
        overlay: "sample",
        effect: "colorize:100",
        color: "white",
        width: 60, height: 1,
        crop: "scale",
        gravity: "south", y: 230,
      },

      // 5. Caption — large light italic, wraps to multiple lines
      {
        overlay: {
          font_family: FONT,
          font_size: 38,
          font_weight: "light",
          font_style: "italic",
          text: D.caption,
          letter_spacing: 1,
        },
        width: 900,
        crop: "fit",
        color: "white",
        gravity: "south", y: 80,
      },
    ],
  });

  console.log("URL:", url);

  // Download to local
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const outPath = path.join(EDITS_DIR, `slide-02-banner-test.jpg`);
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
})().catch((e) => { console.error(e); process.exit(1); });
