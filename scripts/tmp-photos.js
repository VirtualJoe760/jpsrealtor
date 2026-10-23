// Scratch: dump listing photo URLs for visual review. Safe to delete.
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const key = process.argv[2];
  const l = await db.collection("unifiedlistings").findOne({ listingKey: key });
  if (!l) { console.log("not found"); process.exit(1); }
  console.log(JSON.stringify({
    addr: [l.streetNumber, l.streetName, l.unitNumber].filter(Boolean).join(" "),
    city: l.city, state: l.stateOrProvince, zip: l.postalCode,
    price: l.listPrice, beds: l.bedroomsTotal, baths: l.bathroomsTotalInteger,
    sqft: l.livingArea, lot: l.lotSizeSqft, year: l.yearBuilt,
    subdivision: l.subdivisionName, propertyType: l.propertyType,
    subType: l.propertySubType, photos: l.photosCount,
    listAgent: l.listAgentName, listOffice: l.listOfficeName,
    coListAgent: l.coListAgentName, coListOffice: l.coListOfficeName,
    pool: l.poolPrivateYN, spa: l.spaYN, garage: l.garageSpaces,
    hoa: l.associationFee, view: l.view, stories: l.stories,
    onMarket: l.onMarketDate,
  }, null, 2));
  console.log("\n--- REMARKS ---\n" + (l.publicRemarks || "(none)"));
  console.log("\n--- FEATURES ---");
  for (const f of ["interiorFeatures","exteriorFeatures","appliances","flooring","cooling","heating","fireplaceFeatures","lotFeatures","patioAndPorchFeatures","poolFeatures","architecturalStyle","communityFeatures","utilities","laundryFeatures","parkingFeatures"]) {
    if (l[f] && (Array.isArray(l[f]) ? l[f].length : true)) console.log(f + ": " + JSON.stringify(l[f]));
  }
  console.log("\n--- PHOTOS (" + (l.media || []).length + ") ---");
  (l.media || []).forEach((m, i) => {
    console.log(i + "\t" + (m.mediaURL || m.MediaURL || m.url) + "\t" + (m.shortDescription || m.ShortDescription || ""));
  });
  await mongoose.disconnect();
})();
