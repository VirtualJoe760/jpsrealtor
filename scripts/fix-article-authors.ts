/**
 * One-shot migration: fix orphan author IDs on articles.
 *
 * Background:
 *   - 43 MDX articles in src/posts/ have authorId values like 692b6a9d...,
 *     692b6a9e..., 692b6a9f... — these are orphan IDs from a prior auto-
 *     generated migration that don't match any active User document.
 *   - 8 articles already have Joseph's current id (691604b0d2b9d5140af67b4c).
 *   - 1 article (Bethany Klier's profile post) has her id and should be
 *     left alone — that one belongs on her profile, not Joseph's.
 *
 * The previously-deployed fix to /api/articles/list scopes results by the
 * resolved domain owner. Because the orphan IDs match no real user, those
 * 43 articles disappeared from jpsrealtor.com after the scoping fix landed.
 * This script reassigns them to Joseph so they show on his sites.
 *
 * Run once:
 *   npx tsx scripts/fix-article-authors.ts
 *
 * Pass --dry-run to see what would change without writing anything:
 *   npx tsx scripts/fix-article-authors.ts --dry-run
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Hardcoded user IDs (verified against current frontmatter + session)
const JOSEPH_ID = "691604b0d2b9d5140af67b4c";
const JOSEPH_NAME = "Joseph Sardella";
const JOSEPH_EMAIL = "josephsardella@gmail.com";

const BETHANY_ID = "69dbfa267028fc9a7b9e5dd8";

const POSTS_DIR = path.join(process.cwd(), "src", "posts");
const DRY_RUN = process.argv.includes("--dry-run");

function isOrphanJosephId(id: string | undefined): boolean {
  if (!id) return false;
  if (id === JOSEPH_ID) return false;
  if (id === BETHANY_ID) return false;
  // Treat anything else as orphan (likely the 692b6a9... batch)
  return true;
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no files or DB documents will be changed.\n");

  // --- Phase 1: update MDX frontmatter -----------------------------------
  const filenames = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"));

  let mdxUpdated = 0;
  let mdxSkippedCorrect = 0;
  let mdxSkippedBethany = 0;
  const orphanSlugs: string[] = [];

  for (const filename of filenames) {
    const filePath = path.join(POSTS_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, any>;

    if (fm.authorId === BETHANY_ID) {
      mdxSkippedBethany++;
      continue;
    }
    if (fm.authorId === JOSEPH_ID && fm.authorName === JOSEPH_NAME) {
      mdxSkippedCorrect++;
      continue;
    }

    if (isOrphanJosephId(fm.authorId)) {
      orphanSlugs.push(fm.slugId || filename.replace(".mdx", ""));
    }

    const oldId = fm.authorId;
    fm.authorId = JOSEPH_ID;
    fm.authorName = JOSEPH_NAME;

    if (!DRY_RUN) {
      const newRaw = matter.stringify(parsed.content, fm);
      fs.writeFileSync(filePath, newRaw, "utf8");
    }

    mdxUpdated++;
    console.log(`  MDX: ${filename}  (${oldId} -> ${JOSEPH_ID})`);
  }

  console.log(
    `\nMDX phase: ${mdxUpdated} updated, ${mdxSkippedCorrect} already-correct, ${mdxSkippedBethany} skipped (Bethany)\n`
  );

  // --- Phase 2: update MongoDB Article documents -------------------------
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error(
      "ERROR: MONGODB_URI not set in environment. Cannot update production articles."
    );
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error("ERROR: no DB handle after connect");
    process.exit(1);
  }

  // Find all articles whose author.id is NOT Joseph's current id AND NOT
  // Bethany's id. Those are the orphans to fix.
  const articles = db.collection("articles");
  const orphanQuery = {
    "author.id": {
      $nin: [
        new mongoose.Types.ObjectId(JOSEPH_ID),
        new mongoose.Types.ObjectId(BETHANY_ID),
      ],
    },
  };

  const orphanCount = await articles.countDocuments(orphanQuery);
  console.log(`Mongo phase: found ${orphanCount} articles with orphan author.id`);

  if (orphanCount > 0) {
    // Show a sample so you can sanity-check before the update fires
    const sample = await articles
      .find(orphanQuery, { projection: { slug: 1, title: 1, "author.id": 1 } })
      .limit(5)
      .toArray();
    console.log("  Sample:");
    for (const s of sample) {
      console.log(
        `    - ${s.slug} (currently author.id=${s.author?.id})`
      );
    }

    if (!DRY_RUN) {
      const res = await articles.updateMany(orphanQuery, {
        $set: {
          "author.id": new mongoose.Types.ObjectId(JOSEPH_ID),
          "author.name": JOSEPH_NAME,
          "author.email": JOSEPH_EMAIL,
        },
      });
      console.log(`  Updated ${res.modifiedCount} Article documents.`);
    } else {
      console.log("  (dry run — no update issued)");
    }
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
