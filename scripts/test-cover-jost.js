// scripts/test-cover-jost.js
//
// Cover layout v5 per Joseph's direction:
//   - Lighter font weights (no more all-bold)
//   - No agent name in the panel — headshot IS the agent identifier
//   - Listed-by credit in italic + light weight (more elegant, less salesy)

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
  hook: "TOSCANA LUXURY",
  city: "INDIAN WELLS",                  // subtitle under hook
  price: "$3,095,000",
  addressLine1: "75809 VIA PISA",
  addressLine2: "INDIAN WELLS, CA",
  specs: "4 BD  |  5 BA  |  3,260 SQFT",
  // Flowing 1-2 sentence hook — what Claude writes per listing in production.
  // Mentions the standout features in natural prose, not bullets.
  body: "Positioned along the 10th fairway of Toscana's prestigious North Course, this Italianate residence captures sweeping mountain views. A detached casita welcomes your guests in their own private retreat.",
  listingCredit: "Listed by Julianne Pierzak  ·  Coldwell Banker Realty",
};

const TEAL = "1C4A5A";
const FONT = "Poppins";

(async () => {
  const photosRes = await fetch(`http://localhost:3000/api/listings/${LISTING_KEY}/photos`);
  const photosData = await photosRes.json();
  const photo = photosData.photos[Math.min(photosData.photos.length - 1, 8)];
  const sourceUrl = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.url;

  const base = await cloudinary.uploader.upload(sourceUrl, {
    folder: `jpsrealtor/ai-staged/${LISTING_KEY}/cover-test`,
    public_id: `v5-base-${Date.now()}`,
  });

  const url = cloudinary.url(base.public_id, {
    transformation: [
      // 1. Base 4:5 crop
      { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },

      // 2. Left panel
      {
        overlay: "sample",
        effect: "colorize:100",
        color: `rgb:${TEAL}`,
        opacity: 75,
        width: 480, height: 1350,
        crop: "scale",
        gravity: "west",
      },

      // 3. Hook — 96pt light
      {
        overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: D.hook },
        color: "white", gravity: "north_west", x: 70, y: 110,
      },

      // 3b. City subtitle — smaller, light, letter-spaced for refinement
      {
        overlay: {
          font_family: FONT,
          font_size: 28,
          font_weight: "light",
          text: D.city,
          letter_spacing: 8,
        },
        color: "white", gravity: "north_west", x: 70, y: 240,
      },

      // 4. Price
      {
        overlay: { font_family: FONT, font_size: 60, font_weight: "medium", text: D.price },
        color: "white", gravity: "north_west", x: 70, y: 360,
      },

      // 5. Divider line
      {
        overlay: "sample",
        effect: "colorize:100",
        color: "white",
        width: 160, height: 1,
        crop: "scale",
        gravity: "north_west", x: 70, y: 445,
      },

      // 6. Address line 1
      {
        overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: D.addressLine1 },
        color: "white", gravity: "north_west", x: 70, y: 470,
      },

      // 7. Address line 2
      {
        overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: D.addressLine2 },
        color: "white", gravity: "north_west", x: 70, y: 510,
      },

      // 8. Specs
      {
        overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: D.specs },
        color: "white", gravity: "north_west", x: 70, y: 575,
      },

      // 8a. Flowing hook paragraph
      {
        overlay: {
          font_family: FONT,
          font_size: 19,
          font_weight: "light",
          font_style: "italic",
          text: D.body,
          letter_spacing: 1,
        },
        width: 360,
        crop: "fit",
        color: "white",
        gravity: "north_west",
        x: 70, y: 660,
      },

      // 9. Headshot — slightly inset so it matches the new 70px padding.
      // Panel is 480 wide; 400px headshot with 40px margins.
      {
        overlay: "headshots:head-shot-2026",
        width: 400,
        gravity: "south_west",
        x: 40, y: 40,
      },

      // 10. Thin bottom bar (slightly taller for italic readability)
      {
        overlay: "sample",
        effect: "colorize:100",
        color: `rgb:${TEAL}`,
        width: 1080, height: 40,
        crop: "scale",
        gravity: "south",
      },

      // 11. Listed-by credit — italic + light weight
      {
        overlay: {
          font_family: FONT,
          font_size: 13,
          font_weight: "light",
          font_style: "italic",
          text: D.listingCredit,
        },
        color: "rgb:EFEFEF", gravity: "south", y: 13,
      },
    ],
  });

  console.log("URL:", url);

  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const tempDir = path.join(__dirname, "..", "temp-images");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, `cover-v5-${Date.now()}.jpg`);
  fs.writeFileSync(filePath, buf);
  console.log(`Saved: ${filePath} (${(buf.length / 1024).toFixed(1)} KB)`);
})().catch((e) => { console.error(e); process.exit(1); });
