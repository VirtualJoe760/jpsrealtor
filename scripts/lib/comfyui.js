// scripts/lib/comfyui.js
//
// Thin client for a ComfyUI HTTP server. Defaults to the RunPod
// pod URL from COMFYUI_URL in .env.local, e.g.
//   COMFYUI_URL=https://c4waqxyrrf8vtv-8188.proxy.runpod.net
//
// ComfyUI HTTP API endpoints we use:
//   GET  /system_stats                 — sanity check / GPU info
//   GET  /object_info                  — full registered node schema
//   GET  /object_info/<NodeType>       — schema for one node type
//   POST /prompt                       — queue a workflow; returns { prompt_id, number, node_errors }
//   GET  /history/<prompt_id>          — terminal job state with outputs
//   GET  /queue                        — current queue (running + pending)
//   GET  /view?filename=...&subfolder=...&type=output  — fetch a generated file
//   POST /upload/image                 — multipart image upload (returns server filename)

const fs = require("fs");
const path = require("path");

function getBaseUrl() {
  const url = process.env.COMFYUI_URL;
  if (!url) throw new Error("Missing COMFYUI_URL in env");
  return url.replace(/\/$/, "");
}

async function systemStats() {
  const r = await fetch(`${getBaseUrl()}/system_stats`);
  if (!r.ok) throw new Error(`/system_stats ${r.status}`);
  return r.json();
}

async function objectInfo(nodeType) {
  const url = nodeType
    ? `${getBaseUrl()}/object_info/${encodeURIComponent(nodeType)}`
    : `${getBaseUrl()}/object_info`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`/object_info ${r.status}`);
  return r.json();
}

// Helper: get the list of files available in a loader's dropdown.
// e.g. listLoaderFiles("UNETLoader", "unet_name") → ["wan2.2-i2v-...","..."]
async function listLoaderFiles(nodeType, fieldName) {
  const info = await objectInfo(nodeType);
  const node = info[nodeType];
  if (!node) return [];
  const field = node.input?.required?.[fieldName] || node.input?.optional?.[fieldName];
  if (!field || !Array.isArray(field[0])) return [];
  return field[0];
}

// Generate a stable client_id used to correlate ws progress with prompts.
function makeClientId() {
  return `chatrealty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Queue a workflow. `workflow` is the API-format JSON exported from ComfyUI.
async function queuePrompt(workflow, { clientId } = {}) {
  const body = {
    prompt: workflow,
    client_id: clientId || makeClientId(),
  };
  const r = await fetch(`${getBaseUrl()}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) {
    const err = new Error(`/prompt ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
    err.response = j;
    throw err;
  }
  if (j.node_errors && Object.keys(j.node_errors).length) {
    const err = new Error(`Workflow validation errors: ${JSON.stringify(j.node_errors).slice(0, 400)}`);
    err.nodeErrors = j.node_errors;
    throw err;
  }
  return j; // { prompt_id, number }
}

// Get the terminal history entry for a prompt — includes outputs.
async function getHistory(promptId) {
  const r = await fetch(`${getBaseUrl()}/history/${promptId}`);
  if (!r.ok) throw new Error(`/history ${r.status}`);
  const j = await r.json();
  return j[promptId] || null;
}

// Get current queue: { queue_running: [...], queue_pending: [...] }.
async function getQueue() {
  const r = await fetch(`${getBaseUrl()}/queue`);
  if (!r.ok) throw new Error(`/queue ${r.status}`);
  return r.json();
}

// Poll until the prompt is fully resolved (success OR error) — not just queued.
// Returns the history entry; throws if it ended in error.
async function waitForPrompt(promptId, { pollMs = 3000, timeoutMs = 600000, onProgress } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hist = await getHistory(promptId);
    // hist exists as soon as the prompt is queued, but `status.completed` only
    // flips when execution finishes (success OR error). Wait for completion.
    if (hist && hist.status && hist.status.completed !== undefined) {
      if (hist.status.completed === true) return hist;
      if (hist.status.status_str === "error") {
        const errMsg = (hist.status.messages || []).find((m) => m[0] === "execution_error");
        const detail = errMsg ? `${errMsg[1].node_type}#${errMsg[1].node_id}: ${errMsg[1].exception_message || ""}` : "unknown";
        const err = new Error(`ComfyUI execution error — ${detail}`);
        err.history = hist;
        throw err;
      }
    }
    const queue = await getQueue();
    const inRunning = (queue.queue_running || []).some((q) => Array.isArray(q) && q.includes(promptId));
    const inPending = (queue.queue_pending || []).some((q) => Array.isArray(q) && q.includes(promptId));
    if (onProgress) onProgress({ running: inRunning, pending: inPending });
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`waitForPrompt timeout after ${timeoutMs}ms for ${promptId}`);
}

// Download a file via /view. type is "output" | "input" | "temp".
async function fetchOutputFile({ filename, subfolder = "", type = "output" }) {
  const u = new URL(`${getBaseUrl()}/view`);
  u.searchParams.set("filename", filename);
  if (subfolder) u.searchParams.set("subfolder", subfolder);
  u.searchParams.set("type", type);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`/view ${r.status} for ${filename}`);
  return Buffer.from(await r.arrayBuffer());
}

// Upload an image to ComfyUI's /upload/image so it can be referenced
// by a LoadImage node. Returns { name, subfolder, type } that you plug
// into the LoadImage node inputs.
async function uploadImage(localPath, { subfolder = "" } = {}) {
  const form = new FormData();
  const buffer = fs.readFileSync(localPath);
  const blob = new Blob([buffer]);
  form.append("image", blob, path.basename(localPath));
  if (subfolder) form.append("subfolder", subfolder);
  form.append("overwrite", "true");
  const r = await fetch(`${getBaseUrl()}/upload/image`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`/upload/image ${r.status}`);
  return r.json();
}

module.exports = {
  getBaseUrl,
  systemStats,
  objectInfo,
  listLoaderFiles,
  makeClientId,
  queuePrompt,
  getHistory,
  getQueue,
  waitForPrompt,
  fetchOutputFile,
  uploadImage,
};
