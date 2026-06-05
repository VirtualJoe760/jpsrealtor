// scripts/regen-cta-with-identity.js
//
// Final CTA — now includes agent identity:
//   - Pre-built circular headshot
//   - Joseph Sardella · DRE 02106916
//   - eXp Realty logo (white version for teal background)
//
// Regenerates slide-10 for the El Nido carousel.

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
const OUT_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const FONT = "Poppins";

const BG = "1C4A5A";          // teal — brand
const TEXT = "rgb:F1EBE0";    // cream body
const TEXT_DIM = "rgb:C8C0B0"; // muted cream
const HANDLE_COLOR = "rgb:7CA0AB";

const D = {
  label: "WHY WORK WITH ME",
  agentName: "JOSEPH SARDELLA",
  agentLicense: "DRE 02106916",
  paragraphs: [
    "Most agents tell you what you want to hear.",
    "I'll tell you what will close the deal — and what won't.",
  ],
  italicLast: "DM me. Let's make your real estate goals happen.",
  handle: "@instadella",
  headshotPublicId: "jpsrealtor:agents:joseph-circular",
  brokerLogoPublicId: "jpsrealtor:logos:EXP-white-square",
};

function buildTransformation() {
  return [
    // Teal canvas
    { effect: "colorize:100", color: `rgb:${BG}`, width: 1080, height: 1350, crop: "scale" },

    // Top label
    {
      overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: D.label, letter_spacing: 8 },
      color: TEXT_DIM, gravity: "north", y: 100,
    },
    {
      overlay: "sample", effect: "colorize:100", color: `rgb:F1EBE0`,
      width: 50, height: 1, crop: "scale",
      gravity: "north", y: 132,
    },

    // Headshot (circular, ~200px)
    {
      overlay: D.headshotPublicId,
      width: 200,
      gravity: "north", y: 170,
    },

    // Agent name (below headshot, letter-spaced for editorial feel)
    {
      overlay: { font_family: FONT, font_size: 30, font_weight: "light", text: D.agentName, letter_spacing: 6 },
      color: TEXT, gravity: "north", y: 410,
    },

    // License (smaller, dimmer)
    {
      overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: D.agentLicense, letter_spacing: 4 },
      color: TEXT_DIM, gravity: "north", y: 460,
    },

    // Divider before body
    {
      overlay: "sample", effect: "colorize:100", color: `rgb:F1EBE0`,
      width: 40, height: 1, crop: "scale",
      gravity: "north", y: 510,
    },

    // Body P1
    {
      overlay: { font_family: FONT, font_size: 34, font_weight: "normal", text: D.paragraphs[0] },
      width: 880, crop: "fit",
      color: TEXT, gravity: "north_west", x: 100, y: 600,
    },

    // Body P2
    {
      overlay: { font_family: FONT, font_size: 34, font_weight: "normal", text: D.paragraphs[1] },
      width: 880, crop: "fit",
      color: TEXT, gravity: "north_west", x: 100, y: 760,
    },

    // Italic close — the actual CTA
    {
      overlay: { font_family: FONT, font_size: 38, font_weight: "light", font_style: "italic", text: D.italicLast },
      width: 880, crop: "fit",
      color: TEXT, gravity: "north_west", x: 100, y: 1010,
    },

    // Bottom brand bar
    {
      overlay: "sample", effect: "colorize:100", color: `rgb:${BG}`,
      width: 1080, height: 90, crop: "scale",
      gravity: "south",
    },

    // eXp logo (left of bar)
    {
      overlay: D.brokerLogoPublicId,
      width: 70,
      gravity: "south_west", x: 60, y: 20,
    },

    // @instadella handle (right of bar)
    {
      overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: D.handle },
      color: HANDLE_COLOR, gravity: "south_east", x: 60, y: 34,
    },
  ];
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
  const outPath = path.join(OUT_DIR, "slide-10.jpg");
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
