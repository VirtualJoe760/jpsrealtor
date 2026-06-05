// scripts/text-post-color-variants.js
//
// Render slide-12 (CMA text post) in multiple color palettes so we can
// pick a direction. Each variant pairs a background with text colors
// optimized for readability.

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FONT = "Poppins";
const SLUG = "75809-via-pisa";
const OUT_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits", "color-variants");

// Slide-12 content (CMA) — used across all variants
const CONTENT = {
  paragraphs: [
    "25 homes closed in Toscana Country Club this year. Median close price: $3,395,000.",
    "This one is listed at $3,095,000.",
  ],
  italicLast: "Three hundred thousand below the median, for the same neighborhood.",
  handle: "@instadella",
};

// 8 palettes — bg + body + italic + handle
const VARIANTS = [
  { name: "a-cream",        bg: "F1EBE0", body: "rgb:2D2D2D", italic: "rgb:4A4A4A", handle: "rgb:8A8A8A" },
  { name: "b-sage",         bg: "C5CDB7", body: "rgb:2D2D2D", italic: "rgb:4A4A4A", handle: "rgb:6F6F6F" },
  { name: "c-charcoal",     bg: "2D2D2D", body: "rgb:F1EBE0", italic: "rgb:C8C0B0", handle: "rgb:8A8580" },
  { name: "d-teal",         bg: "1C4A5A", body: "rgb:F1EBE0", italic: "rgb:C8C0B0", handle: "rgb:7CA0AB" },
  { name: "e-terracotta",   bg: "B85C38", body: "rgb:F8EFE6", italic: "rgb:E8D5CB", handle: "rgb:F0D8C8" },
  { name: "f-dusty-rose",   bg: "D8C5B8", body: "rgb:2D2D2D", italic: "rgb:4A4A4A", handle: "rgb:7A6E66" },
  { name: "g-forest",       bg: "2D4A3E", body: "rgb:F1EBE0", italic: "rgb:C8C0B0", handle: "rgb:8FA89E" },
  { name: "h-black",        bg: "1A1A1A", body: "rgb:F5F5F5", italic: "rgb:C0C0C0", handle: "rgb:707070" },
];

function buildTransformation(v) {
  const t = [
    { effect: "colorize:100", color: `rgb:${v.bg}`, width: 1080, height: 1350, crop: "scale" },
  ];

  let y = 300;
  const para = 170;
  for (const p of CONTENT.paragraphs) {
    t.push({
      overlay: { font_family: FONT, font_size: 38, font_weight: "normal", text: p },
      width: 880, crop: "fit",
      color: v.body, gravity: "north_west", x: 100, y,
    });
    y += para;
  }
  y += 30;
  t.push({
    overlay: { font_family: FONT, font_size: 36, font_weight: "light", font_style: "italic", text: CONTENT.italicLast },
    width: 880, crop: "fit",
    color: v.italic, gravity: "north_west", x: 100, y,
  });
  t.push({
    overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: CONTENT.handle },
    color: v.handle, gravity: "south", y: 80,
  });
  return t;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const t0 = Date.now();
  const results = await Promise.all(
    VARIANTS.map(async (v) => {
      try {
        const url = cloudinary.url("sample", { transformation: buildTransformation(v) });
        const r = await fetch(url);
        if (!r.ok) {
          const body = await r.text();
          return { name: v.name, error: `HTTP ${r.status}: ${body.slice(0, 200)}` };
        }
        const buf = Buffer.from(await r.arrayBuffer());
        const outPath = path.join(OUT_DIR, `variant-${v.name}.jpg`);
        fs.writeFileSync(outPath, buf);
        return { name: v.name, outPath, kb: (buf.length / 1024).toFixed(0) };
      } catch (e) {
        return { name: v.name, error: e.message };
      }
    })
  );
  console.log(`Done in ${Date.now() - t0}ms\n`);
  for (const r of results) {
    if (r.error) console.log(`${r.name} ❌ ${r.error}`);
    else console.log(`${r.name} ✅ ${path.basename(r.outPath)} (${r.kb} KB)`);
  }
})().catch(e => { console.error(e); process.exit(1); });
