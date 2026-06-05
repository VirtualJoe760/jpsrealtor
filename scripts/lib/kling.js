// scripts/lib/kling.js
//
// Thin client for the Kling Kuaishou image2video API.
// Auth: JWT signed HS256 with KLINGAI_ACCESS_KEY (iss) and KLINGAI_SECRET_KEY.
// JWT must be regenerated periodically (1800s expiry by default).

const jwt = require("jsonwebtoken");

const KLING_BASE = "https://api.klingai.com";

function mintToken() {
  const AK = process.env.KLINGAI_ACCESS_KEY;
  const SK = process.env.KLINGAI_SECRET_KEY;
  if (!AK || !SK) throw new Error("Missing KLINGAI_ACCESS_KEY or KLINGAI_SECRET_KEY");
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: AK, exp: now + 1800, nbf: now - 5 },
    SK,
    { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
  );
}

async function createImage2Video({ imageUrl, imageTailUrl, prompt, model = "kling-v1-6", mode = "pro", duration = "5", aspect = "9:16", negativePrompt = "", cfgScale = 0.5 }) {
  const body = {
    model_name: model,
    image: imageUrl,
    prompt,
    negative_prompt: negativePrompt,
    cfg_scale: cfgScale,
    mode,
    duration,
    aspect_ratio: aspect,
  };
  if (imageTailUrl) body.image_tail = imageTailUrl;

  const r = await fetch(`${KLING_BASE}/v1/videos/image2video`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${mintToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok || j.code !== 0) {
    const err = new Error(`Kling create ${r.status}: ${j.message || JSON.stringify(j).slice(0, 200)}`);
    err.response = j;
    throw err;
  }
  return j.data; // { task_id, task_status, ... }
}

async function getImage2Video(taskId) {
  const r = await fetch(`${KLING_BASE}/v1/videos/image2video/${taskId}`, {
    headers: { "Authorization": `Bearer ${mintToken()}` },
  });
  const j = await r.json();
  if (!r.ok || j.code !== 0) {
    const err = new Error(`Kling get ${r.status}: ${j.message || JSON.stringify(j).slice(0, 200)}`);
    err.response = j;
    throw err;
  }
  return j.data; // { task_id, task_status, task_status_msg, task_result }
}

module.exports = { mintToken, createImage2Video, getImage2Video };
