// scripts/carousel-build.js
//
// Unified IG carousel builder for the "simple-luxury-carousel" template.
// Takes a config from scripts/data/carousels/<slug>.js
// and produces all 10 slides into temp-images/<slug>/_edits/.
//
//   usage: node scripts/carousel-build.js <slug>

require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const {
  buildCoverTransformation,
  buildBannerTransform,
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
if (!SLUG) { console.error("usage: node scripts/carousel-build.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", "carousels", `${SLUG}.js`));

const ORIGINALS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "originals");
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");

const HEADSHOT_URL =
  "https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/headshots/head-shot-2026.png";

const STAGE_PROMPT = (c) => `Take the FIRST image (a ${c.room}) and naturally insert the person from the SECOND image into the scene as a real-estate agent showing the home.

== IDENTITY PRESERVATION (CRITICAL) ==
- Match the person's facial features EXACTLY as shown in the second image
- Preserve: hair color & texture, face shape, jawline, skin tone, eye color
- Do NOT idealize, smooth, slim, or otherwise alter their appearance
- Render in a professional dark gray suit jacket with a light blue collared shirt (no tie)

== PLACEMENT ==
${c.pose}

== LIGHTING & PHYSICS ==
- Match the room's light direction and color temperature exactly
- Cast realistic shadows consistent with the room's light source(s)
- Scale proportionally to the room (typical adult male)
- Edge-blend cleanly with the scene; no halo or cutout artifacts

== EXPRESSION ==
${c.expression}

== ENHANCEMENT ==
- Subtle warm color grade with lifted shadows
- Gentle contrast lift in mid-tones for a polished magazine-quality look

== PRESERVE ==
Every architectural detail, finish, fixture, plant, and furniture piece — only the agent's presence and the color grade should change.

== OUTPUT ==
- 4:5 portrait aspect ratio, Instagram-ready
- Photorealistic, no text overlays, no logos`;

async function fetchB64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "";
  const mime = ct.startsWith("image/") ? ct : url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return { b64: Buffer.from(buf).toString("base64"), mime };
}
function readB64(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return { b64: buf.toString("base64"), mime: ext === ".png" ? "image/png" : "image/jpeg" };
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
  if (!process.env.GEMINI_API_KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const t0 = Date.now();
  console.log(`[${SLUG}] building carousel…`);

  // ── SLIDE 01: cover ──
  console.log("Slide 01 — cover…");
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

  // ── SLIDES 02-05: staged info shots in parallel ──
  console.log("Slides 02-05 — Gemini staging + banners (parallel)…");
  const headshot = await fetchB64(HEADSHOT_URL);
  const stageResults = await Promise.all(
    CFG.staged.map(async (c) => {
      const num = String(c.n).padStart(2, "0");
      try {
        const srcPath = path.join(ORIGINALS_DIR, c.photo);
        const src = readB64(srcPath);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { data: src.b64, mimeType: src.mime } },
              { inlineData: { data: headshot.b64, mimeType: headshot.mime } },
              { text: STAGE_PROMPT(c) },
            ],
          }],
          config: { imageConfig: { aspectRatio: "3:4" } },
        });
        const parts = response?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p) => p?.inlineData?.data);
        if (!imagePart) return { n: c.n, error: "no image from Gemini" };

        const upload = await cloudinary.uploader.upload(
          `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
          { folder: `jpsrealtor/ai-staged/${SLUG}`, public_id: `staged-${num}-${Date.now()}` }
        );
        const bannerUrl = cloudinary.url(upload.public_id, {
          transformation: buildBannerTransform(c.label, c.caption),
        });
        const bytes = await downloadAndSave(bannerUrl, path.join(EDITS_DIR, `slide-${num}.jpg`));
        return { n: c.n, kb: (bytes / 1024).toFixed(0) };
      } catch (e) {
        return { n: c.n, error: e.message };
      }
    })
  );
  for (const r of stageResults) {
    if (r.error) console.log(`  [${r.n}] ❌ ${r.error}`);
    else console.log(`  slide-${String(r.n).padStart(2, "0")}.jpg (${r.kb} KB)`);
  }

  // ── SLIDE 06: CMA ──
  console.log("Slide 06 — CMA…");
  const cmaUrl = cloudinary.url("sample", { transformation: buildCmaTransformation(CFG.cma, CFG.handle) });
  const cmaBytes = await downloadAndSave(cmaUrl, path.join(EDITS_DIR, "slide-06.jpg"));
  console.log(`  slide-06.jpg (${(cmaBytes / 1024).toFixed(0)} KB)`);

  // ── SLIDES 07-09: text posts ──
  for (const p of CFG.textPosts) {
    console.log(`Slide ${String(p.n).padStart(2, "0")} — text post…`);
    const url = cloudinary.url("sample", { transformation: buildTextPostTransformation(p, CFG.handle) });
    const bytes = await downloadAndSave(url, path.join(EDITS_DIR, `slide-${String(p.n).padStart(2, "0")}.jpg`));
    console.log(`  slide-${String(p.n).padStart(2, "0")}.jpg (${(bytes / 1024).toFixed(0)} KB)`);
  }

  // ── SLIDE 10: CTA ──
  console.log("Slide 10 — CTA…");
  const ctaUrl = cloudinary.url("sample", { transformation: buildCtaTransformation(CFG.cta) });
  const ctaBytes = await downloadAndSave(ctaUrl, path.join(EDITS_DIR, "slide-10.jpg"));
  console.log(`  slide-10.jpg (${(ctaBytes / 1024).toFixed(0)} KB)`);

  console.log(`\n[${SLUG}] All done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
