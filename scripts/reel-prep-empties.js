// scripts/reel-prep-empties.js
//
// Phase 1 of the staging-reel pipeline.
// For each "timelapse room" photo, generate an empty version via Gemini
// 2.5 Flash Image (NanoBanana) — furniture, decor, rugs, art removed,
// architecture preserved.
//
// Cloudinary is the source of truth. Reads source photos from
// jpsrealtor/content/<slug>/source/ (pulled into the local cache if
// missing) and writes empties to jpsrealtor/content/<slug>/generated/empties/.
// Local temp-images/<slug>/{originals,empties}/ remains as a dev cache.
//
//   usage: node scripts/reel-prep-empties.js <slug>

require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const { storage } = require("./lib/content-storage");

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: node scripts/reel-prep-empties.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", "reels", `${SLUG}.js`));
const STORE = storage(SLUG);
const LOCAL_BASE = path.join(__dirname, "..", "temp-images", SLUG);
const ORIGINALS_DIR = path.join(LOCAL_BASE, "originals");
const OUT_DIR = path.join(LOCAL_BASE, "empties");

const EMPTY_PROMPT = (roomDesc) => `Take this image of a ${roomDesc} and REMOVE every piece of movable furniture, decor, and styling. Specifically remove: sofas, sectionals, chairs, ottomans, beds, mattresses, bedding, pillows, throws, rugs, artwork, sculptures, vases, books, decorative objects, plants in movable pots, table lamps, area rugs.

PRESERVE EXACTLY, do not alter:
- All walls, floor surface, ceiling, and architectural finishes
- Windows, sliding doors, and their treatments
- Built-in cabinetry, countertops, kitchen islands, kitchen appliances
- Recessed lighting, pendants, ceiling-mounted fixtures, wall sconces
- Built-in fireplaces, mantels, stone-clad walls, marble slabs
- Architectural ceiling details (wood paneling, beams, coffers)
- Camera angle, framing, exposure, white balance, lighting direction
- Any plants or trees visible OUTSIDE through windows

The result should look like a brand-new construction handover: a pristine empty space ready to be staged, photographed at the same time of day from the same camera position as the original. Photorealistic. No text or labels.`;

function readB64(filePath) {
  const buf = fs.readFileSync(filePath);
  return { b64: buf.toString("base64"), mime: "image/jpeg" };
}

(async () => {
  if (!process.env.GEMINI_API_KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = CFG.shots.filter((s) => s.type === "timelapse");
  console.log(`[${SLUG}] generating ${targets.length} empty versions in parallel…`);

  const t0 = Date.now();
  const results = await Promise.all(
    targets.map(async (shot) => {
      // Ensure source photo is local (fetch from Cloudinary if not cached)
      const srcPath = path.join(ORIGINALS_DIR, shot.photo);
      if (!fs.existsSync(srcPath)) {
        try {
          await STORE.ensureLocal(`source/${shot.photo}`);
          // ensureLocal puts to STORE.localPath('source/<photo>') — copy to ORIGINALS_DIR
          const fetched = STORE.localPath(`source/${shot.photo}`);
          if (fetched !== srcPath) {
            fs.mkdirSync(path.dirname(srcPath), { recursive: true });
            fs.copyFileSync(fetched, srcPath);
          }
        } catch (e) {
          return { id: shot.id, error: `missing source and cloud fetch failed: ${e.message}` };
        }
      }
      const src = readB64(srcPath);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { data: src.b64, mimeType: src.mime } },
              { text: EMPTY_PROMPT(shot.roomDesc) },
            ],
          }],
        });
        const parts = response?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p) => p?.inlineData?.data);
        if (!imagePart) return { id: shot.id, error: "no image returned" };
        const buf = Buffer.from(imagePart.inlineData.data, "base64");
        // Write local cache
        const outPath = path.join(OUT_DIR, `${shot.id}.png`);
        fs.writeFileSync(outPath, buf);
        // Mirror to Cloudinary (source of truth)
        const url = await STORE.putBuffer(buf, `generated/empties/${shot.id}.png`, { mime: "image/png" });
        return { id: shot.id, outPath, url, kb: (buf.length / 1024).toFixed(0) };
      } catch (e) {
        return { id: shot.id, error: e.message };
      }
    })
  );

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const r of results) {
    if (r.error) console.log(`  [${r.id}] ❌ ${r.error}`);
    else console.log(`  [${r.id}] ✅ ${path.basename(r.outPath)} (${r.kb} KB)`);
  }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
