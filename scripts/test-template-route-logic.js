// Smoke test the route's template + Cloudinary URL logic end-to-end,
// bypassing skill auth. If this matches our locked-in cover from
// test-cover-jost.js, the route is correct.

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const m = require("mongoose");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LISTING_KEY = "20260429174250492207000000";

// Inline copy of the template (TypeScript source can't be directly required).
function buildSimpleLuxuryTransformations(d) {
  const FONT = d.font || "Poppins";
  const COLOR = d.accentColor || "1C4A5A";
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${COLOR}`, opacity: 75, width: 480, height: 1350, crop: "scale", gravity: "west" },
    { overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: d.hook }, color: "white", gravity: "north_west", x: 70, y: 110 },
    { overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.city, letter_spacing: 8 }, color: "white", gravity: "north_west", x: 70, y: 240 },
    { overlay: { font_family: FONT, font_size: 60, font_weight: "medium", text: d.price }, color: "white", gravity: "north_west", x: 70, y: 360 },
    { overlay: "sample", effect: "colorize:100", color: "white", width: 160, height: 1, crop: "scale", gravity: "north_west", x: 70, y: 445 },
    { overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.addressLine1 }, color: "white", gravity: "north_west", x: 70, y: 470 },
    { overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: d.addressLine2 }, color: "white", gravity: "north_west", x: 70, y: 510 },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: d.specs }, color: "white", gravity: "north_west", x: 70, y: 575 },
    { overlay: { font_family: FONT, font_size: 19, font_weight: "light", font_style: "italic", text: d.body, letter_spacing: 1 }, width: 360, crop: "fit", color: "white", gravity: "north_west", x: 70, y: 660 },
    { overlay: d.headshotPublicId.replace(/\//g, ":"), width: 400, gravity: "south_west", x: 40, y: 40 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${COLOR}`, width: 1080, height: 40, crop: "scale", gravity: "south" },
    { overlay: { font_family: FONT, font_size: 13, font_weight: "light", font_style: "italic", text: d.listingCredit }, color: "rgb:EFEFEF", gravity: "south", y: 13 },
  ];
}

function defaultHook(sub, city) {
  if (sub && sub !== "Not Applicable" && sub !== "Not in a Development") return `${sub.toUpperCase()} LUXURY`;
  if (city) return `${city.toUpperCase()} LUXURY`;
  return "JUST LISTED";
}
function defaultBody(remarks) {
  if (!remarks) return "";
  const sentences = remarks.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const s of sentences) {
    if ((out + " " + s).trim().length > 260) break;
    out = (out + " " + s).trim();
  }
  return out;
}
function fmtPrice(p) { return typeof p === "number" ? "$" + p.toLocaleString("en-US") : String(p || ""); }
function parseAddressLines(unparsed) {
  if (!unparsed) return { line1: "", line2: "" };
  const parts = unparsed.split(",").map(s => s.trim()).filter(Boolean);
  return { line1: parts[0] || "", line2: parts.slice(1).join(", ") };
}
function buildListingCredit(agent, office) {
  if (!agent && !office) return "";
  if (agent && office) return `Listed by ${agent}  ·  ${office}`;
  return `Listed by ${agent || office}`;
}

(async () => {
  await m.connect(process.env.MONGODB_URI);

  const listing = await m.connection.db.collection("unified_listings").findOne(
    { listingKey: LISTING_KEY },
    {
      projection: {
        unparsedAddress: 1, city: 1, stateOrProvince: 1,
        subdivisionName: 1, listPrice: 1, currentPrice: 1,
        bedroomsTotal: 1, bedsTotal: 1, bathroomsTotalInteger: 1, bathsTotal: 1,
        livingArea: 1, publicRemarks: 1, listAgentName: 1, listOfficeName: 1,
      },
    }
  );

  // Photo
  const photosRes = await fetch(`http://localhost:3000/api/listings/${LISTING_KEY}/photos`);
  const photosData = await photosRes.json();
  const photo = photosData.photos[Math.min(photosData.photos.length - 1, 8)];
  const sourceUrl = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.url;

  const base = await cloudinary.uploader.upload(sourceUrl, {
    folder: `jpsrealtor/ai-staged/${LISTING_KEY}/covers`,
    public_id: `route-test-${Date.now()}`,
  });

  // Build data the same way the route would
  const beds = listing.bedroomsTotal ?? listing.bedsTotal ?? null;
  const baths = listing.bathroomsTotalInteger ?? listing.bathsTotal ?? null;
  const sqft = listing.livingArea ?? null;
  const specs = [
    beds ? `${beds} BD` : null,
    baths ? `${baths} BA` : null,
    sqft ? `${sqft.toLocaleString("en-US")} SQFT` : null,
  ].filter(Boolean).join("  |  ");
  const addr = parseAddressLines(listing.unparsedAddress);

  const data = {
    basePhotoPublicId: base.public_id,
    headshotPublicId: "headshots/head-shot-2026",
    hook: "TOSCANA LUXURY",
    city: (listing.city || "").toUpperCase(),
    price: fmtPrice(listing.currentPrice ?? listing.listPrice),
    addressLine1: addr.line1.toUpperCase(),
    addressLine2: [listing.city, listing.stateOrProvince].filter(Boolean).join(", ").toUpperCase(),
    specs,
    body: "Positioned along the 10th fairway of Toscana's prestigious North Course, this Italianate residence captures sweeping mountain views. A detached casita welcomes your guests in their own private retreat.",
    listingCredit: buildListingCredit(listing.listAgentName, listing.listOfficeName),
    accentColor: "1C4A5A",
  };

  const url = cloudinary.url(base.public_id, { transformation: buildSimpleLuxuryTransformations(data) });
  console.log("Listing credit:", data.listingCredit);
  console.log("Body:", data.body.slice(0, 60), "…");
  console.log("URL:", url);

  // Download
  const r = await fetch(url);
  console.log("HTTP:", r.status);
  if (!r.ok) { console.error("Bad render"); process.exit(1); }
  const buf = Buffer.from(await r.arrayBuffer());
  const out = path.join(__dirname, "..", "temp-images", `route-test-${Date.now()}.jpg`);
  fs.writeFileSync(out, buf);
  console.log("Saved:", out, "(" + (buf.length / 1024).toFixed(1) + " KB)");
  await m.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
