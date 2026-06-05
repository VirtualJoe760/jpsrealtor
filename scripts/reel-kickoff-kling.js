// scripts/reel-kickoff-kling.js
//
// Phase 2 of the staging-reel pipeline (Kling variant).
// Uploads source frames to Cloudinary, kicks off Kling image2video jobs,
// writes a manifest with task_ids for polling.
//
//   usage: node scripts/reel-kickoff-kling.js <slug>

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const { createImage2Video } = require("./lib/kling");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: node scripts/reel-kickoff-kling.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", "reels", `${SLUG}.js`));
const SLUG_DIR = path.join(__dirname, "..", "temp-images", SLUG);
const ORIGINALS_DIR = path.join(SLUG_DIR, "originals");
const EMPTIES_DIR = path.join(SLUG_DIR, "empties");
const MANIFEST_FILE = path.join(SLUG_DIR, "kling-manifest.json");

const ASPECT = "9:16";
const MODEL = "kling-v1-6";
const MODE = "pro"; // image_tail morphing typically needs pro

async function uploadOnce(localPath, publicId) {
  const r = await cloudinary.uploader.upload(localPath, {
    folder: `jpsrealtor/reels/${SLUG}/frames`,
    public_id: publicId,
    overwrite: true,
  });
  return r.secure_url;
}

(async () => {
  console.log(`[${SLUG}] kicking off Kling generations for ${CFG.shots.length} shots…`);

  const manifest = {
    slug: SLUG,
    createdAt: new Date().toISOString(),
    provider: "kling",
    model: MODEL,
    mode: MODE,
    aspect: ASPECT,
    shots: [],
  };

  for (const shot of CFG.shots) {
    console.log(`\n→ ${shot.id} (${shot.type}, ${shot.duration}s target)`);

    const stagedPath = path.join(ORIGINALS_DIR, shot.photo);
    if (!fs.existsSync(stagedPath)) { console.error(`Missing ${stagedPath}`); continue; }
    const stagedUrl = await uploadOnce(stagedPath, `${shot.id}-staged-${Date.now()}`);
    console.log(`  staged: …${stagedUrl.slice(-50)}`);

    let imageUrl, imageTailUrl;
    if (shot.type === "timelapse") {
      const emptyPath = path.join(EMPTIES_DIR, `${shot.id}.png`);
      if (!fs.existsSync(emptyPath)) { console.error(`Missing empty ${emptyPath}`); continue; }
      const emptyUrl = await uploadOnce(emptyPath, `${shot.id}-empty-${Date.now()}`);
      console.log(`  empty:  …${emptyUrl.slice(-50)}`);
      imageUrl = emptyUrl;      // start frame: empty
      imageTailUrl = stagedUrl; // end frame: staged
    } else {
      imageUrl = stagedUrl;     // single source frame for dolly
    }

    try {
      const result = await createImage2Video({
        imageUrl,
        imageTailUrl,
        prompt: shot.lumaPrompt,  // reuse the prompt field
        model: MODEL,
        mode: MODE,
        duration: "5",
        aspect: ASPECT,
      });
      console.log(`  ✅ task: ${result.task_id} (${result.task_status})`);
      manifest.shots.push({
        id: shot.id,
        type: shot.type,
        targetDuration: shot.duration,
        taskId: result.task_id,
        taskStatus: result.task_status,
        sourcePhoto: shot.photo,
      });
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      manifest.shots.push({
        id: shot.id,
        type: shot.type,
        targetDuration: shot.duration,
        error: e.message,
      });
    }
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${MANIFEST_FILE}`);
  console.log(`Next: node scripts/reel-poll-kling.js ${SLUG}`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
