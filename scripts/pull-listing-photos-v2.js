// pull-listing-photos-v2.js — uses the skill photos endpoint which reads
// from UnifiedListing.media. The public /api/listings/<key>/photos route
// re-hits Spark in real time and was returning 0 for this listing.

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const LISTING_KEY = process.argv[2];
const SLUG = process.argv[3];
if (!LISTING_KEY || !SLUG) {
  console.error("usage: node pull-listing-photos-v2.js <listingKey> <slug>");
  process.exit(1);
}

(async () => {
  // Read token from .claude.json — chatrealty lives under a per-project
  // mcpServers block, so walk all projects' mcpServers entries.
  const claudeCfg = require(path.join(process.env.USERPROFILE || process.env.HOME, ".claude.json"));
  let token = process.env.CHATREALTY_API_TOKEN;
  if (!token) {
    for (const proj of Object.values(claudeCfg.projects || {})) {
      const t = proj?.mcpServers?.chatrealty?.env?.CHATREALTY_API_TOKEN;
      if (t) { token = t; break; }
    }
  }
  if (!token) {
    console.error("No CHATREALTY_API_TOKEN found in ~/.claude.json or env");
    process.exit(1);
  }

  const photosRes = await fetch(
    `http://localhost:3000/api/skill/listings/${LISTING_KEY}/photos?limit=80`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!photosRes.ok) {
    console.error("Photos route failed:", photosRes.status, await photosRes.text());
    process.exit(1);
  }
  const photosData = await photosRes.json();
  const photos = photosData.photos || [];
  console.log(`Listing has ${photos.length} photos (totalAvailable=${photosData.totalAvailable}).\n`);

  const outDir = path.join(__dirname, "..", "temp-images", SLUG, "originals");
  fs.mkdirSync(outDir, { recursive: true });

  const concurrency = 6;
  let i = 0;
  async function worker() {
    while (i < photos.length) {
      const idx = i++;
      const url = photos[idx].url || photos[idx].thumbUrl;
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
