// scripts/stage-curated-photos.js
//
// Refined v2: better identity preservation, expression variety, occlusion
// allowed, output forced to Instagram 4:5 portrait aspect ratio.

require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const SLUG = "75809-via-pisa";
const ORIGINALS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "originals");
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");

const HEADSHOT_URL =
  "https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/headshots/head-shot-2026.png";

// Curated 10 with per-photo placement + expression + occlusion direction.
const CURATION = [
  {
    n: 1, photo: "photo-08.jpg",
    room: "twilight front entry with iron entry door and Spanish tile roof",
    mode: "enhance_only",
    note: "cover shot — preserve the dramatic dusk lighting and the iron door as the focal point",
  },
  {
    n: 2, photo: "photo-09.jpg",
    room: "twilight open great room with curved sectional, white stone fireplace, dining beyond, and an open pocket slider revealing the lit pool view",
    mode: "enhance_with_agent",
    pose: "standing on the travertine floor between the curved sectional and the open pocket slider, body turned three-quarter to the camera, one hand gesturing open-palm toward the pool view as if presenting it to a buyer",
    expression: "confident, warm smile, direct eye contact with camera",
  },
  {
    n: 3, photo: "photo-22.jpg",
    room: "modern kitchen with dark wood cabinetry, large marble island with prep counter beneath, Sub-Zero refrigerator, gas range with hood, arched windows",
    mode: "enhance_with_agent",
    pose: "standing BEHIND the kitchen island so his hips and lower body are hidden behind the island and only his upper body is visible above the countertop, both hands resting lightly on the marble top, body angled toward the camera",
    expression: "approachable, slight friendly smile, relaxed posture",
    occlusion: true,
  },
  {
    n: 4, photo: "photo-19.jpg",
    room: "round dining room with light wood table, white upholstered chairs, sphere chandelier with candles, open pocket slider to pool view",
    mode: "enhance_with_agent",
    pose: "standing just behind the head dining chair nearest the camera, hands resting lightly on top of the chair back so the chair partially occludes his lower body, body angled toward the camera",
    expression: "subtle approachable smile, eyes warm and engaged",
    occlusion: true,
  },
  {
    n: 5, photo: "photo-15.jpg",
    room: "daytime great room with curved white sectional, suede cream armchair, round travertine coffee table, fireplace with mounted TV, open pocket slider showing pool and golf course",
    mode: "enhance_with_agent",
    pose: "sitting on the right side of the curved sectional, arm resting along the back of the sofa, legs casually crossed, body slightly angled toward the camera",
    expression: "relaxed, easy-going smile, slight head tilt, looking comfortably at the camera",
  },
  {
    n: 6, photo: "photo-42.jpg",
    room: "primary suite bedroom with king bed, faux fur throw, dark dressers, slider with pool view visible at night",
    mode: "enhance_with_agent",
    pose: "standing near the foot of the bed but slightly to the right side so the bed is to his left, body angled three-quarter to the camera, one hand gesturing open-palm toward the room as if presenting it",
    expression: "professional, neutral expression with a subtle upturn at the corners of the mouth",
  },
  {
    n: 7, photo: "photo-39.jpg",
    room: "twilight backyard with circular fire pit lit with flames, adirondack chairs surrounding it, lit home in background",
    mode: "enhance_with_agent",
    pose: "sitting in the adirondack chair on the LEFT closest to the camera, body angled slightly toward the camera, forearms resting on the chair arms, the fire pit visible to his right in front",
    expression: "contemplative, soft smile, eyes warm — like enjoying the evening",
  },
  {
    n: 8, photo: "photo-00.jpg",
    room: "pool with raised round spa, mountain and golf course view in background",
    mode: "enhance_only",
    note: "let the view be the hero — no agent so it doesn't look uncanny by the pool",
  },
  {
    n: 9, photo: "photo-33.jpg",
    room: "golden hour sunset over the golf course as seen from the pool's edge with reflection",
    mode: "enhance_only",
    note: "the sunset IS the moment — preserve the gold/orange palette and water reflection",
  },
  {
    n: 10, photo: "photo-60.jpg",
    room: "aerial drone shot of the entire property showing pool, spa, mountain backdrop, neighboring golf course",
    mode: "enhance_only",
    note: "aerial shot — agent would be invisible from this height",
  },
];

const ENHANCE_PROMPT = (room, note) => `Enhance this real-estate photo to modern professional magazine quality. The scene is a ${room}.

ENHANCEMENT:
- Subtle warm color grade with lifted shadows
- Gentle contrast boost in mid-tones for depth
- Crisp focus throughout

PRESERVE: every architectural detail, finish, and fixture exactly as shown.${note ? "\n\nNOTE: " + note : ""}

OUTPUT FORMAT:
- 4:5 portrait aspect ratio (taller than wide), Instagram-ready
- Photorealistic
- No text overlays, no logos, no watermarks`;

const STAGE_PROMPT = (c) => `Take the FIRST image (a ${c.room}) and naturally insert the person from the SECOND image into the scene as a real-estate agent showing the home.

== IDENTITY PRESERVATION (CRITICAL) ==
- Match the person's facial features EXACTLY as shown in the second image
- Preserve: hair color & texture, face shape, jawline, skin tone, eye color, eyebrow shape, nose, lips
- Do NOT idealize, smooth, slim, or otherwise alter their appearance
- Render him in a professional dark gray suit jacket with a light blue collared shirt (no tie), matching the source headshot

== PLACEMENT ==
${c.pose}
${c.occlusion ? "\n- IMPORTANT: allow natural occlusion — objects in the foreground (counter, chair back, etc.) should partially hide his lower body for realistic depth\n" : ""}
== LIGHTING & PHYSICS ==
- Match the room's light direction and color temperature exactly
- Cast realistic shadows consistent with the room's light source(s)
- Scale him proportionally to the room (typical adult male ~5'10")
- Edge-blend cleanly with the scene; no halo or cutout artifacts

== EXPRESSION ==
${c.expression}

== ENHANCEMENT ==
- Subtle warm color grade with lifted shadows
- Gentle contrast lift in mid-tones for a polished magazine-quality look distinct from the original MLS shot

== PRESERVE ==
Every architectural detail, finish, fixture, plant, and furniture piece in the scene — only the agent's presence and the color grade should change.

== OUTPUT FORMAT ==
- 4:5 portrait aspect ratio (taller than wide), Instagram-ready
- Photorealistic real-estate marketing photo
- No text overlays, no logos, no watermarks`;

async function fetchB64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "";
  const mime = ct.startsWith("image/") ? ct : url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return { b64: Buffer.from(buf).toString("base64"), mime };
}

function readB64FromDisk(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return { b64: buf.toString("base64"), mime };
}

(async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }
  fs.mkdirSync(EDITS_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const headshot = await fetchB64(HEADSHOT_URL);

  const t0 = Date.now();
  const results = await Promise.all(
    CURATION.map(async (c) => {
      const srcPath = path.join(ORIGINALS_DIR, c.photo);
      if (!fs.existsSync(srcPath)) return { n: c.n, error: `not found: ${c.photo}` };
      const src = readB64FromDisk(srcPath);

      const parts = [{ inlineData: { data: src.b64, mimeType: src.mime } }];
      let prompt;
      if (c.mode === "enhance_with_agent") {
        parts.push({ inlineData: { data: headshot.b64, mimeType: headshot.mime } });
        prompt = STAGE_PROMPT(c);
      } else {
        prompt = ENHANCE_PROMPT(c.room, c.note);
      }
      parts.push({ text: prompt });

      try {
        const t = Date.now();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{ role: "user", parts }],
          config: {
            // Best-effort hint to the model. Gemini Flash Image's native
            // sizes are 1:1, 3:4, 4:3, 9:16, 16:9 — 3:4 is closest to IG 4:5.
            imageConfig: { aspectRatio: "3:4" },
          },
        });
        const responseParts = response?.candidates?.[0]?.content?.parts || [];
        const imagePart = responseParts.find((p) => p?.inlineData?.data);
        if (!imagePart) {
          const text = responseParts.find((p) => p?.text)?.text;
          return { n: c.n, photo: c.photo, error: "no image returned" + (text ? ": " + text.slice(0, 200) : "") };
        }
        const outBuf = Buffer.from(imagePart.inlineData.data, "base64");
        const ext = (imagePart.inlineData.mimeType || "image/png").endsWith("png") ? "png" : "jpg";
        const outName = `slide-${String(c.n).padStart(2, "0")}.${ext}`;
        const outPath = path.join(EDITS_DIR, outName);
        fs.writeFileSync(outPath, outBuf);
        return { n: c.n, photo: c.photo, outPath, ms: Date.now() - t, kb: (outBuf.length / 1024).toFixed(0) };
      } catch (e) {
        return { n: c.n, photo: c.photo, error: e.message };
      }
    })
  );

  console.log("\nDone in", Date.now() - t0, "ms\n");
  for (const r of results) {
    if (r.error) console.log(`[${r.n}] ❌ ${r.photo} → ${r.error}`);
    else console.log(`[${r.n}] ✅ ${r.photo} → ${path.basename(r.outPath)} (${r.kb} KB, ${r.ms}ms)`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
