// scripts/carousel-upload-and-publish.js
//
// Takes a slug, uploads the 10 _edits slides to Cloudinary, then posts
// them as an IG carousel via the Meta Graph API. Polls until ready,
// then publishes. Used either standalone (post now) or by a scheduled
// Windows Task at the chosen time.
//
//   usage: node scripts/carousel-upload-and-publish.js <slug>

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
if (!SLUG) { console.error("usage: node scripts/carousel-upload-and-publish.js <slug>"); process.exit(1); }

const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const CAPTION_FILE = path.join(__dirname, "..", "temp-images", SLUG, "caption.txt");
const LOG_DIR = path.join(__dirname, "..", "temp-images", SLUG);

const TOKEN = process.env.META_IG_TEST_TOKEN;
const IG_USER_ID = process.env.META_IG_TEST_USER_ID;
const API = "https://graph.facebook.com/v21.0";

const SLIDE_FILES = Array.from({ length: 10 }, (_, i) =>
  `slide-${String(i + 1).padStart(2, "0")}.jpg`
);

async function gpost(p, params) {
  const body = new URLSearchParams(params);
  const r = await fetch(`${API}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!r.ok) {
    const err = new Error(j?.error?.message || `HTTP ${r.status}`);
    err.response = j;
    throw err;
  }
  return j;
}
async function gget(p, params) {
  const qs = new URLSearchParams(params);
  const r = await fetch(`${API}${p}?${qs}`);
  return r.json();
}

(async () => {
  if (!TOKEN || !IG_USER_ID) { console.error("Missing META_IG_TEST_TOKEN / USER_ID"); process.exit(1); }

  const caption = fs.readFileSync(CAPTION_FILE, "utf8").trim();
  console.log(`[${SLUG}] caption ${caption.length} chars`);

  console.log("Step 1: uploading 10 slides to Cloudinary…");
  const slideUrls = [];
  for (let i = 0; i < SLIDE_FILES.length; i++) {
    const file = path.join(EDITS_DIR, SLIDE_FILES[i]);
    if (!fs.existsSync(file)) { console.error(`Missing: ${file}`); process.exit(1); }
    const r = await cloudinary.uploader.upload(file, {
      folder: `jpsrealtor/ig-posts/${SLUG}`,
      public_id: `slide-${String(i + 1).padStart(2, "0")}-${Date.now()}`,
    });
    slideUrls.push(r.secure_url);
    console.log(`  [${i + 1}] uploaded`);
  }

  console.log("Step 2: creating child containers…");
  const childIds = [];
  for (let i = 0; i < slideUrls.length; i++) {
    const r = await gpost(`/${IG_USER_ID}/media`, {
      image_url: slideUrls[i],
      is_carousel_item: "true",
      access_token: TOKEN,
    });
    childIds.push(r.id);
    console.log(`  child ${i + 1}: ${r.id}`);
  }

  console.log("Step 3: creating CAROUSEL parent…");
  const parent = await gpost(`/${IG_USER_ID}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    access_token: TOKEN,
  });
  const parentId = parent.id;
  console.log(`  parent: ${parentId}`);

  console.log("Step 4: polling for ready…");
  for (let i = 0; i < 30; i++) {
    const j = await gget(`/${parentId}`, { fields: "status_code", access_token: TOKEN });
    console.log(`  poll ${i + 1}: ${j.status_code || j.error?.message || "?"}`);
    if (j.status_code === "FINISHED") break;
    if (j.status_code === "ERROR") { console.error("Container errored"); process.exit(1); }
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("Step 5: publishing…");
  const pub = await gpost(`/${IG_USER_ID}/media_publish`, {
    creation_id: parentId,
    access_token: TOKEN,
  });
  const postId = pub.id;

  const meta = await gget(`/${postId}`, {
    fields: "permalink,timestamp,media_type",
    access_token: TOKEN,
  });

  console.log("\n=================================");
  console.log(`🎉 [${SLUG}] LIVE ON @INSTADELLA`);
  console.log("=================================");
  console.log("Permalink:", meta?.permalink || "(unavailable)");
  console.log("Post ID:", postId);
  console.log("Posted at:", meta?.timestamp);

  fs.writeFileSync(path.join(LOG_DIR, "_posted.json"), JSON.stringify({
    slug: SLUG, postId, permalink: meta?.permalink, postedAt: meta?.timestamp,
  }, null, 2));
})().catch(e => {
  console.error("FATAL:", e?.message || e);
  if (e?.response) console.error("Meta:", JSON.stringify(e.response, null, 2));
  process.exit(1);
});
