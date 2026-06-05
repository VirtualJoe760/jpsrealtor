// scripts/pull-listing-photos.js
//
// Download all photos for a listing to temp-images/<slug>/originals/.
// Filenames are 2-digit-padded so they sort naturally for review.

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const LISTING_KEY = process.argv[2] || "20260429174250492207000000";
const SLUG = process.argv[3] || "75809-via-pisa";

(async () => {
  const photosRes = await fetch(`http://localhost:3000/api/listings/${LISTING_KEY}/photos`);
  if (!photosRes.ok) { console.error("Photos route failed:", photosRes.status); process.exit(1); }
  const photosData = await photosRes.json();
  const photos = photosData.photos || [];
  console.log(`Listing has ${photos.length} photos.\n`);

  const outDir = path.join(__dirname, "..", "temp-images", SLUG, "originals");
  fs.mkdirSync(outDir, { recursive: true });

  // Use the largest variant per photo. Throttle to ~6 concurrent.
  const concurrency = 6;
  let i = 0;
  async function worker() {
    while (i < photos.length) {
      const idx = i++;
      const p = photos[idx];
      const url = p.uri2048 || p.uri1280 || p.uri1024 || p.url;
      if (!url) continue;
      try {
        const r = await fetch(url);
        if (!r.ok) { console.log(`[${idx}] ❌ HTTP ${r.status}`); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        const num = String(idx).padStart(2, "0");
        const filePath = path.join(outDir, `photo-${num}.jpg`);
        fs.writeFileSync(filePath, buf);
        process.stdout.write(`[${idx}] ✅ ${(buf.length / 1024).toFixed(0)} KB  `);
        if ((idx + 1) % 8 === 0) process.stdout.write("\n");
      } catch (e) {
        console.log(`[${idx}] ERR: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`\n\nDone. Saved to ${outDir}`);
})().catch(e => { console.error(e); process.exit(1); });
