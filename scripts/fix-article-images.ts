/**
 * Image-path cleanup migration:
 *   1. Migrate indio-progressive-business-friendly /city-images/indio.jpg ->
 *      Cloudinary URL (both MDX frontmatter and MongoDB document).
 *   2. Same for top-airbnb-communities-indio /city-images/coachella.jpg.
 *   3. Delete the new-website-features article entirely (MDX + Mongo).
 *
 * Run: npx tsx scripts/fix-article-images.ts
 * Add --dry-run to preview.
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

interface UrlSwap {
  slug: string;
  oldPath: string;
  newUrl: string;
  publicId: string;
  alt?: string;
}

const SWAPS: UrlSwap[] = [
  {
    slug: "indio-progressive-business-friendly",
    oldPath: "/city-images/indio.jpg",
    newUrl: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/indio.jpg",
    publicId: "indio",
  },
  {
    slug: "top-airbnb-communities-indio",
    oldPath: "/city-images/coachella.jpg",
    newUrl: "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/coachella.jpg",
    publicId: "coachella",
  },
];

const DELETE_SLUG = "new-website-features";

const POSTS_DIR = path.join(process.cwd(), "src", "posts");

function updateMdx(slug: string, oldPath: string, newUrl: string): boolean {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] MDX not found: ${filePath}`);
    return false;
  }
  const before = fs.readFileSync(filePath, "utf-8");
  // Replace inside frontmatter `image: "..."` and `ogImage: "..."` lines.
  // Use a literal replace anchored to the line shape so we don't accidentally
  // touch unrelated occurrences.
  const after = before
    .replace(`image: "${oldPath}"`, `image: "${newUrl}"`)
    .replace(`ogImage: "${oldPath}"`, `ogImage: "${newUrl}"`);
  if (after === before) {
    console.log(`  [SKIP] No matching lines in ${slug}.mdx (already migrated?)`);
    return false;
  }
  if (DRY_RUN) {
    console.log(`  [dry] would rewrite ${slug}.mdx`);
  } else {
    fs.writeFileSync(filePath, after, "utf-8");
    console.log(`  [ok]  rewrote ${slug}.mdx`);
  }
  return true;
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no files or DB documents will change.\n");

  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const articles = db.collection("articles");

  // -- Step 1 + 2: image URL swaps ----------------------------------------
  for (const swap of SWAPS) {
    console.log(`\n${swap.slug}:`);
    updateMdx(swap.slug, swap.oldPath, swap.newUrl);

    const existing = await articles.findOne(
      { slug: swap.slug },
      { projection: { "featuredImage.alt": 1, "ogImage.alt": 1 } }
    );
    const featuredAlt = existing?.featuredImage?.alt || "";
    const ogAlt = existing?.ogImage?.alt || featuredAlt;

    if (!DRY_RUN) {
      const res = await articles.updateOne(
        { slug: swap.slug },
        {
          $set: {
            "featuredImage.url": swap.newUrl,
            "featuredImage.publicId": swap.publicId,
            "featuredImage.alt": featuredAlt,
            "ogImage.url": swap.newUrl,
            "ogImage.publicId": swap.publicId,
            "ogImage.alt": ogAlt,
          },
        }
      );
      console.log(
        `  [ok]  Mongo updated (matched=${res.matchedCount}, modified=${res.modifiedCount})`
      );
    } else {
      console.log(`  [dry] would update Mongo featuredImage + ogImage to ${swap.newUrl}`);
    }
  }

  // -- Step 3: delete new-website-features --------------------------------
  console.log(`\n${DELETE_SLUG}:`);
  const mdxPath = path.join(POSTS_DIR, `${DELETE_SLUG}.mdx`);
  if (fs.existsSync(mdxPath)) {
    if (DRY_RUN) {
      console.log(`  [dry] would delete MDX ${mdxPath}`);
    } else {
      fs.unlinkSync(mdxPath);
      console.log(`  [ok]  deleted MDX ${mdxPath}`);
    }
  } else {
    console.log(`  [skip] MDX not found (already removed?)`);
  }

  const dbExists = await articles.findOne({ slug: DELETE_SLUG }, { projection: { _id: 1 } });
  if (dbExists) {
    if (DRY_RUN) {
      console.log(`  [dry] would delete Mongo article _id=${dbExists._id}`);
    } else {
      const res = await articles.deleteOne({ slug: DELETE_SLUG });
      console.log(`  [ok]  Mongo deleted (deletedCount=${res.deletedCount})`);
    }
  } else {
    console.log(`  [skip] Mongo article not found (already removed?)`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
