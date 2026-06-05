// scripts/upload-jost-font.js
//
// Download Jost variable TTF from Google Fonts' source repo, then upload
// to Cloudinary as a raw asset for use in text overlays.

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const os = require("os");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SOURCES = [
  {
    name: "Jost-Variable.ttf",
    publicId: "jpsrealtor/fonts/Jost-Variable.ttf",
    url: "https://github.com/google/fonts/raw/main/ofl/jost/Jost%5Bwght%5D.ttf",
  },
];

async function downloadToTemp(url, filename) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const tmp = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tmp, buf);
  return { tmp, bytes: buf.length };
}

(async () => {
  for (const s of SOURCES) {
    console.log(`Downloading ${s.name} from Google Fonts…`);
    let dl;
    try {
      dl = await downloadToTemp(s.url, s.name);
      console.log(`  Downloaded ${dl.bytes} bytes → ${dl.tmp}`);
    } catch (e) {
      console.error(`  Download failed: ${e.message}`);
      continue;
    }

    console.log(`Uploading to Cloudinary as ${s.publicId}…`);
    try {
      const r = await cloudinary.uploader.upload(dl.tmp, {
        public_id: s.publicId,
        resource_type: "raw",
        overwrite: true,
      });
      console.log(`  ✅ ${r.public_id}`);
      console.log(`     URL: ${r.secure_url}`);
    } catch (e) {
      console.error(`  Upload failed: ${e.message}`);
    } finally {
      fs.unlinkSync(dl.tmp);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
