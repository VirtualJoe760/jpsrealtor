// scripts/test-cover-slide.js
//
// Cover slide using Cloudinary's `sample` overlay recolored + scaled to
// fill the panel/bar regions. Downloads the result to /temp-images/.

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

// Listing data — eventually pulled from get_listing + AI-generated hook.
const D = {
  hook: "ITALIANATE LUXURY",
  price: "$3,095,000",
  addressLine1: "75809 VIA PISA",
  addressLine2: "INDIAN WELLS, CA",
  specs: "4 BD  |  5 BA  |  3,260 SQFT",
  agentName: "JOSEPH SARDELLA",
  agentLicense: "DRE 02106916",
  agentBrokerage: "eXp REALTY",
};

const TEAL = "1C4A5A";

(async () => {
  // For now use a "presumed exterior" photo. The listing's photo[0] for
  // this Toscana CC listing is actually the backyard — would need front-
  // exterior detection in production. For this prototype use photo[6]
  // which tends to be exterior shots in GPS-sourced listings.
  const photosRes = await fetch(`http://localhost:3000/api/listings/${LISTING_KEY}/photos`);
  const photosData = await photosRes.json();
  // Walk a few candidates to find one more likely to be a front exterior
  // (Spark feeds photos in MLS order, which puts the hero/exterior late).
  const photo = photosData.photos[Math.min(photosData.photos.length - 1, 8)];
  const sourceUrl = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.url;
  console.log("Source:", sourceUrl);

  const base = await cloudinary.uploader.upload(sourceUrl, {
    folder: `jpsrealtor/ai-staged/${LISTING_KEY}/cover-test`,
    public_id: `base-${Date.now()}`,
  });

  const url = cloudinary.url(base.public_id, {
    transformation: [
      // 1. Crop to 4:5 portrait, 1080 wide
      { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },

      // 2. LEFT PANEL — sample image recolored teal, SCALED to fill 480x1350, 75% opacity
      {
        overlay: "sample",
        effect: "colorize:100",
        color: `rgb:${TEAL}`,
        opacity: 75,
        width: 480, height: 1350,
        crop: "scale",
        gravity: "west",
      },

      // 3. Hook
      {
        overlay: { font_family: "Arial", font_size: 92, font_weight: "bold", text: D.hook },
        color: "white", gravity: "north_west", x: 50, y: 130,
      },

      // 4. Price
      {
        overlay: { font_family: "Arial", font_size: 72, font_weight: "bold", text: D.price },
        color: "white", gravity: "north_west", x: 50, y: 380,
      },

      // 5. Divider — scaled colored sample, 3px tall x 200 wide
      {
        overlay: "sample",
        effect: "colorize:100",
        color: "white",
        width: 200, height: 3,
        crop: "scale",
        gravity: "north_west", x: 50, y: 475,
      },

      // 6. Address line 1
      {
        overlay: { font_family: "Arial", font_size: 32, text: D.addressLine1 },
        color: "white", gravity: "north_west", x: 50, y: 510,
      },

      // 7. Address line 2
      {
        overlay: { font_family: "Arial", font_size: 26, text: D.addressLine2 },
        color: "white", gravity: "north_west", x: 50, y: 555,
      },

      // 8. Specs
      {
        overlay: { font_family: "Arial", font_size: 28, font_weight: "bold", text: D.specs },
        color: "white", gravity: "north_west", x: 50, y: 620,
      },

      // 9. BOTTOM BRAND BAR — solid teal, SCALED to 1080x80
      {
        overlay: "sample",
        effect: "colorize:100",
        color: `rgb:${TEAL}`,
        width: 1080, height: 80,
        crop: "scale",
        gravity: "south",
      },

      // 10. Agent name
      {
        overlay: { font_family: "Arial", font_size: 28, font_weight: "bold", text: D.agentName },
        color: "white", gravity: "south_west", x: 50, y: 28,
      },

      // 11. Brokerage + license
      {
        overlay: { font_family: "Arial", font_size: 18, text: `${D.agentBrokerage}  |  ${D.agentLicense}` },
        color: "white", gravity: "south_east", x: 50, y: 30,
      },
    ],
  });

  console.log("\nCloudinary URL:\n" + url);

  // Download to local file
  const tempDir = path.join(__dirname, "..", "temp-images");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const localPath = path.join(tempDir, `cover-${Date.now()}.jpg`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(localPath, buf);
  console.log("\nSaved locally:", localPath);
  console.log(`Size: ${(buf.length / 1024).toFixed(1)} KB`);
})().catch((e) => { console.error(e); process.exit(1); });
