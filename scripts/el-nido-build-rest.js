// scripts/el-nido-build-rest.js
//
// Builds the rest of the El Nido carousel:
//   slide-01: simple-luxury cover
//   slide-06: CMA infographic (La Quinta luxury 4BR+ $2.5M-$5M)
//   slide-07: about-the-listing text post
//   slide-08: qualities-in-an-agent text post
//   slide-09: pricing context text post
//   slide-10: CTA (why work with Joseph)

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
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const FONT = "Poppins";

const TEAL = "1C4A5A";
const CREAM = "F1EBE0";
const CREAM_DIM = "C8C0B0";
const TEXT_DARK = "rgb:2D2D2D";
const TEXT_DARK_DIM = "rgb:4A4A4A";
const HANDLE_LIGHT_BG = "rgb:8A8A8A";
const HANDLE_DARK_BG = "rgb:7CA0AB";
const HANDLE = "@instadella";

// ─── Slide 01: simple-luxury cover ──────────────────────────────────────
const COVER = {
  hook: "THE LODGE",
  city: "LA QUINTA",
  price: "$3,795,000",
  addressLine1: "48750 AVENIDA EL NIDO",
  addressLine2: "LA QUINTA, CA",
  specs: "5 BD  |  5 BA  |  3,942 SQFT",
  body: "Modern desert living at LQCC Golf Estates — wrap-around patios with south-and-west mountain views, a raised salt-water pool, and a backyard putting green.",
  listingCredit: "Listed by Matthew E Miede  ·  Compass",
  headshotPublicId: "headshots:head-shot-2026",
  sourcePhoto: "photo-00.jpg", // modern front exterior
};

function buildCoverTransformation(d) {
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${TEAL}`, opacity: 75, width: 480, height: 1350, crop: "scale", gravity: "west" },
    { overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: d.hook }, color: "white", gravity: "north_west", x: 70, y: 110 },
    { overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.city, letter_spacing: 8 }, color: "white", gravity: "north_west", x: 70, y: 240 },
    { overlay: { font_family: FONT, font_size: 60, font_weight: "medium", text: d.price }, color: "white", gravity: "north_west", x: 70, y: 360 },
    { overlay: "sample", effect: "colorize:100", color: "white", width: 160, height: 1, crop: "scale", gravity: "north_west", x: 70, y: 445 },
    { overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.addressLine1 }, color: "white", gravity: "north_west", x: 70, y: 470 },
    { overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: d.addressLine2 }, color: "white", gravity: "north_west", x: 70, y: 510 },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: d.specs }, color: "white", gravity: "north_west", x: 70, y: 575 },
    { overlay: { font_family: FONT, font_size: 19, font_weight: "light", font_style: "italic", text: d.body, letter_spacing: 1 }, width: 360, crop: "fit", color: "white", gravity: "north_west", x: 70, y: 660 },
    { overlay: d.headshotPublicId, width: 400, gravity: "south_west", x: 40, y: 40 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${TEAL}`, width: 1080, height: 40, crop: "scale", gravity: "south" },
    { overlay: { font_family: FONT, font_size: 13, font_weight: "light", font_style: "italic", text: d.listingCredit }, color: "rgb:EFEFEF", gravity: "south", y: 13 },
  ];
}

// ─── Slide 06: CMA infographic ──────────────────────────────────────────
const CMA = {
  scope: "LA QUINTA LUXURY",
  period: "4BR+  ·  $2.5M-$5M  ·  LAST 12 MONTHS",
  stats: [
    { value: "20",      label: "HOMES SOLD" },
    { value: "$2.9M",   label: "MEDIAN CLOSE" },
    { value: "$963",    label: "PRICE / SQFT" },
    { value: "$4.95M",  label: "TOP CLOSE" },
  ],
  listingLabel: "THIS LISTING",
  listingPrice: "$3,795,000",
  pitch: "Pricing alongside Tradition and The Hideaway.",
};

function buildCmaTransformation() {
  const t = [
    { effect: "colorize:100", color: `rgb:${TEAL}`, width: 1080, height: 1350, crop: "scale" },
    { overlay: { font_family: FONT, font_size: 26, font_weight: "light", text: CMA.scope, letter_spacing: 10 }, color: `rgb:${CREAM}`, gravity: "north", y: 140 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`, width: 60, height: 1, crop: "scale", gravity: "north", y: 195 },
    { overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: CMA.period, letter_spacing: 4 }, color: `rgb:${CREAM_DIM}`, gravity: "north", y: 225 },
  ];
  const COL_X = [110, 590];
  const ROW_V = [380, 620];
  const ROW_L = [490, 730];
  for (let i = 0; i < CMA.stats.length; i++) {
    const s = CMA.stats[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    t.push({ overlay: { font_family: FONT, font_size: 92, font_weight: "medium", text: s.value }, color: `rgb:${CREAM}`, gravity: "north_west", x: COL_X[col], y: ROW_V[row] });
    t.push({ overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: s.label, letter_spacing: 4 }, color: `rgb:${CREAM_DIM}`, gravity: "north_west", x: COL_X[col], y: ROW_L[row] });
  }
  t.push({ overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`, width: 100, height: 1, crop: "scale", gravity: "north", y: 870 });
  t.push({ overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: CMA.listingLabel, letter_spacing: 6 }, color: `rgb:${CREAM_DIM}`, gravity: "north", y: 900 });
  t.push({ overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: CMA.listingPrice }, color: `rgb:${CREAM}`, gravity: "north", y: 940 });
  t.push({ overlay: { font_family: FONT, font_size: 28, font_weight: "light", font_style: "italic", text: CMA.pitch }, width: 900, crop: "fit", color: `rgb:${CREAM_DIM}`, gravity: "north", y: 1080 });
  t.push({ overlay: { font_family: FONT, font_size: 22, text: HANDLE }, color: HANDLE_DARK_BG, gravity: "south", y: 80 });
  return t;
}

// ─── Text post template ────────────────────────────────────────────────
function buildTextPostTransformation(post, opts = {}) {
  const bg = opts.bg || CREAM;
  const bodyColor = opts.bodyColor || TEXT_DARK;
  const italicColor = opts.italicColor || TEXT_DARK_DIM;
  const handleColor = opts.handleColor || HANDLE_LIGHT_BG;

  const t = [
    { effect: "colorize:100", color: `rgb:${bg}`, width: 1080, height: 1350, crop: "scale" },
  ];
  let y = 300;
  const paraSpacing = 170;
  for (const p of post.paragraphs) {
    t.push({
      overlay: { font_family: FONT, font_size: 38, font_weight: "normal", text: p },
      width: 880, crop: "fit",
      color: bodyColor, gravity: "north_west", x: 100, y,
    });
    y += paraSpacing;
  }
  y += 30;
  t.push({
    overlay: { font_family: FONT, font_size: 36, font_weight: "light", font_style: "italic", text: post.italicLast },
    width: 880, crop: "fit",
    color: italicColor, gravity: "north_west", x: 100, y,
  });
  t.push({
    overlay: { font_family: FONT, font_size: 22, text: HANDLE },
    color: handleColor, gravity: "south", y: 80,
  });
  return t;
}

// Three text posts
const TEXT_POSTS = [
  {
    n: 7,
    bg: CREAM,
    paragraphs: [
      "They named the house \"The Lodge.\"",
      "15-foot Fleetwood sliders, a chef's range with a stone hood, an in-law suite with its own kitchen, and a backyard putting green.",
    ],
    italicLast: "Modern desert living, fully furnished.",
  },
  {
    n: 8,
    bg: CREAM,
    paragraphs: [
      "The right agent isn't the one with the most listings.",
      "It's the one who answers when you call. Who knows the difference between a fair offer and a missed opportunity.",
    ],
    italicLast: "You don't pay extra for a good agent. You pay extra for a bad one.",
  },
  {
    n: 9,
    bg: CREAM,
    paragraphs: [
      "20 homes in this price band sold in La Quinta this year. The top close hit $4.95M.",
      "The Lodge is priced at $3.795M.",
    ],
    italicLast: "Right in the conversation. Not in line behind it.",
  },
];

// CTA (slide 10)
const CTA = {
  label: "WHY WORK WITH ME",
  paragraphs: [
    "Most agents tell you what you want to hear.",
    "I'll tell you what will close the deal — and what won't.",
    "In the Coachella Valley since 2019. eXp Realty. 760·333·3676.",
  ],
  italicLast: "Trust. Empathy. Action.",
};

function buildCtaTransformation() {
  const t = [
    { effect: "colorize:100", color: `rgb:${TEAL}`, width: 1080, height: 1350, crop: "scale" },
    { overlay: { font_family: FONT, font_size: 18, font_weight: "light", text: CTA.label, letter_spacing: 8 }, color: `rgb:${CREAM_DIM}`, gravity: "north", y: 180 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`, width: 60, height: 1, crop: "scale", gravity: "north", y: 220 },
  ];
  let y = 360;
  const sizes = [38, 38, 32];
  const spacing = [180, 200, 220];
  for (let i = 0; i < CTA.paragraphs.length; i++) {
    t.push({
      overlay: { font_family: FONT, font_size: sizes[i], font_weight: "normal", text: CTA.paragraphs[i] },
      width: 880, crop: "fit",
      color: `rgb:${CREAM}`, gravity: "north_west", x: 100, y,
    });
    y += spacing[i];
  }
  t.push({
    overlay: { font_family: FONT, font_size: 52, font_weight: "light", font_style: "italic", text: CTA.italicLast },
    width: 880, crop: "fit",
    color: `rgb:${CREAM}`, gravity: "north_west", x: 100, y: y + 40,
  });
  t.push({
    overlay: { font_family: FONT, font_size: 24, text: HANDLE },
    color: HANDLE_DARK_BG, gravity: "south", y: 80,
  });
  return t;
}

async function downloadAndSave(url, outPath) {
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

(async () => {
  fs.mkdirSync(EDITS_DIR, { recursive: true });
  const t0 = Date.now();

  // SLIDE 01: cover
  console.log("Slide 01 — cover…");
  const coverSrc = path.join(ORIGINALS_DIR, COVER.sourcePhoto);
  const baseUp = await cloudinary.uploader.upload(coverSrc, {
    folder: `jpsrealtor/ai-staged/${SLUG}/cover`,
    public_id: `base-${Date.now()}`,
  });
  const coverUrl = cloudinary.url(baseUp.public_id, {
    transformation: buildCoverTransformation(COVER),
  });
  const coverBytes = await downloadAndSave(coverUrl, path.join(EDITS_DIR, "slide-01.jpg"));
  console.log(`  slide-01.jpg (${(coverBytes / 1024).toFixed(0)} KB)`);

  // SLIDE 06: CMA infographic
  console.log("Slide 06 — CMA infographic…");
  const cmaUrl = cloudinary.url("sample", { transformation: buildCmaTransformation() });
  const cmaBytes = await downloadAndSave(cmaUrl, path.join(EDITS_DIR, "slide-06.jpg"));
  console.log(`  slide-06.jpg (${(cmaBytes / 1024).toFixed(0)} KB)`);

  // SLIDES 07-09: text posts
  for (const p of TEXT_POSTS) {
    console.log(`Slide ${String(p.n).padStart(2, "0")} — text post…`);
    const url = cloudinary.url("sample", { transformation: buildTextPostTransformation(p, { bg: p.bg }) });
    const bytes = await downloadAndSave(url, path.join(EDITS_DIR, `slide-${String(p.n).padStart(2, "0")}.jpg`));
    console.log(`  slide-${String(p.n).padStart(2, "0")}.jpg (${(bytes / 1024).toFixed(0)} KB)`);
  }

  // SLIDE 10: CTA
  console.log("Slide 10 — CTA…");
  const ctaUrl = cloudinary.url("sample", { transformation: buildCtaTransformation() });
  const ctaBytes = await downloadAndSave(ctaUrl, path.join(EDITS_DIR, "slide-10.jpg"));
  console.log(`  slide-10.jpg (${(ctaBytes / 1024).toFixed(0)} KB)`);

  console.log(`\nAll done in ${Date.now() - t0}ms.`);
})().catch(e => { console.error(e); process.exit(1); });
