// scripts/apply-slide-banners.js
//
// Apply the "interior slide banner" treatment to slides 2-10:
//   - Crop to 4:5 (1080x1350)
//   - Black 75% opacity banner at bottom (~340px)
//   - Small letter-spaced room label
//   - Short white divider
//   - Italic light magazine-style caption
//
// Per-slide copy below. Saves to temp-images/<slug>/_edits/slide-NN-banner.jpg.

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
const FONT = "Poppins";

// Per-slide editorial copy
const SLIDES = [
  {
    n: 2,
    label: "THE GREAT ROOM",
    caption: "Pocket sliders dissolve at twilight, drawing the golf course into the home.",
  },
  {
    n: 3,
    label: "THE KITCHEN",
    caption: "Sub-Zero, Wolf, and a marble island built for slow mornings.",
  },
  {
    n: 4,
    label: "DINING",
    caption: "A round table beneath a sphere chandelier — the view always pulls up a chair.",
  },
  {
    n: 5,
    label: "AT EASE",
    caption: "A curved sectional finds the shape of the conversation.",
  },
  {
    n: 6,
    label: "PRIMARY SUITE",
    caption: "Wake to mountains. Step through the slider to the pool.",
  },
  {
    n: 7,
    label: "AFTER DARK",
    caption: "The fire pit catches the last warm light of the desert sun.",
  },
  {
    n: 8,
    label: "THE POOL",
    caption: "A raised spa, a fairway beyond, mountains framing it all.",
  },
  {
    n: 9,
    label: "GOLDEN HOUR",
    caption: "Toscana's North Course turns to gold.",
  },
  {
    n: 10,
    label: "FROM ABOVE",
    caption: "Where the home meets the 10th fairway.",
  },
];

function buildTransformation(label, caption) {
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },

    // Black 75% opacity banner across bottom
    {
      overlay: "sample",
      effect: "colorize:100",
      color: "rgb:000000",
      opacity: 75,
      width: 1080, height: 340,
      crop: "scale",
      gravity: "south",
    },

    // Label
    {
      overlay: { font_family: FONT, font_size: 22, font_weight: "light", text: label, letter_spacing: 8 },
      color: "rgb:DDDDDD",
      gravity: "south", y: 250,
    },

    // Divider
    {
      overlay: "sample",
      effect: "colorize:100",
      color: "white",
      width: 60, height: 1,
      crop: "scale",
      gravity: "south", y: 230,
    },

    // Caption
    {
      overlay: { font_family: FONT, font_size: 38, font_weight: "light", font_style: "italic", text: caption, letter_spacing: 1 },
      width: 900,
      crop: "fit",
      color: "white",
      gravity: "south", y: 80,
    },
  ];
}

(async () => {
  const t0 = Date.now();
  const results = await Promise.all(
    SLIDES.map(async (s) => {
      const num = String(s.n).padStart(2, "0");
      const src = path.join(EDITS_DIR, `slide-${num}.png`);
      if (!fs.existsSync(src)) return { n: s.n, error: "missing source" };

      try {
        const up = await cloudinary.uploader.upload(src, {
          folder: `jpsrealtor/ai-staged/${SLUG}/banner-final`,
          public_id: `slide-${num}-${Date.now()}`,
        });
        const url = cloudinary.url(up.public_id, {
          transformation: buildTransformation(s.label, s.caption),
        });
        const r = await fetch(url);
        if (!r.ok) {
          const txt = await r.text();
          return { n: s.n, error: `HTTP ${r.status}: ${txt.slice(0, 200)}` };
        }
        const buf = Buffer.from(await r.arrayBuffer());
        const outPath = path.join(EDITS_DIR, `slide-${num}-banner.jpg`);
        fs.writeFileSync(outPath, buf);
        return { n: s.n, outPath, kb: (buf.length / 1024).toFixed(0) };
      } catch (e) {
        return { n: s.n, error: e.message };
      }
    })
  );

  console.log(`Done in ${Date.now() - t0}ms\n`);
  for (const r of results) {
    if (r.error) console.log(`[${r.n}] ❌ ${r.error}`);
    else console.log(`[${r.n}] ✅ ${path.basename(r.outPath)} (${r.kb} KB)`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
