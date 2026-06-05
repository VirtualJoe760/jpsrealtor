// scripts/generate-narration.js
//
// Generates a single narration audio file via ElevenLabs and measures its
// duration. Used for the staging reel pipeline — the audio length drives
// the video timeline.
//
//   usage: node scripts/generate-narration.js <slug>
//
// Reads scripts/data/narration/<slug>.txt for the script body.
// Writes temp-images/<slug>/narration.mp3 and prints duration.

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { storage } = require("./lib/content-storage");

const SLUG = process.argv[2];
const VOICE_OVERRIDE = process.argv[3]; // optional voice_id override
if (!SLUG) { console.error("usage: node scripts/generate-narration.js <slug> [voice_id]"); process.exit(1); }

const SCRIPT_FILE = path.join(__dirname, "data", "narration", `${SLUG}.txt`);
const OUT_DIR = path.join(__dirname, "..", "temp-images", SLUG);
const OUT_FILE = path.join(OUT_DIR, "narration.mp3");

const API_KEY = process.env.ELEVENLABS_API_KEY;
// George — warm captivating storyteller. Default until env voice is unlocked.
const VOICE_ID = VOICE_OVERRIDE || process.env.ELEVENLABS_VOICE_ID_OVERRIDE || "JBFqnCBsd6RMkjVDRZzb";
if (!API_KEY || !VOICE_ID) { console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID"); process.exit(1); }

const MODEL_ID = "eleven_turbo_v2_5"; // fast, natural

(async () => {
  if (!fs.existsSync(SCRIPT_FILE)) { console.error(`Missing script: ${SCRIPT_FILE}`); process.exit(1); }
  const text = fs.readFileSync(SCRIPT_FILE, "utf8").trim();
  console.log(`Script: ${text.length} chars, ${text.split(/\s+/).length} words`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.85,
        style: 0.20,
        use_speaker_boost: true,
      },
    }),
  });
  if (!r.ok) {
    const errText = await r.text();
    console.error(`ElevenLabs ${r.status}: ${errText.slice(0, 300)}`);
    process.exit(1);
  }

  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(OUT_FILE, buf);
  console.log(`Saved local: ${OUT_FILE} (${(buf.length / 1024).toFixed(1)} KB)`);

  // Mirror to Cloudinary (source of truth)
  try {
    const url = await storage(SLUG).putLocal(OUT_FILE, "generated/narration.mp3");
    console.log(`Cloudinary:  ${url}`);
  } catch (e) {
    console.warn(`(cloudinary mirror failed: ${e.message})`);
  }

  // Measure duration via ffprobe (bundled with ffmpeg)
  const { execSync } = require("child_process");
  try {
    const dur = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${OUT_FILE}"`,
      { encoding: "utf8" }
    ).trim();
    console.log(`Duration: ${parseFloat(dur).toFixed(2)}s`);
  } catch (e) {
    console.log(`Duration: (ffprobe not found — install ffmpeg for measurement)`);
  }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
