// scripts/regen-el-nido-cover.js
//
// Cover layout v2:
//   - Bigger headshot, fills the panel and extends to the very bottom
//   - Listing credit moved to the bottom-right (no centered banner)

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = "48750-el-nido";
const ORIGINALS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "originals");
const OUT_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const FONT = "Poppins";
const TEAL = "1C4A5A";

const D = {
  hook: "THE LODGE",
  city: "LA QUINTA",
  price: "$3,795,000",
  addressLine1: "48750 AVENIDA EL NIDO",
  addressLine2: "LA QUINTA, CA",
  listingCredit: "Listed by Matthew E Miede  ·  Compass",
  specs: "5 BD  |  5 BA  |  3,942 SQFT",
  body: "A turnkey desert home in LQCC Golf Estates. Raised pool, putting green, mountain views.",
  agentName: "JOSEPH SARDELLA",
  headshotPublicId: "headshots:head-shot-2026",
  sourcePhoto: "photo-00.jpg",
};

function buildCoverTransformation(d) {
  return [
    // 1. Base 4:5 crop
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },

    // 2. Left panel — teal semi-transparent, full height
    {
      overlay: "sample",
      effect: "colorize:100",
      color: `rgb:${TEAL}`,
      opacity: 75,
      width: 480, height: 1350,
      crop: "scale",
      gravity: "west",
    },

    // 3. Hook
    {
      overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: d.hook },
      color: "white", gravity: "north_west", x: 70, y: 110,
    },

    // 4. City subtitle
    {
      overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.city, letter_spacing: 8 },
      color: "white", gravity: "north_west", x: 70, y: 240,
    },

    // 5. Price
    {
      overlay: { font_family: FONT, font_size: 60, font_weight: "medium", text: d.price },
      color: "white", gravity: "north_west", x: 70, y: 360,
    },

    // 6. Divider
    {
      overlay: "sample", effect: "colorize:100", color: "white",
      width: 160, height: 1, crop: "scale",
      gravity: "north_west", x: 70, y: 445,
    },

    // 7. Address line 1
    {
      overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.addressLine1 },
      color: "white", gravity: "north_west", x: 70, y: 470,
    },

    // 8. Address line 2
    {
      overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: d.addressLine2 },
      color: "white", gravity: "north_west", x: 70, y: 510,
    },

    // 9. Listing credit — under the address, small italic light cream
    {
      overlay: { font_family: FONT, font_size: 14, font_weight: "light", font_style: "italic", text: d.listingCredit },
      color: "rgb:E0E0E0", gravity: "north_west", x: 70, y: 548,
    },

    // 10. Specs
    {
      overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: d.specs },
      color: "white", gravity: "north_west", x: 70, y: 590,
    },

    // 11. Body copy — short version (italic light), fits in 3 lines
    {
      overlay: {
        font_family: FONT, font_size: 18, font_weight: "light", font_style: "italic",
        text: d.body, letter_spacing: 1,
      },
      width: 360, crop: "fit",
      color: "white", gravity: "north_west", x: 70, y: 660,
    },

    // 12. Agent name — positioned in the slim band BELOW body and ABOVE headshot.
    // Headshot at width 480 is ~540px tall → its top is at y=540 from south
    // (= y=810 from north). Body ends ~y=755 from north. Name fits between.
    {
      overlay: { font_family: FONT, font_size: 26, font_weight: "light", text: d.agentName, letter_spacing: 6 },
      color: "white", gravity: "south_west", x: 70, y: 555,
    },

    // 13. Headshot — fills the panel width, extends to the very bottom
    {
      overlay: d.headshotPublicId,
      width: 480,
      gravity: "south_west",
      x: 0, y: 0,
    },
  ];
}

(async () => {
  const srcPath = path.join(ORIGINALS_DIR, D.sourcePhoto);
  const baseUp = await cloudinary.uploader.upload(srcPath, {
    folder: `jpsrealtor/ai-staged/${SLUG}/cover`,
    public_id: `cover-v2-${Date.now()}`,
  });

  const url = cloudinary.url(baseUp.public_id, {
    transformation: buildCoverTransformation(D),
  });
  console.log("URL:", url);

  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "slide-01.jpg");
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
