// scripts/reel-smoke-comfyui.js
//
// Smoke test for the WAN 2.2 FLF2V pipeline on the RunPod ComfyUI pod.
// Uploads 1-Makena great-room (empty + staged) and queues a FLF2V job
// with Lightning LoRA (4-step distilled) on the two-expert MoE.
// Outputs the result to temp-images/_smoke/great-room-test.webp (or mp4).

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const c = require("./lib/comfyui");

const EMPTY_FILE = "temp-images/1-makena/empties/great-room.png";
const STAGED_FILE = "temp-images/1-makena/originals/photo-10.jpg";
const OUT_DIR = "temp-images/_smoke";

const POSITIVE = "smooth time-lapse staging effect, furniture and decor materialize and arrange into the room, soaring wood-clad ceiling, modern great room, magazine-quality, consistent natural daylight";
const NEGATIVE = "low quality, blurry, distorted, watermark, text, logo, motion blur, jitter, deformed";

// 9:16 vertical aspect, 480p target. Step 16 required by the WAN VAE.
const WIDTH  = 480;
const HEIGHT = 832;
const LENGTH = 81;   // frames; 81 @ 16fps ≈ 5s
const SEED   = 12345;

function buildWorkflow({ emptyImage, stagedImage, positive, negative }) {
  return {
    // ── Models ──
    "10": { class_type: "UNETLoader", inputs: {
      unet_name: "wan2.2_i2v_high_noise_14B_fp16.safetensors",
      weight_dtype: "default",
    }},
    "11": { class_type: "LoraLoaderModelOnly", inputs: {
      model: ["10", 0],
      lora_name: "wan2.2_i2v_A14b_high_noise_lora_rank64_lightx2v_4step_1022.safetensors",
      strength_model: 1.0,
    }},
    "12": { class_type: "ModelSamplingSD3", inputs: { model: ["11", 0], shift: 8.0 }},

    "20": { class_type: "UNETLoader", inputs: {
      unet_name: "wan2.2_i2v_low_noise_14B_fp16.safetensors",
      weight_dtype: "default",
    }},
    "21": { class_type: "LoraLoaderModelOnly", inputs: {
      model: ["20", 0],
      lora_name: "wan2.2_i2v_A14b_low_noise_lora_rank64_lightx2v_4step_1022.safetensors",
      strength_model: 1.0,
    }},
    "22": { class_type: "ModelSamplingSD3", inputs: { model: ["21", 0], shift: 8.0 }},

    // ── Text encoder + prompts ──
    "30": { class_type: "CLIPLoader", inputs: {
      clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
      type: "wan",
      device: "default",
    }},
    "31": { class_type: "CLIPTextEncode", inputs: { clip: ["30", 0], text: positive }},
    "32": { class_type: "CLIPTextEncode", inputs: { clip: ["30", 0], text: negative }},

    // ── VAE ──
    // The WAN 2.2 14B I2V model was trained with the WAN 2.1 VAE (16-channel
    // latents, 36 conditioning channels). The newer wan2.2_vae.safetensors is
    // for the 5B model (48-channel) and produces a shape mismatch.
    "40": { class_type: "VAELoader", inputs: { vae_name: "wan_2.1_vae.safetensors" }},

    // ── CLIP vision + keyframes ──
    "50": { class_type: "CLIPVisionLoader", inputs: { clip_name: "clip_vision_h.safetensors" }},

    "60": { class_type: "LoadImage", inputs: { image: emptyImage }},  // start frame
    "61": { class_type: "CLIPVisionEncode", inputs: { clip_vision: ["50", 0], image: ["60", 0], crop: "center" }},

    // (end frame intentionally unused — WAN 2.2 14B I2V is single-keyframe.)

    // ── I2V combine (WAN 2.2 14B with WAN 2.1 VAE = 36-channel conditioning)
    // WanImageToVideo + wan_2.1_vae produces the right shape for the 14B model.
    // Wan22ImageToVideoLatent is for the 5B model with the 16x-downsample 2.2 VAE.
    "80": { class_type: "WanImageToVideo", inputs: {
      positive: ["31", 0], negative: ["32", 0], vae: ["40", 0],
      width: WIDTH, height: HEIGHT, length: LENGTH, batch_size: 1,
      start_image: ["60", 0],
      clip_vision_output: ["61", 0],
    }},

    // ── Two-expert sampling, Lightning 4-step ──
    // WanImageToVideo outputs (positive, negative, latent) — use those.
    "90": { class_type: "KSamplerAdvanced", inputs: {
      model: ["12", 0],
      add_noise: "enable",
      noise_seed: SEED,
      steps: 4, cfg: 1.0,
      sampler_name: "euler", scheduler: "simple",
      positive: ["80", 0], negative: ["80", 1], latent_image: ["80", 2],
      start_at_step: 0, end_at_step: 2,
      return_with_leftover_noise: "enable",
    }},
    "91": { class_type: "KSamplerAdvanced", inputs: {
      model: ["22", 0],
      add_noise: "disable",
      noise_seed: SEED,
      steps: 4, cfg: 1.0,
      sampler_name: "euler", scheduler: "simple",
      positive: ["80", 0], negative: ["80", 1], latent_image: ["90", 0],
      start_at_step: 2, end_at_step: 10000,
      return_with_leftover_noise: "disable",
    }},

    // ── Decode + save as MP4 ──
    "100": { class_type: "VAEDecode", inputs: { samples: ["91", 0], vae: ["40", 0] }},
    "110": { class_type: "VHS_VideoCombine", inputs: {
      images: ["100", 0],
      frame_rate: 16,
      loop_count: 0,
      filename_prefix: "wan22_smoke",
      format: "video/h264-mp4",
      pix_fmt: "yuv420p",
      crf: 19,
      save_metadata: false,
      pingpong: false,
      save_output: true,
    }},
  };
}

(async () => {
  console.log("Uploading source frames…");
  const empty = await c.uploadImage(EMPTY_FILE);
  const staged = await c.uploadImage(STAGED_FILE);
  console.log(`  empty:  ${empty.name}`);
  console.log(`  staged: ${staged.name}`);

  const workflow = buildWorkflow({
    emptyImage: empty.name,
    stagedImage: staged.name,
    positive: POSITIVE,
    negative: NEGATIVE,
  });

  console.log(`\nQueueing FLF2V job (${WIDTH}x${HEIGHT}, ${LENGTH} frames, Lightning 4-step)…`);
  const t0 = Date.now();
  const { prompt_id } = await c.queuePrompt(workflow);
  console.log(`  prompt_id: ${prompt_id}`);

  let lastReport = 0;
  const result = await c.waitForPrompt(prompt_id, {
    pollMs: 4000,
    timeoutMs: 15 * 60 * 1000,
    onProgress: ({ running, pending }) => {
      const now = Date.now();
      if (now - lastReport < 8000) return;
      lastReport = now;
      const t = ((now - t0) / 1000).toFixed(0);
      console.log(`  t=${t}s  running=${running}  pending=${pending}`);
    },
  });
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Completed in ${totalSec}s`);

  // Pluck the output file(s)
  const outputs = result?.outputs || {};
  let saved = 0;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [nodeId, out] of Object.entries(outputs)) {
    for (const f of (out.images || []).concat(out.gifs || [])) {
      const buf = await c.fetchOutputFile({
        filename: f.filename,
        subfolder: f.subfolder || "",
        type: f.type || "output",
      });
      const localPath = path.join(OUT_DIR, f.filename);
      fs.writeFileSync(localPath, buf);
      console.log(`  saved: ${localPath} (${(buf.length / 1024).toFixed(1)} KB)`);
      saved++;
    }
  }
  if (!saved) {
    console.log("\n⚠ No outputs found. Full history:");
    console.log(JSON.stringify(result, null, 2).slice(0, 2000));
  }
})().catch(e => { console.error("\nFATAL:", e.message); if (e.response) console.error(JSON.stringify(e.response, null, 2)); process.exit(1); });
