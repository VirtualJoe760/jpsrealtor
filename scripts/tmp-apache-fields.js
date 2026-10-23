require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
  await c.connect();
  const l = await c.db().collection("unifiedlistings").findOne({ listingKey: "20260527231221167213000000" });
  for (const k of ["bedroomsTotal","bedsTotal","bathroomsTotalInteger","bathsTotal","livingArea","lotSizeSqft","lotSizeAcres","listPrice","city","stateOrProvince","postalCode","streetNumber","streetName","unitNumber","unparsedAddress","listAgentName","coListAgentName","listOfficeName","coListOfficeName","yearBuilt","poolYN","furnished","associationYN","view","cooling","heating","flooring","parkingFeatures","sewer","subdivisionName","rvParking"])
    console.log(k.padEnd(24), JSON.stringify(l[k]));
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
