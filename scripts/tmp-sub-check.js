// Scratch: does this listing's subdivision have closed-sale stats for a CMA slide?
// Mirrors the build script's query exactly: name AND city.
require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const m = require("mongoose");
const ESC = /[.*+?^${}()|[\]\\]/g;
(async () => {
  await m.connect(process.env.MONGODB_URI);
  const db = m.connection.db;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  console.log("subdivisionName:", JSON.stringify(l.subdivisionName), "city:", l.city);
  if (l.subdivisionName && !/not applicable|not in a development/i.test(l.subdivisionName)) {
    const s = await db.collection("subdivisions").findOne({
      name: new RegExp("^" + String(l.subdivisionName).replace(ESC, "\\$&") + "$", "i"),
      city: new RegExp("^" + String(l.city).replace(ESC, "\\$&") + "$", "i"),
    });
    console.log("subdivision doc (name+city):", s ? s.name + " / " + s.city + " | closed=" + JSON.stringify(s.cmaStats && s.cmaStats.closed).slice(0, 400) : "NONE -> CMA skipped");
  } else console.log("subdivision: n/a -> CMA slide will be skipped");
  // How many subdivision docs are literally named "Other"?
  const others = await db.collection("subdivisions").find({ name: /^other$/i }, { projection: { name: 1, city: 1, "cmaStats.closed.count": 1, "cmaStats.closed.medianClosePrice": 1 } }).toArray();
  console.log('\nsubdivision docs named "Other":', others.length);
  others.forEach((o) => console.log("   ", String(o.city).padEnd(22), "count=" + (o.cmaStats?.closed?.count ?? "-"), "median=" + (o.cmaStats?.closed?.medianClosePrice ?? "-")));
  await m.disconnect();
})();
