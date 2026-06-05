// scripts/el-nido-stage-and-banner.js
//
// Single-shot pipeline for 48750 El Nido carousel:
//   1. Stage 4 chosen photos through Gemini (with Joseph placement)
//   2. Apply banner captions via Cloudinary
//   3. Save final slide-02..slide-05 to _edits/

require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
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

const HEADSHOT_URL =
  "https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/headshots/head-shot-2026.png";

const FONT = "Poppins";

const CURATION = [
  {
    n: 2,
    photo: "photo-12.jpg",
    room: "expansive modern great room with soaring ceilings, dual modern chandeliers, stone-clad fireplace with mounted TV, oversized cream tufted sectional, dark accent chairs, and an open kitchen with island visible beyond",
    pose: "standing on the area rug between the sectional and the fireplace, body angled three-quarter to the camera, one hand gesturing open-palm toward the kitchen as if presenting the flow of the space",
    expression: "confident, warm smile, direct eye contact with camera",
    label: "THE GREAT ROOM",
    caption: "Soaring ceilings, dual chandeliers, and a fireplace stacked in stone.",
  },
  {
    n: 3,
    photo: "photo-19.jpg",
    room: "open chef's kitchen with stone hood vent, basketweave tile backsplash, large dark island with white marble top and bar seating, sage cabinetry, butler's pantry visible beyond",
    pose: "standing BEHIND the kitchen island so the island hides his lower body, both hands resting lightly on the marble countertop, body angled toward the camera",
    expression: "approachable, slight friendly smile, relaxed posture",
    label: "THE KITCHEN",
    caption: "A chef's kitchen with a stone hood, a butler's pantry, and a counter for everyone.",
  },
  {
    n: 4,
    photo: "photo-25.jpg",
    room: "primary suite bedroom with stacked dark stone accent wall behind the bed, two pendant lights, low king bed with maroon throw pillows, sliding glass doors leading to the pool patio",
    pose: "standing at the foot of the bed slightly to the right side, body angled three-quarter to the camera, one hand gesturing open-palm toward the sliding doors and the pool view beyond",
    expression: "professional, neutral expression with a subtle upturn at the corners of the mouth",
    label: "PRIMARY SUITE",
    caption: "Wake to the mountains. Step through the slider to the pool.",
  },
  {
    n: 5,
    photo: "photo-54.jpg",
    room: "twilight backyard with a square stone fire pit lit with flames in the center, wood lounge chairs and cushioned seating around it, string lights overhead in the olive tree, pool visible behind, mountains in dusk-purple distance",
    pose: "sitting in the cushioned lounge chair nearest the camera on the left, leaning back relaxed, body angled slightly toward the camera, fire pit visible in front to his right",
    expression: "contemplative, soft smile, eyes warm — like enjoying the evening",
    label: "AFTER DARK",
    caption: "The mountains turn purple. The fire pit lights up. The day softens.",
  },
];

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

function buildBannerTransform(label, caption) {
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
    { overlay: "sample", effect: "colorize:100", color: "rgb:000000", opacity: 75, width: 1080, height: 340, crop: "scale", gravity: "south" },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "light", text: label, letter_spacing: 8 }, color: "rgb:DDDDDD", gravity: "south", y: 250 },
    { overlay: "sample", effect: "colorize:100", color: "white", width: 60, height: 1, crop: "scale", gravity: "south", y: 230 },
    { overlay: { font_family: FONT, font_size: 38, font_weight: "light", font_style: "italic", text: caption, letter_spacing: 1 }, width: 900, crop: "fit", color: "white", gravity: "south", y: 80 },
  ];
}

(async () => {
  fs.mkdirSync(EDITS_DIR, { recursive: true });
  if (!process.env.GEMINI_API_KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const headshot = await fetchB64(HEADSHOT_URL);

  const t0 = Date.now();
  const results = await Promise.all(
    CURATION.map(async (c) => {
      const num = String(c.n).padStart(2, "0");
      try {
        const srcPath = path.join(ORIGINALS_DIR, c.photo);
        const src = readB64(srcPath);

        // Stage 1: Gemini composition
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
        if (!imagePart) {
          return { n: c.n, error: "no image from Gemini" };
        }

        // Stage 2: upload staged result to Cloudinary
        const upload = await cloudinary.uploader.upload(
          `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
          {
            folder: `jpsrealtor/ai-staged/${SLUG}`,
            public_id: `staged-${num}-${Date.now()}`,
          }
        );

        // Stage 3: apply banner
        const bannerUrl = cloudinary.url(upload.public_id, {
          transformation: buildBannerTransform(c.label, c.caption),
        });
        const r = await fetch(bannerUrl);
        if (!r.ok) {
          const txt = await r.text();
          return { n: c.n, error: `banner HTTP ${r.status}: ${txt.slice(0, 200)}` };
        }
        const buf = Buffer.from(await r.arrayBuffer());
        const outPath = path.join(EDITS_DIR, `slide-${num}.jpg`);
        fs.writeFileSync(outPath, buf);
        return { n: c.n, outPath, kb: (buf.length / 1024).toFixed(0) };
      } catch (e) {
        return { n: c.n, error: e.message };
      }
    })
  );

  console.log(`Done in ${Date.now() - t0}ms\n`);
  for (const r of results) {
    if (r.error) console.log(`[${r.n}] ❌ ${r.error}`);
    else console.log(`[${r.n}] ✅ ${path.basename(r.outPath)} (${r.kb} KB)`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
