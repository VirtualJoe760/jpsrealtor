// scripts/lib/content-storage.js
//
// Cloudinary-backed content storage for ChatRealty templates.
// Cloudinary is the SOURCE OF TRUTH. Local temp-images/ is an optional
// dev cache that gets transparently populated on first read.
//
// Folder convention:
//   jpsrealtor/content/<slug>/source/      — pulled listing photos
//   jpsrealtor/content/<slug>/generated/   — pipeline outputs (slides, clips, audio)
//   jpsrealtor/content/<slug>/meta/        — captions, configs, manifests (raw text/json)
//
// Resource types in Cloudinary:
//   image  — jpg/png/webp
//   video  — mp4/mov AND audio (mp3/wav)
//   raw    — text, json, anything else
//
// Usage:
//   const { storage } = require("./lib/content-storage");
//   const s = storage("77655-iroquois");
//   await s.putLocal("originals/photo-00.jpg", "source/photo-00.jpg");
//   const buf = await s.fetch("source/photo-00.jpg");
//   const url = s.url("generated/slides/slide-01.jpg");

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BASE = "jpsrealtor/content";
const LOCAL_ROOT = path.join(__dirname, "..", "..", "temp-images");

// Map filename extension to Cloudinary resource_type.
function detectResourceType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".m4v", ".webm", ".mp3", ".wav", ".m4a"].includes(ext)) return "video";
  return "raw";
}

// Cloudinary public_id rules:
//   - image/video resources: store WITHOUT extension; Cloudinary re-appends on delivery
//     based on format. Keeping the extension produces double-extension URLs (.jpg.jpg).
//   - raw resources: store WITH extension; Cloudinary treats it literally and serves
//     the file at the exact public_id you provided.
function publicIdFromKey(key, resourceType) {
  if (resourceType === "raw") return key;
  // image / video: strip the file extension
  const dir = path.posix.dirname(key);
  const base = path.posix.basename(key, path.posix.extname(key));
  return dir === "." ? base : `${dir}/${base}`;
}

class ContentStorage {
  constructor(slug) {
    if (!slug) throw new Error("ContentStorage requires a slug");
    this.slug = slug;
    this.basePath = `${BASE}/${slug}`;
    this.localBase = path.join(LOCAL_ROOT, slug);
  }

  fullKey(relativeKey) {
    return `${this.basePath}/${relativeKey}`;
  }

  publicId(relativeKey, resourceType) {
    const fullKey = this.fullKey(relativeKey);
    const rt = resourceType || detectResourceType(relativeKey);
    return publicIdFromKey(fullKey, rt);
  }

  localPath(relativeKey) {
    return path.join(this.localBase, relativeKey);
  }

  // Upload a local file to Cloudinary. relativeKey is relative to the slug
  // root, e.g. "source/photo-00.jpg" or "generated/slides/slide-01.jpg".
  async putLocal(localRelative, relativeKey) {
    const localFull = path.isAbsolute(localRelative)
      ? localRelative
      : path.join(this.localBase, localRelative);
    if (!fs.existsSync(localFull)) throw new Error(`Missing local: ${localFull}`);
    const resourceType = detectResourceType(relativeKey);
    const result = await cloudinary.uploader.upload(localFull, {
      public_id: this.publicId(relativeKey, resourceType),
      resource_type: resourceType,
      overwrite: true,
      use_filename: false,
      unique_filename: false,
    });
    return result.secure_url;
  }

  // Upload a Buffer or string.
  async putBuffer(buffer, relativeKey, opts = {}) {
    const resourceType = opts.resourceType || detectResourceType(relativeKey);
    const mime = opts.mime || (resourceType === "image" ? "image/png" : "application/octet-stream");
    const dataUri = `data:${mime};base64,${Buffer.isBuffer(buffer) ? buffer.toString("base64") : Buffer.from(buffer).toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: this.publicId(relativeKey, resourceType),
      resource_type: resourceType,
      overwrite: true,
    });
    return result.secure_url;
  }

  // Cloudinary delivery URL for a key.
  url(relativeKey, opts = {}) {
    const resourceType = opts.resourceType || detectResourceType(relativeKey);
    return cloudinary.url(this.publicId(relativeKey, resourceType), {
      resource_type: resourceType,
      secure: true,
      format: resourceType === "raw" ? undefined : path.extname(relativeKey).slice(1) || undefined,
      ...opts.transformation ? { transformation: opts.transformation } : {},
    });
  }

  // Fetch a remote object as a Buffer.
  async fetch(relativeKey, opts = {}) {
    const url = this.url(relativeKey, opts);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`fetch ${r.status} for ${url}`);
    return Buffer.from(await r.arrayBuffer());
  }

  // Fetch to a local file. Returns the local path. Used by ensureLocal.
  async fetchTo(relativeKey, opts = {}) {
    const localFull = this.localPath(relativeKey);
    fs.mkdirSync(path.dirname(localFull), { recursive: true });
    const buf = await this.fetch(relativeKey, opts);
    fs.writeFileSync(localFull, buf);
    return localFull;
  }

  // Ensure a key exists locally (download from Cloudinary if missing).
  // Returns the local file path.
  async ensureLocal(relativeKey, opts = {}) {
    const localFull = this.localPath(relativeKey);
    if (fs.existsSync(localFull) && !opts.force) return localFull;
    return this.fetchTo(relativeKey, opts);
  }

  // Check whether a key exists in Cloudinary.
  async exists(relativeKey) {
    const resourceType = detectResourceType(relativeKey);
    try {
      await cloudinary.api.resource(this.publicId(relativeKey, resourceType), { resource_type: resourceType });
      return true;
    } catch (e) {
      if (e?.error?.http_code === 404) return false;
      throw e;
    }
  }

  // List resources in a subfolder of this slug.
  async list(subfolder, resourceType = "image", maxResults = 100) {
    const prefix = `${this.basePath}/${subfolder}/`;
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix,
      resource_type: resourceType,
      max_results: maxResults,
    });
    return (result.resources || []).map((r) => ({
      publicId: r.public_id,
      url: r.secure_url,
      bytes: r.bytes,
      format: r.format,
      created: r.created_at,
    }));
  }

  // Bulk upload a local subfolder to Cloudinary. Useful for migration.
  async putLocalFolder(localSubfolder, remoteSubfolder, { extensions } = {}) {
    const localFull = path.join(this.localBase, localSubfolder);
    if (!fs.existsSync(localFull)) throw new Error(`Missing local folder: ${localFull}`);
    const files = fs.readdirSync(localFull).filter((f) => {
      if (!extensions) return true;
      return extensions.includes(path.extname(f).toLowerCase());
    });
    const results = [];
    for (const f of files) {
      const local = path.join(localFull, f);
      const remoteKey = `${remoteSubfolder}/${f}`;
      const url = await this.putLocal(local, remoteKey);
      results.push({ filename: f, url });
    }
    return results;
  }
}

function storage(slug) {
  return new ContentStorage(slug);
}

module.exports = { storage, ContentStorage, BASE, LOCAL_ROOT };
