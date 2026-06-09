// scripts/lib/comfyui-workflows.js
//
// Reusable API-format ComfyUI workflow builders for the staging-reel
// pipeline. Each builder returns a {nodeId: {class_type, inputs}} object
// ready to POST to /prompt.
//
// Pairings are LOAD-BEARING — see memory project_wan22_comfyui_config:
//   model:       wan2.2_i2v_high_noise_14B + low_noise (two-expert MoE)
//   vae:         wan_2.1_vae.safetensors  (NOT wan2.2_vae)
//   latent node: WanImageToVideo          (NOT WanFirstLastFrameToVideo / Wan22ImageToVideoLatent)
//   loras:       wan2.2_i2v_A14b_*_lightx2v_4step_1022.safetensors  (Lightning)
//   output:      VHS_VideoCombine with save_output: true

const MODEL_HIGH = "wan2.2_i2v_high_noise_14B_fp16.safetensors";
const MODEL_LOW  = "wan2.2_i2v_low_noise_14B_fp16.safetensors";
const LORA_HIGH  = "wan2.2_i2v_A14b_high_noise_lora_rank64_lightx2v_4step_1022.safetensors";
const LORA_LOW   = "wan2.2_i2v_A14b_low_noise_lora_rank64_lightx2v_4step_1022.safetensors";
const VAE        = "wan_2.1_vae.safetensors";
const TEXT_ENC   = "umt5_xxl_fp8_e4m3fn_scaled.safetensors";
const CLIP_VIS   = "clip_vision_h.safetensors";

const NEG_DEFAULT =
  "low quality, blurry, distorted, watermark, text overlay, logo, motion blur, jitter, deformed, glitch, " +
  "extra limbs, extra fingers, malformed, person, people, humans";

// Snap a target frame count to the WAN constraint (length - 1) ≡ 0 mod 4.
// Also enforce min/max bounds.
function snapLength(targetFrames, { min = 33, max = 161 } = {}) {
  const t = Math.max(min, Math.min(max, Math.round(targetFrames)));
  // Round so (t - 1) is a multiple of 4
  const k = Math.round((t - 1) / 4);
  return Math.max(min, k * 4 + 1);
}

function secondsToFrames(seconds, fps = 16) {
  return snapLength(seconds * fps);
}

// Single-keyframe I2V workflow (used by both timelapse and dolly shots).
// `startImage` is the server-side filename (returned from uploadImage).
function buildI2VWorkflow({
  startImage,
  positive,
  negative = NEG_DEFAULT,
  width = 480,
  height = 832,
  length = 81,
  seed = 12345,
  filenamePrefix = "wan22_clip",
  fps = 16,
  crf = 19,
}) {
  return {
    // High-noise expert + Lightning LoRA + SD3 sampling
    "10": { class_type: "UNETLoader", inputs: { unet_name: MODEL_HIGH, weight_dtype: "default" }},
    "11": { class_type: "LoraLoaderModelOnly", inputs: { model: ["10", 0], lora_name: LORA_HIGH, strength_model: 1.0 }},
    "12": { class_type: "ModelSamplingSD3", inputs: { model: ["11", 0], shift: 8.0 }},

    // Low-noise expert + Lightning LoRA + SD3 sampling
    "20": { class_type: "UNETLoader", inputs: { unet_name: MODEL_LOW, weight_dtype: "default" }},
    "21": { class_type: "LoraLoaderModelOnly", inputs: { model: ["20", 0], lora_name: LORA_LOW, strength_model: 1.0 }},
    "22": { class_type: "ModelSamplingSD3", inputs: { model: ["21", 0], shift: 8.0 }},

    // Text encoder + prompts
    "30": { class_type: "CLIPLoader", inputs: { clip_name: TEXT_ENC, type: "wan", device: "default" }},
    "31": { class_type: "CLIPTextEncode", inputs: { clip: ["30", 0], text: positive }},
    "32": { class_type: "CLIPTextEncode", inputs: { clip: ["30", 0], text: negative }},

    // VAE
    "40": { class_type: "VAELoader", inputs: { vae_name: VAE }},

    // CLIP vision + start keyframe
    "50": { class_type: "CLIPVisionLoader", inputs: { clip_name: CLIP_VIS }},
    "60": { class_type: "LoadImage", inputs: { image: startImage }},
    "61": { class_type: "CLIPVisionEncode", inputs: { clip_vision: ["50", 0], image: ["60", 0], crop: "center" }},

    // I2V combine (14B single-keyframe)
    "80": { class_type: "WanImageToVideo", inputs: {
      positive: ["31", 0], negative: ["32", 0], vae: ["40", 0],
      width, height, length, batch_size: 1,
      start_image: ["60", 0],
      clip_vision_output: ["61", 0],
    }},

    // Two-expert sampling, Lightning 4-step
    "90": { class_type: "KSamplerAdvanced", inputs: {
      model: ["12", 0],
      add_noise: "enable",
      noise_seed: seed,
      steps: 4, cfg: 1.0,
      sampler_name: "euler", scheduler: "simple",
      positive: ["80", 0], negative: ["80", 1], latent_image: ["80", 2],
      start_at_step: 0, end_at_step: 2,
      return_with_leftover_noise: "enable",
    }},
    "91": { class_type: "KSamplerAdvanced", inputs: {
      model: ["22", 0],
      add_noise: "disable",
      noise_seed: seed,
      steps: 4, cfg: 1.0,
      sampler_name: "euler", scheduler: "simple",
      positive: ["80", 0], negative: ["80", 1], latent_image: ["90", 0],
      start_at_step: 2, end_at_step: 10000,
      return_with_leftover_noise: "disable",
    }},

    // Decode + save MP4
    "100": { class_type: "VAEDecode", inputs: { samples: ["91", 0], vae: ["40", 0] }},
    "110": { class_type: "VHS_VideoCombine", inputs: {
      images: ["100", 0],
      frame_rate: fps,
      loop_count: 0,
      filename_prefix: filenamePrefix,
      format: "video/h264-mp4",
      pix_fmt: "yuv420p",
      crf,
      save_metadata: false,
      pingpong: false,
      save_output: true,
    }},
  };
}

module.exports = {
  buildI2VWorkflow,
  snapLength,
  secondsToFrames,
  // expose model names so callers can verify env / inventory
  MODELS: { MODEL_HIGH, MODEL_LOW, LORA_HIGH, LORA_LOW, VAE, TEXT_ENC, CLIP_VIS },
};
