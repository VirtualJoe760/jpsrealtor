// scripts/migrate-date-fields.js
//
// One-time migration: convert string-typed date fields to real BSON Date.
//   - unified_listings.onMarketDate  (string today)
//   - unified_closed_listings.closeDate  (mixed: strings + dates)
//
// Idempotent: only touches docs whose value is still a string.
//
// Usage:
//   node scripts/migrate-date-fields.js --dry-run   # report counts only
//   node scripts/migrate-date-fields.js --execute   # actually update

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || !args.includes("--execute");

const TARGETS = [
  { collection: "unified_listings", field: "onMarketDate" },
  { collection: "unified_closed_listings", field: "closeDate" },
];

async function migrate({ collection, field }) {
  const col = mongoose.connection.db.collection(collection);
  const total = await col.countDocuments({ [field]: { $type: "string" } });
  console.log(`\n${collection}.${field}: ${total} string-typed docs`);

  if (total === 0 || isDryRun) {
    if (isDryRun && total > 0) console.log("  (dry-run — pass --execute to update)");
    return { collection, field, total, updated: 0 };
  }

  const result = await col.updateMany(
    { [field]: { $type: "string" } },
    [
      {
        $set: {
          [field]: {
            $convert: { input: `$${field}`, to: "date", onError: null },
          },
        },
      },
    ]
  );
  console.log(`  Updated ${result.modifiedCount}/${total}`);
  const remaining = await col.countDocuments({ [field]: { $type: "string" } });
  console.log(`  Remaining strings: ${remaining}`);
  return { collection, field, total, updated: result.modifiedCount, remaining };
}

(async () => {
  console.log(`MODE: ${isDryRun ? "DRY RUN" : "EXECUTE"} @ ${new Date().toISOString()}`);
  await mongoose.connect(process.env.MONGODB_URI);
  for (const t of TARGETS) await migrate(t);
  await mongoose.disconnect();
  console.log(`\nDone @ ${new Date().toISOString()}`);
})().catch((e) => { console.error(e); process.exit(1); });
