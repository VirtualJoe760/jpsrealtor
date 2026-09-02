require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
  await c.connect();
  const db = c.db();
  for (const key of process.argv.slice(2)) {
    const l = await db.collection("unifiedlistings").findOne({ listingKey: key });
    if (!l) { console.log("NOT FOUND", key); continue; }
    console.log("=".repeat(90));
    console.log(l.unparsedAddress || [l.streetNumber,l.streetName,l.city].join(" "), "|", l.listingKey);
    console.log("$" + l.listPrice, "|", l.bedroomsTotal, "bd", l.bathroomsTotalInteger, "ba", l.livingArea, "sf | lot", l.lotSizeSqft || l.lotSizeAcres, "|", l.yearBuilt);
    console.log("sub:", l.subdivisionName, "| type:", l.propertyType, l.propertySubType, "| pool:", l.poolYN, l.poolFeatures, "| spa:", l.spaYN);
    console.log("furnished:", l.furnished, "| status:", l.standardStatus, "| onMarket:", l.onMarketDate);
    console.log("listAgent:", l.listAgentFullName, "| coList:", l.coListAgentFullName, "| office:", l.listOfficeName, "| coOffice:", l.coListOfficeName);
    console.log("view:", l.view, "| heat:", l.heating, "| cool:", l.cooling, "| laundry:", l.laundryFeatures);
    console.log("lotFeatures:", l.lotFeatures, "| patio:", l.patioAndPorchFeatures, "| exterior:", l.exteriorFeatures);
    console.log("interior:", l.interiorFeatures);
    console.log("appliances:", l.appliances, "| flooring:", l.flooring, "| parking:", l.parkingFeatures, l.garageSpaces);
    console.log("assoc:", l.associationYN, l.associationFee, "| utilities:", l.utilities, "| sewer:", l.sewer, "| water:", l.waterSource);
    console.log("\nREMARKS:", l.publicRemarks);
    console.log("\nMEDIA (" + (l.media||[]).length + "):");
    (l.media||[]).forEach((m,i)=>console.log("  "+String(i).padStart(2), (m.Caption||m.caption||"-").slice(0,50).padEnd(52), (m.MediaURL||m.mediaURL||m.uri1600||"").slice(0,100)));
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
