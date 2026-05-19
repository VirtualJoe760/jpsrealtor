/**
 * Read-only diagnostic: report on the state of articles in MongoDB and the
 * users they reference. No writes. Use this to figure out why the article
 * list isn't returning the expected rows.
 *
 * Run:
 *   npx tsx scripts/diagnose-articles.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error("no db handle");
    process.exit(1);
  }

  // 1. Total articles in collection
  const articles = db.collection("articles");
  const total = await articles.countDocuments({});
  console.log(`\nTotal articles in 'articles' collection: ${total}`);

  // 2. Distinct author.id values
  const distinctAuthorIds = await articles.distinct("author.id");
  console.log(`\nDistinct author.id values (${distinctAuthorIds.length}):`);
  for (const id of distinctAuthorIds) {
    const count = await articles.countDocuments({ "author.id": id });
    console.log(`  ${id}  -> ${count} articles`);
  }

  // 3. Distinct statuses (in case some are draft and being hidden)
  const distinctStatuses = await articles.distinct("status");
  console.log(`\nDistinct status values:`);
  for (const s of distinctStatuses) {
    const count = await articles.countDocuments({ status: s });
    console.log(`  ${s}  -> ${count} articles`);
  }

  // 4. Categories breakdown (since list excludes landing-page by default)
  const distinctCategories = await articles.distinct("category");
  console.log(`\nDistinct categories:`);
  for (const c of distinctCategories) {
    const count = await articles.countDocuments({ category: c });
    console.log(`  ${c}  -> ${count} articles`);
  }

  // 5. Users — show id, name, email for the candidate domain owners
  const users = db.collection("users");
  const userQuery = {
    $or: [
      { email: "josephsardella@gmail.com" },
      { name: /joseph/i },
      { name: /bethany/i },
    ],
  };
  const userDocs = await users
    .find(userQuery, { projection: { _id: 1, name: 1, email: 1 } })
    .toArray();
  console.log(`\nCandidate domain-owner users:`);
  for (const u of userDocs) {
    console.log(`  ${u._id}  ${u.name}  <${u.email}>`);
  }

  // 6. What would the new list endpoint resolve as the jpsrealtor.com owner?
  // resolveDomainOwner falls back to PRIMARY_AGENT_EMAIL (Joseph) for apex domains.
  const primaryEmail = process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";
  const primary = await users.findOne(
    { email: primaryEmail },
    { projection: { _id: 1, name: 1, email: 1 } }
  );
  console.log(`\nresolveDomainOwner for jpsrealtor.com would return:`);
  if (primary) {
    console.log(`  _id=${primary._id}  (${primary.name}, ${primary.email})`);
    const matched = await articles.countDocuments({ "author.id": primary._id });
    const matchedExcludingLP = await articles.countDocuments({
      "author.id": primary._id,
      category: { $ne: "landing-page" },
    });
    console.log(
      `  Articles with author.id == this _id: ${matched} (${matchedExcludingLP} excluding landing-page)`
    );
  } else {
    console.log(`  NO USER FOUND for PRIMARY_AGENT_EMAIL=${primaryEmail}`);
  }

  // 7. Sample 3 articles to show their actual author.id shape
  console.log(`\nSample articles:`);
  const sample = await articles
    .find({}, { projection: { slug: 1, title: 1, "author.id": 1, "author.name": 1, status: 1, category: 1 } })
    .limit(5)
    .toArray();
  for (const s of sample) {
    console.log(
      `  ${s.slug || "(no slug)"}  | author.id=${s.author?.id} (${typeof s.author?.id}) name=${s.author?.name} status=${s.status} cat=${s.category}`
    );
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
