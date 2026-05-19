/**
 * Reassign orphan author.id values on Article documents to Joseph's current
 * user _id. MongoDB-only — does not touch src/posts/ MDX files.
 *
 * Why: the live /api/articles/list endpoint scopes by the domain owner's
 * user._id (Joseph for jpsrealtor.com). 39 Article documents have author.id
 * values from a prior batch migration that match no User. After the scoping
 * fix, those 39 disappeared. Their author.name is already "Joseph Sardella"
 * so the rewrite is unambiguous.
 *
 * Bethany's one article (author.id == 69dbfa267028fc9a7b9e5dd8) is preserved.
 * The 8 articles already on Joseph's current id are untouched.
 *
 * Run:
 *   npx tsx scripts/fix-article-authors-mongo.ts --dry-run    # preview
 *   npx tsx scripts/fix-article-authors-mongo.ts              # apply
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const JOSEPH_ID = "691604b0d2b9d5140af67b4c";
const JOSEPH_NAME = "Joseph Sardella";
const JOSEPH_EMAIL = "josephsardella@gmail.com";

const BETHANY_ID = "69dbfa267028fc9a7b9e5dd8";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no documents will be modified.\n");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error("no db handle");
    process.exit(1);
  }

  const articles = db.collection("articles");

  // Find every article whose author.id is NOT Joseph and NOT Bethany.
  // Those are orphans to rewrite. We compare against ObjectId form because
  // author.id is stored as an ObjectId in the schema.
  const orphanFilter = {
    "author.id": {
      $nin: [
        new mongoose.Types.ObjectId(JOSEPH_ID),
        new mongoose.Types.ObjectId(BETHANY_ID),
      ],
    },
  };

  const before = await articles.countDocuments(orphanFilter);
  console.log(`Articles with orphan author.id: ${before}`);

  if (before > 0) {
    // Quick sanity check: confirm all orphans are named Joseph. If any aren't,
    // bail so we don't accidentally reassign someone else's article.
    const distinctNames = await articles.distinct("author.name", orphanFilter);
    console.log(`Distinct author.name on orphan rows: ${JSON.stringify(distinctNames)}`);
    const allJoseph = distinctNames.every(
      (n) => typeof n === "string" && n.toLowerCase().includes("joseph")
    );
    if (!allJoseph) {
      console.error(
        "ABORT: orphan articles include names other than Joseph. Manual review needed before bulk reassign."
      );
      await mongoose.disconnect();
      process.exit(1);
    }

    if (!DRY_RUN) {
      const res = await articles.updateMany(orphanFilter, {
        $set: {
          "author.id": new mongoose.Types.ObjectId(JOSEPH_ID),
          "author.name": JOSEPH_NAME,
          "author.email": JOSEPH_EMAIL,
        },
      });
      console.log(`Updated ${res.modifiedCount} articles to Joseph's current _id.`);
    } else {
      console.log("(dry run — would have updated above)");
    }
  } else {
    console.log("No orphans found. Nothing to do.");
  }

  // Post-fix verification: what will the list endpoint see for jpsrealtor.com?
  const josephCount = await articles.countDocuments({
    "author.id": new mongoose.Types.ObjectId(JOSEPH_ID),
  });
  const josephVisibleCount = await articles.countDocuments({
    "author.id": new mongoose.Types.ObjectId(JOSEPH_ID),
    category: { $ne: "landing-page" },
  });
  const bethanyCount = await articles.countDocuments({
    "author.id": new mongoose.Types.ObjectId(BETHANY_ID),
  });

  console.log("\nPost-fix expected state:");
  console.log(`  Joseph total: ${josephCount}`);
  console.log(`  Joseph on insights feed (excludes landing-page): ${josephVisibleCount}`);
  console.log(`  Bethany total: ${bethanyCount}`);

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
