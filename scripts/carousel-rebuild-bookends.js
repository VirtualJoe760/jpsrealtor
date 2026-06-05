// scripts/carousel-rebuild-bookends.js
//
// Re-renders ONLY slide-01 (cover) and slide-10 (CTA) for a given slug.
// Faster than carousel-build.js (skips Gemini staging) when you've only
// changed cover/CTA copy or layout.
//
//   usage: node scripts/carousel-rebuild-bookends.js <slug>

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const {
  buildCoverTransformation,
  buildCtaTransformation,
} = require("./lib/slide-templates");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: node scripts/carousel-rebuild-bookends.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", `${SLUG}.js`));
const ORIGINALS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "originals");
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");

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

  console.log(`[${SLUG}] cover…`);
  const coverSrc = path.join(ORIGINALS_DIR, CFG.cover.sourcePhoto);
  const baseUp = await cloudinary.uploader.upload(coverSrc, {
    folder: `jpsrealtor/ai-staged/${SLUG}/cover`,
    public_id: `base-${Date.now()}`,
  });
  const coverUrl = cloudinary.url(baseUp.public_id, {
    transformation: buildCoverTransformation(CFG.cover),
  });
  const coverBytes = await downloadAndSave(coverUrl, path.join(EDITS_DIR, "slide-01.jpg"));
  console.log(`  slide-01.jpg (${(coverBytes / 1024).toFixed(0)} KB)`);

  console.log(`[${SLUG}] CTA…`);
  const ctaUrl = cloudinary.url("sample", { transformation: buildCtaTransformation(CFG.cta) });
  const ctaBytes = await downloadAndSave(ctaUrl, path.join(EDITS_DIR, "slide-10.jpg"));
  console.log(`  slide-10.jpg (${(ctaBytes / 1024).toFixed(0)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
