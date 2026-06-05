// scripts/carousel-rebuild-static.js
//
// Re-renders the non-AI slides (cover, CMA, text posts, CTA) — slides
// 01, 06, 07, 08, 09, 10. Skips the 4 Gemini-staged slides (02-05).
//
//   usage: node scripts/carousel-rebuild-static.js <slug>

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const {
  buildCoverTransformation,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
} = require("./lib/slide-templates");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: node scripts/carousel-rebuild-static.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", `${SLUG}.js`));
const ORIGINALS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "originals");
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");

async function downloadAndSave(url, outPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

(async () => {
  fs.mkdirSync(EDITS_DIR, { recursive: true });

  console.log(`[${SLUG}] cover…`);
  const baseUp = await cloudinary.uploader.upload(path.join(ORIGINALS_DIR, CFG.cover.sourcePhoto), {
    folder: `jpsrealtor/ai-staged/${SLUG}/cover`,
    public_id: `base-${Date.now()}`,
  });
  const coverUrl = cloudinary.url(baseUp.public_id, { transformation: buildCoverTransformation(CFG.cover) });
  const coverBytes = await downloadAndSave(coverUrl, path.join(EDITS_DIR, "slide-01.jpg"));
  console.log(`  slide-01.jpg (${(coverBytes / 1024).toFixed(0)} KB)`);

  console.log(`[${SLUG}] CMA…`);
  const cmaUrl = cloudinary.url("sample", { transformation: buildCmaTransformation(CFG.cma, CFG.handle) });
  const cmaBytes = await downloadAndSave(cmaUrl, path.join(EDITS_DIR, "slide-06.jpg"));
  console.log(`  slide-06.jpg (${(cmaBytes / 1024).toFixed(0)} KB)`);

  for (const p of CFG.textPosts) {
    const num = String(p.n).padStart(2, "0");
    const url = cloudinary.url("sample", { transformation: buildTextPostTransformation(p, CFG.handle) });
    const bytes = await downloadAndSave(url, path.join(EDITS_DIR, `slide-${num}.jpg`));
    console.log(`  slide-${num}.jpg (${(bytes / 1024).toFixed(0)} KB)`);
  }

  console.log(`[${SLUG}] CTA…`);
  const ctaUrl = cloudinary.url("sample", { transformation: buildCtaTransformation(CFG.cta) });
  const ctaBytes = await downloadAndSave(ctaUrl, path.join(EDITS_DIR, "slide-10.jpg"));
  console.log(`  slide-10.jpg (${(ctaBytes / 1024).toFixed(0)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
