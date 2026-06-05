// scripts/audit-listing-fields.js
//
// Audit pass: for every field the skill /api/skill/listings/[listingKey]
// route returns, check if the DB actually has it under the name the route
// reads. Flags silent-strict-drops (route reads X, DB has Xx with different
// casing) and "always null" fields where the data simply isn't there.
//
// Pulls 25 random active listings and reports field-by-field hit rate.

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

// Each entry: [outputKey, [DB candidate keys in priority order]]
// Mirrors what get_listing actually reads, including the recently-fixed
// camelCase/PascalCase fallbacks.
const FIELDS = [
  ["address", ["unparsedAddress"]],
  ["city", ["city"]],
  ["state", ["stateOrProvince"]],
  ["postalCode", ["postalCode"]],
  ["subdivision", ["subdivisionName"]],
  ["propertyType (label)", ["propertyTypeLabel", "propertyType"]],
  ["propertySubType", ["propertySubType"]],
  ["status", ["standardStatus"]],
  ["listPrice", ["listPrice"]],
  ["originalListPrice", ["originalListPrice"]],
  ["beds", ["bedroomsTotal", "bedsTotal"]],
  ["baths", ["bathroomsTotalInteger", "bathsTotal"]],
  ["bathsDecimal", ["bathroomsTotalDecimal"]],
  ["sqft", ["livingArea"]],
  ["lotSize", ["lotSizeArea"]],
  ["lotSizeUnits", ["lotSizeUnits"]],
  ["yearBuilt", ["yearBuilt"]],
  ["stories", ["stories"]],
  ["levels", ["levels"]],
  ["hoaFee", ["associationFee"]],
  ["hoaFeeFrequency", ["associationFeeFrequency"]],
  ["communityFeatures", ["communityFeatures"]],
  ["poolBoolean", ["poolYN", "poolYn", "pool", "poolPrivateYn"]],
  ["poolFeatures", ["poolFeatures"]],
  ["spaBoolean", ["spaYN", "spaYn", "spa"]],
  ["spaFeatures", ["spaFeatures"]],
  ["view", ["view"]],
  ["garageSpaces", ["garageSpaces"]],
  ["parkingTotal", ["parkingTotal"]],
  ["heating", ["heating"]],
  ["cooling", ["cooling"]],
  ["daysOnMarket", ["daysOnMarket"]],
  ["onMarketDate", ["onMarketDate"]],
  ["publicRemarks", ["publicRemarks"]],
  ["mediaCount", ["media"]],
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection("unified_listings");

  const N = 25;
  // Take a sample of recent active listings — random enough for coverage.
  const docs = await col
    .aggregate([
      { $match: { standardStatus: "Active" } },
      { $sample: { size: N } },
    ])
    .toArray();

  // Field hit counts
  const stats = FIELDS.map(([out, keys]) => ({
    output: out,
    keys: keys.join(" || "),
    hits: 0,
    nulls: 0,
    sampleHitKey: null,
    sampleValue: null,
  }));

  for (const doc of docs) {
    stats.forEach((s, i) => {
      const keys = FIELDS[i][1];
      let hit = false;
      for (const k of keys) {
        const v = doc[k];
        const present = v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");
        if (present) {
          // For media: count > 0 also counts
          if (k === "media" && !Array.isArray(v)) continue;
          s.hits += 1;
          if (!s.sampleHitKey) {
            s.sampleHitKey = k;
            s.sampleValue =
              k === "media"
                ? `[len=${v.length}]`
                : typeof v === "string" && v.length > 50
                ? v.slice(0, 47) + "..."
                : v;
          }
          hit = true;
          break;
        }
      }
      if (!hit) s.nulls += 1;
    });
  }

  // Also collect every top-level DB key across the sample so we can spot
  // populated-but-unread fields.
  const allKeys = new Set();
  for (const doc of docs) {
    for (const k of Object.keys(doc)) allKeys.add(k);
  }
  const fieldsWeRead = new Set(FIELDS.flatMap(([, ks]) => ks));
  const unreadKeys = [...allKeys].filter((k) => !fieldsWeRead.has(k) && k !== "_id");

  console.log(`\nSampled ${docs.length} active listings.\n`);
  console.log("FIELD AUDIT — % of sample where the field had a value:\n");
  console.log("  hit%  output                    fallback chain                              sample");
  console.log("  ----  ------------------------  ------------------------------------------  ------");
  for (const s of stats) {
    const pct = ((s.hits / docs.length) * 100).toFixed(0).padStart(3);
    const flag =
      s.hits === 0
        ? "❌"
        : s.hits < docs.length / 2
        ? "⚠"
        : " ";
    console.log(
      `  ${pct}%  ${flag} ${s.output.padEnd(22)}  ${s.keys.padEnd(42)}  ${s.sampleHitKey ? `(${s.sampleHitKey}=${s.sampleValue})` : "—"}`
    );
  }

  console.log(`\nDB keys present in sample but NOT read by the route (top 40):`);
  unreadKeys
    .slice(0, 40)
    .forEach((k) => console.log(`  - ${k}`));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
