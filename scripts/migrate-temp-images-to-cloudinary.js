// scripts/migrate-temp-images-to-cloudinary.js
//
// One-time migration: sweep existing temp-images/<slug>/ folders and
// upload everything to Cloudinary under jpsrealtor/content/<slug>/.
// Local temp-images/ stays intact (scheduled tasks tomorrow still read
// from disk); Cloudinary becomes the durable cloud copy.
//
//   usage: node scripts/migrate-temp-images-to-cloudinary.js              # all slugs in ACTIVE
//          node scripts/migrate-temp-images-to-cloudinary.js <slug>       # one slug
//          node scripts/migrate-temp-images-to-cloudinary.js --all        # every folder in temp-images

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { storage, LOCAL_ROOT } = require("./lib/content-storage");

// Default migration set — active or in-progress content. Older test
// stubs (75809-via-pisa, 81240-peary, 81735-baffin) skipped by default.
const ACTIVE = [
  "48750-el-nido",
  "77655-iroquois",
  "78890-lima",
  "81193-columbus",
  "1-makena",
];

// Map a local subfolder/filename to its Cloudinary remote key.
// Returns null to skip a file.
function remoteKeyFor(localRelative) {
  // localRelative is like "originals/photo-00.jpg" or "_edits/slide-01.jpg" or "narration.mp3"
  const parts = localRelative.split(/[\\/]/);
  const top = parts[0];
  const rest = parts.slice(1).join("/");

  if (top === "originals") return `source/${rest}`;
  if (top === "_edits") return `generated/slides/${rest}`;
  if (top === "empties") return `generated/empties/${rest}`;
  if (top === "narration.mp3") return `generated/narration.mp3`;
  if (top === "caption.txt") return `meta/caption.txt`;
  if (top === "_posted.json") return `meta/posted.json`;
  if (top === "_publish.log") return null; // skip transient logs
  if (top === "kling-manifest.json") return `meta/kling-manifest.json`;
  if (top === "luma-manifest.json") return `meta/luma-manifest.json`;
  // Anything else under a known shape: leave under meta/
  return `meta/${localRelative.replace(/\\/g, "/")}`;
}

// Recursively walk a directory and return relative file paths.
function walkFiles(dir, basePath = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = basePath ? path.posix.join(basePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

async function migrateSlug(slug) {
  const localBase = path.join(LOCAL_ROOT, slug);
  if (!fs.existsSync(localBase) || !fs.statSync(localBase).isDirectory()) {
    console.log(`  ⚠ not found: ${localBase}`);
    return { uploaded: 0, skipped: 0, errors: 0 };
  }

  const files = walkFiles(localBase);
  const s = storage(slug);
  let uploaded = 0, skipped = 0, errors = 0;
  for (const rel of files) {
    const remoteKey = remoteKeyFor(rel);
    if (!remoteKey) { skipped++; continue; }
    const localFull = path.join(localBase, rel);
    try {
      const url = await s.putLocal(localFull, remoteKey);
      process.stdout.write(`    ${rel} → ${remoteKey} (${url.slice(-50)})\n`);
      uploaded++;
    } catch (e) {
      console.log(`    ❌ ${rel}: ${e.message?.slice(0, 100)}`);
      errors++;
    }
  }
  return { uploaded, skipped, errors };
}

(async () => {
  const arg = process.argv[2];
  let slugs;
  if (arg === "--all") {
    slugs = fs.readdirSync(LOCAL_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } else if (arg) {
    slugs = [arg];
  } else {
    slugs = ACTIVE;
  }

  console.log(`Migrating ${slugs.length} slug(s) to Cloudinary…\n`);
  const t0 = Date.now();
  const totals = { uploaded: 0, skipped: 0, errors: 0 };
  for (const slug of slugs) {
    console.log(`\n[${slug}]`);
    const r = await migrateSlug(slug);
    console.log(`  → uploaded: ${r.uploaded}, skipped: ${r.skipped}, errors: ${r.errors}`);
    totals.uploaded += r.uploaded;
    totals.skipped += r.skipped;
    totals.errors += r.errors;
  }
  console.log(`\n=== done in ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
  console.log(`uploaded ${totals.uploaded}, skipped ${totals.skipped}, errors ${totals.errors}`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
