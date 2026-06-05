// scripts/generate-cma-photo.js
//
// CMA data slide — visual infographic instead of paragraph text.
// 4:5 portrait, teal background (matches simple-luxury cover), big
// stat callouts in a 2x2 grid, then a "This listing vs market"
// comparison at the bottom.

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

// Live CMA from get_subdivision_cma → Toscana Country Club
const D = {
  subdivision: "TOSCANA COUNTRY CLUB",
  period: "LAST 12 MONTHS",
  stats: [
    { value: "$3.395M",  label: "MEDIAN CLOSE" },
    { value: "25",       label: "HOMES SOLD" },
    { value: "68",       label: "DAYS ON MARKET" },
    { value: "95%",      label: "SALE TO LIST" },
  ],
  listingLabel: "THIS LISTING",
  listingPrice: "$3,095,000",
  pitch: "$300K below the neighborhood median.",
  handle: "@instadella",
};

const BG = "1C4A5A";          // teal (brand)
const ACCENT = "F1EBE0";      // cream
const ACCENT_DIM = "C8C0B0";  // muted cream
const HANDLE_COLOR = "rgb:7CA0AB";

function buildTransformation() {
  const t = [];

  // 1. Teal 4:5 canvas
  t.push({
    effect: "colorize:100", color: `rgb:${BG}`,
    width: 1080, height: 1350, crop: "scale",
  });

  // 2. Header — subdivision name (letter-spaced)
  t.push({
    overlay: { font_family: FONT, font_size: 26, font_weight: "light", text: D.subdivision, letter_spacing: 10 },
    color: `rgb:${ACCENT}`, gravity: "north", y: 140,
  });

  // 3. Divider line under header
  t.push({
    overlay: "sample", effect: "colorize:100", color: `rgb:${ACCENT}`,
    width: 60, height: 1, crop: "scale",
    gravity: "north", y: 195,
  });

  // 4. Period label
  t.push({
    overlay: { font_family: FONT, font_size: 18, font_weight: "light", text: D.period, letter_spacing: 6 },
    color: `rgb:${ACCENT_DIM}`, gravity: "north", y: 230,
  });

  // 5. 2x2 stat grid
  // Cells positioned absolutely. Each value+label pair as 2 overlays.
  // Canvas 1080 wide. Stats at:
  //   col1: x=80..520    col2: x=560..1000
  //   row1 value: y=370   row1 label: y=470
  //   row2 value: y=620   row2 label: y=720
  const COL_X = [110, 590];
  const ROW_VALUE_Y = [380, 620];
  const ROW_LABEL_Y = [490, 730];

  for (let i = 0; i < D.stats.length; i++) {
    const stat = D.stats[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    // Big value
    t.push({
      overlay: { font_family: FONT, font_size: 92, font_weight: "medium", text: stat.value },
      color: `rgb:${ACCENT}`, gravity: "north_west",
      x: COL_X[col], y: ROW_VALUE_Y[row],
    });
    // Small label (letter-spaced)
    t.push({
      overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: stat.label, letter_spacing: 4 },
      color: `rgb:${ACCENT_DIM}`, gravity: "north_west",
      x: COL_X[col], y: ROW_LABEL_Y[row],
    });
  }

  // 6. Divider above "This listing" callout
  t.push({
    overlay: "sample", effect: "colorize:100", color: `rgb:${ACCENT}`,
    width: 100, height: 1, crop: "scale",
    gravity: "north", y: 870,
  });

  // 7. "THIS LISTING" small label
  t.push({
    overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: D.listingLabel, letter_spacing: 6 },
    color: `rgb:${ACCENT_DIM}`, gravity: "north", y: 900,
  });

  // 8. Big listing price
  t.push({
    overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: D.listingPrice },
    color: `rgb:${ACCENT}`, gravity: "north", y: 940,
  });

  // 9. Pitch line (italic light, like other text posts)
  t.push({
    overlay: { font_family: FONT, font_size: 28, font_weight: "light", font_style: "italic", text: D.pitch },
    width: 900, crop: "fit",
    color: `rgb:${ACCENT_DIM}`, gravity: "north", y: 1080,
  });

  // 10. Handle at bottom
  t.push({
    overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: D.handle },
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
  const outPath = path.join(OUT_DIR, `slide-12-infographic.jpg`);
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
