// Scratch: print the copy-relevant fields of one listing. Safe to delete.
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  const pick = ["listingKey","unparsedAddress","city","stateOrProvince","postalCode","listPrice",
    "bedroomsTotal","bathroomsTotalInteger","livingArea","lotSizeSquareFeet","yearBuilt",
    "subdivisionName","propertyType","propertySubType","furnished","poolFeatures","poolPrivateYN",
    "associationFee","associationFeeFrequency","listAgentName","coListAgentName","listOfficeName",
    "coListOfficeName","viewYN","view","garageSpaces","standardStatus"];
  pick.forEach((k) => console.log(k + ":", JSON.stringify(l[k])));
  console.log("\nREMARKS:\n" + (l.publicRemarks || "(none)"));
  console.log("\nphotos:", (l.media || []).length);
  await mongoose.disconnect();
})();
