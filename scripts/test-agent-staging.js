// scripts/test-agent-staging.js
//
// Two-stage pipeline test:
//   Stage 1: Gemini 2.5 Flash analyzes the listing photo and returns
//            structured JSON: roomType, features, lighting, agent
//            placement/pose/facing.
//   Stage 2: Gemini 2.5 Flash Image takes the original photo + headshot
//            + a TAILORED prompt built from Stage 1's analysis, and
//            generates the composed image.
//
// Output: Cloudinary URLs at 4:5 portrait + the per-photo analysis so
// we can debug what Gemini "saw" before generating.

require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const HEADSHOT_URL =
  "https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/headshots/head-shot-2026.png";
const LISTING_KEY = "20260429174250492207000000"; // 75809 Via Pisa, Toscana CC
const TEST_COUNT = 2;

const ANALYSIS_PROMPT = `You are analyzing a real estate listing photo so we can naturally insert a real estate agent into the scene for a marketing carousel.

Analyze the photo and return ONLY valid JSON with these fields (no preamble, no markdown code fences):

{
  "roomType": "e.g. living room | kitchen | master suite | backyard pool | front exterior | dining room",
  "description": "2 sentences describing the scene's character — finishes, mood, what makes this room distinctive",
  "keyFeatures": ["3-5 specific architectural or design features", "e.g. vaulted beamed ceiling", "stone fireplace", "golf course view through arched window"],
  "lighting": {
    "direction": "where natural light is coming from, e.g. 'from windows on left side'",
    "temperature": "warm | neutral | cool",
    "intensity": "soft | bright | dramatic"
  },
  "agentPlacement": "specific spot where the agent should stand — pick a location that does NOT block the key features and looks natural for an agent showing a home. e.g. 'near the kitchen island, mid-frame on the right' or 'at the edge of the pool deck, looking back toward the house'",
  "agentPose": "specific pose — e.g. 'standing relaxed with hand resting on counter', 'gesturing toward the fireplace', 'walking through the space with one hand in pocket'",
  "agentFacing": "which way they should face — e.g. 'angled 3/4 toward camera while looking at the view', 'directly at camera with friendly smile'",
  "enhancementNotes": "what photography enhancements would elevate this from MLS-quality to magazine-quality, e.g. 'lift shadows in the corners, slight warm grade in highlights, tighten composition by cropping in 10%'"
}

Be specific to THIS photo. Generic answers like 'place them in the center' are useless.`;

function buildCompositionPrompt(analysis) {
  return `Place the real-estate agent shown in the second image naturally into the scene from the first image (a ${analysis.roomType}).

PLACEMENT — be precise:
- Position: ${analysis.agentPlacement}
- Pose: ${analysis.agentPose}
- Facing: ${analysis.agentFacing}
- Scale them realistically for the room
- Cast appropriate shadows for the room's lighting (${analysis.lighting?.direction || "natural light"}, ${analysis.lighting?.temperature || "neutral"} temperature, ${analysis.lighting?.intensity || "soft"})
- Match the agent's lighting to the room

ENHANCEMENT — make it look like modern professional real-estate photography (NOT an MLS snapshot):
- ${analysis.enhancementNotes || "lift the shadows slightly, warm color grade in highlights, magazine-style contrast"}
- Subtle vignette to draw the eye to the agent
- Crisp focus, no blur

PRESERVE — do not change:
- Any architectural details
- Key features: ${(analysis.keyFeatures || []).join(", ")}
- The home's overall character

Output: a polished real-estate marketing photo, portrait orientation, no text overlays, no logos.`;
}

async function fetchB64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed (${r.status}): ${url}`);
  const buf = await r.arrayBuffer();
  const ct = r.headers.get("content-type") || "";
  const mime = ct.startsWith("image/") ? ct : url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return { b64: Buffer.from(buf).toString("base64"), mime };
}

async function analyzePhoto(ai, photoB64, photoMime) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: photoB64, mimeType: photoMime } },
          { text: ANALYSIS_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });
  const text = response?.candidates?.[0]?.content?.parts?.find((p) => p?.text)?.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse analysis JSON:", text.slice(0, 300));
    return null;
  }
}

async function composeImage(ai, listingB64, listingMime, headshotB64, headshotMime, prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: listingB64, mimeType: listingMime } },
          { inlineData: { data: headshotB64, mimeType: headshotMime } },
          { text: prompt },
        ],
      },
    ],
  });
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p?.inlineData?.data);
  if (!imagePart) {
    const text = parts.find((p) => p?.text)?.text;
    throw new Error("Gemini returned no image" + (text ? `. Text: ${text.slice(0, 200)}` : ""));
  }
  return imagePart.inlineData;
}

(async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }

  const photosRes = await fetch(`http://localhost:3000/api/listings/${LISTING_KEY}/photos`);
  const photosData = await photosRes.json();
  const photos = (photosData.photos || []).slice(0, TEST_COUNT);
  console.log(`Pulled ${photos.length} photos.\n`);

  const headshot = await fetchB64(HEADSHOT_URL);
  console.log(`Headshot loaded (${Math.round((headshot.b64.length * 3) / 4 / 1024)}KB)\n`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const t0 = Date.now();

  const results = await Promise.all(
    photos.map(async (photo, i) => {
      const url = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.url;
      console.log(`[${i}] Stage 1 — analyzing photo…`);
      const src = await fetchB64(url);
      const analysis = await analyzePhoto(ai, src.b64, src.mime);
      if (!analysis) {
        return { index: i, error: "analysis_failed" };
      }
      console.log(`[${i}] Stage 1 done — ${analysis.roomType}, agent: ${analysis.agentPlacement?.slice(0, 60)}…`);

      const prompt = buildCompositionPrompt(analysis);
      console.log(`[${i}] Stage 2 — composing…`);
      const imgData = await composeImage(ai, src.b64, src.mime, headshot.b64, headshot.mime, prompt);
      console.log(`[${i}] Stage 2 done — uploading…`);

      const upload = await cloudinary.uploader.upload(
        `data:${imgData.mimeType || "image/png"};base64,${imgData.data}`,
        {
          folder: `jpsrealtor/ai-staged/${LISTING_KEY}`,
          public_id: `v2-${Date.now()}-${i}`,
          transformation: [
            { aspect_ratio: "4:5", crop: "fill", gravity: "auto", width: 1080 },
            { quality: "auto:good", fetch_format: "auto" },
          ],
        }
      );

      console.log(`[${i}] ✅ ${upload.secure_url}`);
      return {
        index: i,
        originalUrl: url,
        stagedUrl: upload.secure_url,
        analysis,
      };
    })
  );

  console.log(`\nTotal time: ${Date.now() - t0}ms`);
  console.log("\n=== Results ===\n");
  for (const r of results) {
    if (r.error) {
      console.log(`[${r.index}] ERROR: ${r.error}`);
      continue;
    }
    console.log(`[${r.index}] ${r.analysis.roomType}`);
    console.log(`     Placement: ${r.analysis.agentPlacement}`);
    console.log(`     Pose: ${r.analysis.agentPose}`);
    console.log(`     URL: ${r.stagedUrl}`);
    console.log();
  }
})();
