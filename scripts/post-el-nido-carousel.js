// scripts/post-el-nido-carousel.js
//
// End-to-end: upload the 10 final El Nido slides to Cloudinary, then
// publish them as an Instagram carousel via Meta Graph API.
//
// Uses the META_IG_TEST_TOKEN from .env.local (manually-minted token with
// instagram_basic + instagram_content_publish via Graph API Explorer).

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = "48750-el-nido";
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const CAPTION_FILE = path.join(__dirname, "..", "temp-images", SLUG, "caption.txt");

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
  if (!TOKEN || !IG_USER_ID) {
    console.error("Missing META_IG_TEST_TOKEN or META_IG_TEST_USER_ID in .env.local");
    process.exit(1);
  }

  // 1. Read caption
  const caption = fs.readFileSync(CAPTION_FILE, "utf8").trim();
  console.log(`Caption: ${caption.length} chars`);
  if (caption.length > 2200) {
    console.error(`⚠ Caption is ${caption.length} chars, IG max is 2200`);
  }

  // 2. Upload all 10 slides to Cloudinary
  console.log("\nStep 1: uploading 10 slides to Cloudinary…");
  const slideUrls = [];
  for (let i = 0; i < SLIDE_FILES.length; i++) {
    const file = path.join(EDITS_DIR, SLIDE_FILES[i]);
    if (!fs.existsSync(file)) {
      console.error(`Missing: ${file}`);
      process.exit(1);
    }
    const r = await cloudinary.uploader.upload(file, {
      folder: `jpsrealtor/ig-posts/${SLUG}`,
      public_id: `slide-${String(i + 1).padStart(2, "0")}-${Date.now()}`,
    });
    slideUrls.push(r.secure_url);
    console.log(`  [${i + 1}] ${r.secure_url}`);
  }

  // 3. Create child containers (parallel)
  console.log("\nStep 2: creating child containers…");
  const childIds = [];
  for (let i = 0; i < slideUrls.length; i++) {
    try {
      const r = await gpost(`/${IG_USER_ID}/media`, {
        image_url: slideUrls[i],
        is_carousel_item: "true",
        access_token: TOKEN,
      });
      console.log(`  child ${i + 1}/${slideUrls.length}: ${r.id}`);
      childIds.push(r.id);
    } catch (e) {
      console.error(`  child ${i + 1} FAILED:`, e.message);
      console.error("  Meta:", JSON.stringify(e.response, null, 2));
      process.exit(1);
    }
  }

  // 4. Create CAROUSEL parent container
  console.log("\nStep 3: creating CAROUSEL parent…");
  let parentId;
  try {
    const r = await gpost(`/${IG_USER_ID}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: TOKEN,
    });
    parentId = r.id;
    console.log(`  parent: ${parentId}`);
  } catch (e) {
    console.error("  parent FAILED:", e.message);
    console.error("  Meta:", JSON.stringify(e.response, null, 2));
    process.exit(1);
  }

  // 5. Publish
  console.log("\nStep 4: publishing…");
  let postId;
  try {
    const r = await gpost(`/${IG_USER_ID}/media_publish`, {
      creation_id: parentId,
      access_token: TOKEN,
    });
    postId = r.id;
    console.log(`  ✅ POSTED: ${postId}`);
  } catch (e) {
    console.error("  publish FAILED:", e.message);
    console.error("  Meta:", JSON.stringify(e.response, null, 2));
    process.exit(1);
  }

  // 6. Fetch permalink
  console.log("\nStep 5: fetching permalink…");
  const meta = await gget(`/${postId}`, {
    fields: "permalink,timestamp,media_type",
    access_token: TOKEN,
  });
  console.log("\n=================================");
  console.log("🎉 LIVE ON @INSTADELLA");
  console.log("=================================");
  console.log("Permalink:", meta?.permalink || "(unavailable)");
  console.log("Post ID:", postId);
  console.log("Posted at:", meta?.timestamp);
  console.log("Type:", meta?.media_type);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
