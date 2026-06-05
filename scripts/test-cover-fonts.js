// scripts/test-cover-fonts.js
//
// Compare 3 font treatments on the same cover layout so we can pick the
// luxury aesthetic. All saved to /temp-images/.
//
// Variants:
//   A. Helvetica Neue (Cloudinary built-in)
//   B. Montserrat (Google font — Cloudinary auto-loads if specified by name)
//   C. Playfair Display headline + Montserrat body (serif + sans pairing)

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LISTING_KEY = "20260429174250492207000000";

const D = {
  hook: "TOSCANA LUXURY",         // pulled from actual subdivision name
  price: "$3,095,000",
  addressLine1: "75809 VIA PISA",
  addressLine2: "INDIAN WELLS, CA",
  specs: "4 BD  |  5 BA  |  3,260 SQFT",
  agentName: "JOSEPH SARDELLA",
  agentLicense: "DRE 02106916",
  agentBrokerage: "eXp REALTY",
};

const TEAL = "1C4A5A";

const VARIANTS = [
  {
    name: "A-montserrat",
    headlineFont: "Montserrat",
    bodyFont: "Montserrat",
    headlineSize: 84,
    headlineWeight: "bold",
  },
  {
    name: "B-bebas-neue",
    headlineFont: "Bebas Neue",
    bodyFont: "Montserrat",
    headlineSize: 108,
    headlineWeight: "normal",
  },
  {
    name: "C-playfair-serif",
    headlineFont: "Playfair Display",
    bodyFont: "Montserrat",
    headlineSize: 88,
    headlineWeight: "bold",
  },
];

async function buildCover(base, v) {
  return cloudinary.url(base.public_id, {
    transformation: [
      { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
      // Left panel
      {
        overlay: "sample",
        effect: "colorize:100",
        color: `rgb:${TEAL}`,
        opacity: 75,
        width: 480, height: 1350,
        crop: "scale",
        gravity: "west",
      },
      // Hook
      {
        overlay: { font_family: v.headlineFont, font_size: v.headlineSize, font_weight: v.headlineWeight, text: D.hook },
        color: "white", gravity: "north_west", x: 50, y: 130,
      },
      // Price
      {
        overlay: { font_family: v.bodyFont, font_size: 72, font_weight: "bold", text: D.price },
        color: "white", gravity: "north_west", x: 50, y: 380,
      },
      // Divider
      {
        overlay: "sample",
        effect: "colorize:100",
        color: "white",
        width: 200, height: 3,
        crop: "scale",
        gravity: "north_west", x: 50, y: 475,
      },
      // Address 1
      {
        overlay: { font_family: v.bodyFont, font_size: 32, text: D.addressLine1 },
        color: "white", gravity: "north_west", x: 50, y: 510,
      },
      // Address 2
      {
        overlay: { font_family: v.bodyFont, font_size: 26, text: D.addressLine2 },
        color: "white", gravity: "north_west", x: 50, y: 555,
      },
      // Specs
      {
        overlay: { font_family: v.bodyFont, font_size: 28, font_weight: "bold", text: D.specs },
        color: "white", gravity: "north_west", x: 50, y: 620,
      },
      // Bottom brand bar
      {
        overlay: "sample",
        effect: "colorize:100",
        color: `rgb:${TEAL}`,
        width: 1080, height: 80,
        crop: "scale",
        gravity: "south",
      },
      // Agent name
      {
        overlay: { font_family: v.bodyFont, font_size: 28, font_weight: "bold", text: D.agentName },
        color: "white", gravity: "south_west", x: 50, y: 28,
      },
      // Brokerage + license
      {
        overlay: { font_family: v.bodyFont, font_size: 18, text: `${D.agentBrokerage}  |  ${D.agentLicense}` },
        color: "white", gravity: "south_east", x: 50, y: 30,
      },
    ],
  });
}

async function downloadTo(url, filePath) {
  const r = await fetch(url);
  const ok = r.ok && (r.headers.get("content-type") || "").startsWith("image/");
  if (!ok) {
    const errBody = await r.text();
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${errBody.slice(0, 200)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(filePath, buf);
  return buf.length;
}

(async () => {
  const photosRes = await fetch(`http://localhost:3000/api/listings/${LISTING_KEY}/photos`);
  const photosData = await photosRes.json();
  const photo = photosData.photos[Math.min(photosData.photos.length - 1, 8)];
  const sourceUrl = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.url;

  const base = await cloudinary.uploader.upload(sourceUrl, {
    folder: `jpsrealtor/ai-staged/${LISTING_KEY}/cover-test`,
    public_id: `font-base-${Date.now()}`,
  });

  const tempDir = path.join(__dirname, "..", "temp-images");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  for (const v of VARIANTS) {
    const url = await buildCover(base, v);
    const filePath = path.join(tempDir, `cover-${v.name}.jpg`);
    try {
      const bytes = await downloadTo(url, filePath);
      console.log(`[${v.name}] ✅ ${filePath} (${(bytes / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.log(`[${v.name}] ❌ ${e.message}`);
      console.log(`           URL: ${url}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
