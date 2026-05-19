import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  for (const slug of [
    "indio-progressive-business-friendly",
    "new-website-features",
    "top-airbnb-communities-indio",
  ]) {
    const doc = await db.collection("articles").findOne(
      { slug },
      { projection: { slug: 1, "featuredImage.url": 1, "ogImage.url": 1 } }
    );
    console.log(slug);
    console.log(`  featured: ${doc?.featuredImage?.url ?? "(no article)"}`);
    if (doc?.ogImage?.url && doc.ogImage.url !== doc.featuredImage?.url) {
      console.log(`  og:       ${doc.ogImage.url}`);
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
