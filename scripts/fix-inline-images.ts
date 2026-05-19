/**
 * Update the body content of two Mongo Article docs to swap the inline
 * /joey/home-large.png reference for the live Cloudinary about.png URL.
 * Pairs with the MDX edits already made for the same two slugs.
 *
 * Run: npx tsx scripts/fix-inline-images.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Body-content swaps for stranded local image paths. Each entry maps a slug
// to the broken `oldPath` we need to find and the Cloudinary URL to use.
const SWAPS: { slug: string; oldPath: string; newUrl: string }[] = [
  {
    slug: "coachella-valley-wildfire-relocation",
    oldPath: "/joey/home-large.png",
    newUrl:
      "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png",
  },
  {
    slug: "ultimate-buyers-guide-san-diego",
    oldPath: "/joey/home-large.png",
    newUrl:
      "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png",
  },
  {
    slug: "538-e-miraleste-court",
    oldPath: "/joey/about.png",
    newUrl:
      "https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png",
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const articles = mongoose.connection.db!.collection("articles");

  for (const { slug, oldPath, newUrl } of SWAPS) {
    const doc = await articles.findOne(
      { slug },
      { projection: { slug: 1, content: 1 } }
    );
    if (!doc) {
      console.log(`${slug}: NOT FOUND`);
      continue;
    }
    const before: string = doc.content || "";
    if (!before.includes(oldPath)) {
      console.log(`${slug}: no occurrence of "${oldPath}" in content (already fixed?)`);
      continue;
    }
    const occurrences = before.split(oldPath).length - 1;
    const after = before.split(oldPath).join(newUrl);
    const res = await articles.updateOne(
      { slug },
      { $set: { content: after } }
    );
    console.log(
      `${slug}: replaced ${occurrences} occurrence(s) of ${oldPath} (modified=${res.modifiedCount})`
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
