// scripts/generate-cta-slide.js
//
// Final CTA slide — "Why work with Joseph Sardella".
// Teal background to match the cover + CMA infographic (the slide visually
// closes the carousel by bookending it).
//
// Layout:
//   - Small "WHY WORK WITH ME" label at top (letter-spaced, cream)
//   - 3 short statement paragraphs (cream, regular weight, Poppins)
//   - Headline tagline in italic light (the closer)
//   - Contact stack at bottom (phone + email subtle)
//   - @instadella handle anchored at the very bottom

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
const OUT_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const FONT = "Poppins";

const BG = "1C4A5A";          // teal — brand, matches cover + CMA
const TEXT = "rgb:F1EBE0";    // cream body
const TEXT_DIM = "rgb:C8C0B0"; // muted cream
const HANDLE_COLOR = "rgb:7CA0AB";

const D = {
  label: "WHY WORK WITH ME",
  paragraphs: [
    "Most agents tell you what you want to hear.",
    "I'll tell you what will close the deal — and what won't.",
    "In the Coachella Valley since 2019. eXp Realty. 760·333·3676.",
  ],
  italicLast: "Trust. Empathy. Action.",
  handle: "@instadella",
};

function buildTransformation() {
  const t = [
    // Teal canvas
    { effect: "colorize:100", color: `rgb:${BG}`, width: 1080, height: 1350, crop: "scale" },

    // Top label — letter-spaced, muted cream
    {
      overlay: { font_family: FONT, font_size: 18, font_weight: "light", text: D.label, letter_spacing: 8 },
      color: TEXT_DIM, gravity: "north", y: 180,
    },

    // Divider under label
    {
      overlay: "sample", effect: "colorize:100", color: `rgb:F1EBE0`,
      width: 60, height: 1, crop: "scale",
      gravity: "north", y: 220,
    },
  ];

  // 3 body paragraphs, stacked with generous spacing
  let y = 360;
  const fontSizes = [38, 38, 32]; // last one slightly smaller to fit contact info
  const spacing = [180, 200, 220];
  for (let i = 0; i < D.paragraphs.length; i++) {
    t.push({
      overlay: { font_family: FONT, font_size: fontSizes[i], font_weight: "normal", text: D.paragraphs[i] },
      width: 880, crop: "fit",
      color: TEXT, gravity: "north_west", x: 100, y,
    });
    y += spacing[i];
  }

  // Italic close
  t.push({
    overlay: { font_family: FONT, font_size: 52, font_weight: "light", font_style: "italic", text: D.italicLast },
    width: 880, crop: "fit",
    color: TEXT, gravity: "north_west", x: 100, y: y + 40,
  });

  // Handle at bottom
  t.push({
    overlay: { font_family: FONT, font_size: 24, font_weight: "normal", text: D.handle },
    color: HANDLE_COLOR, gravity: "south", y: 80,
  });

  return t;
}

(async () => {
  const url = cloudinary.url("sample", { transformation: buildTransformation() });
  console.log("URL:", url);

  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `slide-14.jpg`);
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
