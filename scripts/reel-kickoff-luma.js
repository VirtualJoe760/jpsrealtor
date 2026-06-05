// scripts/reel-kickoff-luma.js
//
// Phase 2 of the staging-reel pipeline.
// Uploads source frames to Cloudinary, kicks off Luma Ray-2 generations
// for all 9 shots, writes a manifest with generation IDs for polling.
//
//   usage: node scripts/reel-kickoff-luma.js <slug>

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: node scripts/reel-kickoff-luma.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", "reels", `${SLUG}.js`));
const SLUG_DIR = path.join(__dirname, "..", "temp-images", SLUG);
const ORIGINALS_DIR = path.join(SLUG_DIR, "originals");
const EMPTIES_DIR = path.join(SLUG_DIR, "empties");
const MANIFEST_FILE = path.join(SLUG_DIR, "luma-manifest.json");

const LUMA_API = "https://api.lumalabs.ai/dream-machine/v1/generations";
const LUMA_KEY = process.env.LUMA_API_KEY;
if (!LUMA_KEY) { console.error("Missing LUMA_API_KEY"); process.exit(1); }

// Reel aspect: 9:16 for IG Reels.
const ASPECT = "9:16";
const MODEL = "ray-2";

async function uploadOnce(localPath, publicId) {
  const r = await cloudinary.uploader.upload(localPath, {
    folder: `jpsrealtor/reels/${SLUG}/frames`,
    public_id: publicId,
    overwrite: true,
  });
  return r.secure_url;
}

async function lumaCreate(body) {
  const r = await fetch(LUMA_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LUMA_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) {
    const err = new Error(`Luma ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
    err.response = j;
    throw err;
  }
  return j;
}

(async () => {
  console.log(`[${SLUG}] kicking off Luma generations for ${CFG.shots.length} shots…`);

  const manifest = {
    slug: SLUG,
    createdAt: new Date().toISOString(),
    aspect: ASPECT,
    model: MODEL,
    shots: [],
  };

  for (const shot of CFG.shots) {
    console.log(`\n→ ${shot.id} (${shot.type}, ${shot.duration}s)`);

    // Upload frame(s)
    const stagedPath = path.join(ORIGINALS_DIR, shot.photo);
    if (!fs.existsSync(stagedPath)) { console.error(`Missing ${stagedPath}`); continue; }
    const stagedUrl = await uploadOnce(stagedPath, `${shot.id}-staged-${Date.now()}`);
    console.log(`  uploaded staged: ${stagedUrl.slice(-60)}`);

    let body;
    if (shot.type === "timelapse") {
      const emptyPath = path.join(EMPTIES_DIR, `${shot.id}.png`);
      if (!fs.existsSync(emptyPath)) { console.error(`Missing empty ${emptyPath}`); continue; }
      const emptyUrl = await uploadOnce(emptyPath, `${shot.id}-empty-${Date.now()}`);
      console.log(`  uploaded empty:  ${emptyUrl.slice(-60)}`);
      body = {
        model: MODEL,
        prompt: shot.lumaPrompt,
        aspect_ratio: ASPECT,
        keyframes: {
          frame0: { type: "image", url: emptyUrl },
          frame1: { type: "image", url: stagedUrl },
        },
      };
    } else {
      // dolly: single frame
      body = {
        model: MODEL,
        prompt: shot.lumaPrompt,
        aspect_ratio: ASPECT,
        keyframes: {
          frame0: { type: "image", url: stagedUrl },
        },
      };
    }

    try {
      const gen = await lumaCreate(body);
      console.log(`  ✅ created: ${gen.id} (state: ${gen.state})`);
      manifest.shots.push({
        id: shot.id,
        type: shot.type,
        duration: shot.duration,
        lumaId: gen.id,
        lumaState: gen.state,
        sourcePhoto: shot.photo,
      });
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      manifest.shots.push({
        id: shot.id,
        type: shot.type,
        duration: shot.duration,
        error: e.message,
      });
    }
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${MANIFEST_FILE}`);
  console.log(`Next: node scripts/reel-poll-luma.js ${SLUG}`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
