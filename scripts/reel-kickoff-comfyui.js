// scripts/reel-kickoff-comfyui.js
//
// Phase 3 of the staging-reel pipeline: run all 9 video clips through
// ComfyUI sequentially against a warm RunPod pod, write each MP4 to
// Cloudinary at jpsrealtor/content/<slug>/generated/clips/<id>.mp4.
//
// Sequencing is sequential by design — the A40 holds one job at a time
// in VRAM. The first generation is the cold one (~90s, model load);
// the next 8 are warm (~6s each). Total wall-clock for a 9-clip reel:
// ~3 minutes.
//
//   usage: node scripts/reel-kickoff-comfyui.js <slug>

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const c = require("./lib/comfyui");
const { buildI2VWorkflow, secondsToFrames } = require("./lib/comfyui-workflows");
const { storage } = require("./lib/content-storage");

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: node scripts/reel-kickoff-comfyui.js <slug>"); process.exit(1); }

const CFG = require(path.join(__dirname, "data", "reels", `${SLUG}.js`));
const STORE = storage(SLUG);
const LOCAL_BASE = path.join(__dirname, "..", "temp-images", SLUG);
const CLIPS_DIR = path.join(LOCAL_BASE, "clips");
const ORIGINALS_DIR = path.join(LOCAL_BASE, "originals");
const EMPTIES_DIR = path.join(LOCAL_BASE, "empties");

// Output target sizes — 9:16 vertical for IG Reels. 480p keeps the A40 fast.
const WIDTH = 480;
const HEIGHT = 832;
const FPS = 16;

// Ensure a source frame is present locally (pulls from Cloudinary if not cached).
async function ensureSourceFrame(shot) {
  if (shot.type === "timelapse") {
    // Empty version (NanoBanana output) is the start frame for the morph
    const localPath = path.join(EMPTIES_DIR, `${shot.id}.png`);
    if (!fs.existsSync(localPath)) {
      await STORE.ensureLocal(`generated/empties/${shot.id}.png`);
      const fetched = STORE.localPath(`generated/empties/${shot.id}.png`);
      if (fetched !== localPath) {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.copyFileSync(fetched, localPath);
      }
    }
    return localPath;
  }
  // dolly + sunset: use the original listing photo as the single keyframe
  const localPath = path.join(ORIGINALS_DIR, shot.photo);
  if (!fs.existsSync(localPath)) {
    await STORE.ensureLocal(`source/${shot.photo}`);
    const fetched = STORE.localPath(`source/${shot.photo}`);
    if (fetched !== localPath) {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.copyFileSync(fetched, localPath);
    }
  }
  return localPath;
}

(async () => {
  console.log(`[${SLUG}] starting ${CFG.shots.length}-shot reel kickoff against ${process.env.COMFYUI_URL}`);
  fs.mkdirSync(CLIPS_DIR, { recursive: true });

  // Sanity: confirm the pod is reachable + warm
  const stats = await c.systemStats();
  console.log(`  pod: ${stats.devices?.[0]?.name?.split(":").pop()?.trim()}  vram free: ${(stats.devices[0].vram_free / 1e9).toFixed(1)} GB`);

  const manifest = {
    slug: SLUG,
    createdAt: new Date().toISOString(),
    provider: "comfyui",
    model: "wan2.2_i2v_14B_A14B + lightx2v_4step",
    aspect: "9:16",
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    shots: [],
  };

  const t0 = Date.now();
  for (let i = 0; i < CFG.shots.length; i++) {
    const shot = CFG.shots[i];
    const num = i + 1;
    const tShot = Date.now();
    console.log(`\n[${num}/${CFG.shots.length}] ${shot.id} (${shot.type}, ${shot.duration}s target)`);

    try {
      const sourcePath = await ensureSourceFrame(shot);
      const uploaded = await c.uploadImage(sourcePath);
      console.log(`  uploaded: ${uploaded.name}`);

      const length = secondsToFrames(shot.duration, FPS);
      const workflow = buildI2VWorkflow({
        startImage: uploaded.name,
        positive: shot.lumaPrompt,  // reuse the existing prompt field
        width: WIDTH,
        height: HEIGHT,
        length,
        seed: 100000 + i * 13,
        filenamePrefix: `${SLUG}_${shot.id}`,
      });

      const { prompt_id } = await c.queuePrompt(workflow);
      console.log(`  queued: ${prompt_id}  (length=${length} frames)`);

      let lastReport = Date.now();
      const result = await c.waitForPrompt(prompt_id, {
        pollMs: 3000,
        timeoutMs: 10 * 60 * 1000,
        onProgress: () => {
          if (Date.now() - lastReport < 10000) return;
          lastReport = Date.now();
          process.stdout.write(`    t=${((Date.now() - tShot) / 1000).toFixed(0)}s\n`);
        },
      });

      // Fetch the MP4 from ComfyUI
      const outputs = result?.outputs || {};
      let mp4 = null;
      for (const out of Object.values(outputs)) {
        for (const f of (out.gifs || out.images || [])) {
          if (f.filename?.endsWith(".mp4")) { mp4 = f; break; }
        }
        if (mp4) break;
      }
      if (!mp4) throw new Error("no mp4 in outputs");

      const buf = await c.fetchOutputFile({
        filename: mp4.filename,
        subfolder: mp4.subfolder || "",
        type: mp4.type || "output",
      });
      const localPath = path.join(CLIPS_DIR, `${shot.id}.mp4`);
      fs.writeFileSync(localPath, buf);

      // Mirror to Cloudinary
      const url = await STORE.putLocal(localPath, `generated/clips/${shot.id}.mp4`);

      const tookSec = ((Date.now() - tShot) / 1000).toFixed(1);
      console.log(`  ✅ ${tookSec}s  ${(buf.length / 1024).toFixed(0)} KB  ${url.slice(-60)}`);

      manifest.shots.push({
        id: shot.id,
        type: shot.type,
        targetDuration: shot.duration,
        frames: length,
        localPath,
        cloudinaryUrl: url,
        elapsedSec: parseFloat(tookSec),
      });
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      manifest.shots.push({ id: shot.id, type: shot.type, error: e.message });
    }
  }

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[${SLUG}] done in ${totalSec}s`);

  // Write manifest locally + to Cloudinary
  const manifestPath = path.join(LOCAL_BASE, "comfyui-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  try {
    await STORE.putLocal(manifestPath, "meta/comfyui-manifest.json");
    console.log(`manifest: ${manifestPath} (also at cloudinary/meta/comfyui-manifest.json)`);
  } catch (e) {
    console.log(`manifest (local only — cloudinary mirror failed: ${e.message}): ${manifestPath}`);
  }

  // Summary
  const ok = manifest.shots.filter((s) => !s.error).length;
  const totalGenSec = manifest.shots.filter((s) => s.elapsedSec).reduce((a, s) => a + s.elapsedSec, 0);
  console.log(`\n  ${ok}/${CFG.shots.length} clips generated  ·  total generation: ${totalGenSec.toFixed(1)}s`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
