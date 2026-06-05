// scripts/test-ig-carousel.js
//
// One-off live test: post a real IG carousel using the token currently in
// .env.local. Pulls 3 sample photos from a known Toscana listing.
//
// Runs the same 3-step Meta Graph API dance our backend route does:
//   1. POST /{ig-user-id}/media for each image  → child container ids
//   2. POST /{ig-user-id}/media (media_type=CAROUSEL, children=…) → parent
//   3. POST /{ig-user-id}/media_publish (creation_id=parent) → live post

require("dotenv").config({ path: ".env.local" });

const TOKEN = process.env.META_IG_TEST_TOKEN;
const IG_USER_ID = process.env.META_IG_TEST_USER_ID;
const API = "https://graph.facebook.com/v21.0";

const photos = [
  "https://cdn.resize.sparkplatform.com/gps/2048x1600/true/20260501145442765065000000-o.jpg",
  "https://cdn.resize.sparkplatform.com/gps/2048x1600/true/20260501145444360599000000-o.jpg",
  "https://cdn.resize.sparkplatform.com/gps/2048x1600/true/20260501145449681105000000-o.jpg",
];

const caption =
  "New in Toscana Country Club — 75809 Via Pisa, Indian Wells. " +
  "$3,095,000 | 4 BR + casita | 3,260 sqft | South-facing on the 10th fairway. " +
  "Italianate architecture, gourmet kitchen, private outdoor living. " +
  "DM for a tour. #IndianWells #ToscanaCountryClub #CoachellaValleyRealEstate";

async function gpost(path, params) {
  const body = new URLSearchParams(params);
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error(j?.error?.message || `HTTP ${r.status}`);
    e.response = j;
    throw e;
  }
  return j;
}

async function gget(path, params) {
  const qs = new URLSearchParams(params);
  const r = await fetch(`${API}${path}?${qs}`);
  return r.json();
}

(async () => {
  if (!TOKEN || !IG_USER_ID) {
    console.error("Missing META_IG_TEST_TOKEN or META_IG_TEST_USER_ID in .env.local");
    process.exit(1);
  }
  console.log(`Posting ${photos.length}-photo carousel to IG user ${IG_USER_ID}…\n`);

  // 1. Child containers
  console.log("Step 1: creating child containers…");
  const childIds = [];
  for (let i = 0; i < photos.length; i++) {
    try {
      const r = await gpost(`/${IG_USER_ID}/media`, {
        image_url: photos[i],
        is_carousel_item: "true",
        access_token: TOKEN,
      });
      console.log(`  child ${i + 1}/${photos.length}: ${r.id}`);
      childIds.push(r.id);
    } catch (e) {
      console.error(`  child ${i + 1} FAILED:`, e.message);
      console.error("  Meta response:", JSON.stringify(e.response, null, 2));
      process.exit(1);
    }
  }

  // 2. Parent carousel container
  console.log("\nStep 2: creating CAROUSEL parent…");
  let parentId;
  try {
    const r = await gpost(`/${IG_USER_ID}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: TOKEN,
    });
    parentId = r.id;
    console.log(`  parent container: ${parentId}`);
  } catch (e) {
    console.error("  parent FAILED:", e.message);
    console.error("  Meta response:", JSON.stringify(e.response, null, 2));
    process.exit(1);
  }

  // 3. Publish
  console.log("\nStep 3: publishing…");
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
    console.error("  Meta response:", JSON.stringify(e.response, null, 2));
    process.exit(1);
  }

  // 4. Get permalink
  console.log("\nFetching permalink…");
  const meta = await gget(`/${postId}`, {
    fields: "permalink,timestamp,media_type",
    access_token: TOKEN,
  });
  console.log("  permalink:", meta?.permalink || "(unavailable)");
  console.log("  timestamp:", meta?.timestamp);
  console.log("  type:", meta?.media_type);
})();
