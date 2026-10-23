require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const keys = process.argv.slice(2);
  for (const k of keys) {
    const l = await db.collection("unifiedlistings").findOne({ listingKey: k });
    if (!l) { console.log(k + " NOT FOUND"); continue; }
    console.log("=".repeat(90));
    console.log(l.unparsedAddress, "|", l.city, "| $" + (l.listPrice||0).toLocaleString());
    console.log("beds:", l.bedroomsTotal, "baths:", l.bathroomsTotalInteger, "sqft:", l.livingArea, "lot:", l.lotSizeSquareFeet, "built:", l.yearBuilt);
    console.log("subdivision:", l.subdivisionName, "| DOM:", l.daysOnMarket, "| photos:", (l.media||[]).length);
    console.log("pool:", l.poolPrivateYN, l.poolFeatures, "| view:", l.view, "| hoa:", l.associationFee);
    console.log("listAgent:", l.listAgentFullName, "|", l.listOfficeName, "|| coList:", l.coListAgentFullName, "|", l.coListOfficeName);
    console.log("features:", JSON.stringify({interior:l.interiorFeatures, exterior:l.exteriorFeatures, appliances:l.appliances, flooring:l.flooring, cooling:l.cooling, heating:l.heating, parking:l.parkingFeatures, garage: l.garageSpaces, laundry:l.laundryFeatures, lotFeatures:l.lotFeatures, patio:l.patioAndPorchFeatures, security:l.securityFeatures, spa:l.spaFeatures, utilities:l.utilities}));
    console.log("\nREMARKS:\n" + (l.publicRemarks||"(none)"));
    console.log();
  }
  await mongoose.disconnect();
})();
