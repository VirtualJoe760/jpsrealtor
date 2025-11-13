import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI!;
const DATABASE_NAME = "admin";
const COLLECTION_NAME = "listings";
const SLUG = "20250330180121473650000000";

function extractFeatures(
  label: string,
  obj: Record<string, any> | undefined
): string {
  if (!obj || typeof obj !== "object") return "None";
  const features = Object.entries(obj)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
  return features.length > 0 ? features.join(", ") : "None";
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(DATABASE_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const listing = await collection.findOne({ slug: SLUG });

  if (!listing) {
    await client.close();
    return;
  }







  await client.close();
}

run().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
