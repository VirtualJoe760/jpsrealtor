// scripts/generate-medpro-hero.js
//
// Generates the hero image for the MEDPRO PREMIER landing page via
// Gemini 2.5 Flash Image (Nano Banana), uploads to Cloudinary, and prints
// the secure URL for use in the create_landing_page MCP call.

require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PROMPT = `Editorial real-estate photography. A young medical professional — a doctor in clean light blue medical scrubs with a stethoscope around their neck — standing inside a beautifully designed modern desert home, looking thoughtfully through a large floor-to-ceiling window onto a bright Coachella Valley landscape: tall palm trees, a manicured fairway, the Santa Rosa mountains in the distance under a clear blue sky.

The interior is calm and aspirational: neutral travertine floors, soft natural light pouring in, a hint of warm wood paneling. The doctor is shot from medium distance at a three-quarter angle, their face partially visible, their expression contemplative and hopeful — like someone imagining what home ownership could look like.

Mood: optimistic, professional, dignified. Magazine-quality lighting. Soft shallow depth of field with the doctor in sharp focus and the view subtly soft behind.

Composition: 16:9 widescreen, the doctor positioned in the left third of the frame, the window view dominating the right two-thirds. Negative space at the top and bottom for text overlay.

No text. No logos. Photorealistic.`;

(async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  console.log("Generating hero with Gemini 2.5 Flash Image…");
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: PROMPT }] }],
    config: { imageConfig: { aspectRatio: "16:9" } },
  });

  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p?.inlineData?.data);
  if (!imagePart) {
    console.error("No image returned");
    process.exit(1);
  }

  console.log("Uploading to Cloudinary…");
  const upload = await cloudinary.uploader.upload(
    `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
    {
      folder: "jpsrealtor/landing-pages/medpro-premier",
      public_id: `hero-${Date.now()}`,
    }
  );

  console.log("\n=== Hero ready ===");
  console.log("URL:", upload.secure_url);
  console.log("Public ID:", upload.public_id);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
