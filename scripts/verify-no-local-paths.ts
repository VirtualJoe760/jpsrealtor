/**
 * Read-only verification: scan all Article docs in MongoDB for any lingering
 * local image paths (e.g. /joey/, /city-images/) in featuredImage, ogImage,
 * or body content. Prints any found.
 *
 * Run: npx tsx scripts/verify-no-local-paths.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Match LOCAL paths only — i.e. `/joey/` that's preceded by `(` (markdown
// image syntax `](/joey/...)`) or `"` (frontmatter `image: "/joey/..."`).
// This avoids false positives on legit Cloudinary URLs that contain
// `jpsrealtor/joey/` as a path segment.
const LOCAL_PATH_RE = /[("](\/(joey|city-images|post-photos)\/)/g;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const articles = mongoose.connection.db!.collection("articles");

  const all = await articles
    .find({}, { projection: { slug: 1, "featuredImage.url": 1, "ogImage.url": 1, content: 1 } })
    .toArray();

  let hits = 0;
  for (const doc of all) {
    const flagged: string[] = [];
    // Frontmatter-equivalent fields: a "url" that starts with "/" is a local path.
    if (doc.featuredImage?.url?.startsWith("/")) flagged.push(`featuredImage: ${doc.featuredImage.url}`);
    if (doc.ogImage?.url?.startsWith("/")) flagged.push(`ogImage: ${doc.ogImage.url}`);
    // Body content: look for markdown image syntax referencing local paths
    if (doc.content) {
      const matches = doc.content.match(LOCAL_PATH_RE);
      if (matches) flagged.push(`content: ${matches.length} local image ref(s) (${[...new Set(matches)].join(" ")})`);
    }
    if (flagged.length > 0) {
      hits++;
      console.log(`${doc.slug}\n  ${flagged.join("\n  ")}`);
    }
  }
  console.log(`\nScanned ${all.length} articles. ${hits} had local image paths.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
