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

  console.log(`🔍 Fetching listing with slug: ${SLUG}`);
  const listing = await collection.findOne({ slug: SLUG });

  if (!listing) {
    console.log("❌ Listing not found.");
    await client.close();
    return;
  }

  console.log("🔥 Fireplace:");
  console.log("- Present:", listing.FireplaceYn ? "Yes" : "No");
  console.log("- Count:", listing.FireplacesTotal ?? 0);
  console.log("- Features:", extractFeatures("FireplaceFeatures", listing.FireplaceFeatures));

  console.log("\n❄️ Cooling:");
  console.log("- Present:", listing.CoolingYn ? "Yes" : "No");
  console.log("- Types:", extractFeatures("Cooling", listing.Cooling));

  console.log("\n🔥 Heating:");
  console.log("- Present:", listing.HeatingYn ? "Yes" : "No");
  console.log("- Types:", extractFeatures("Heating", listing.Heating));

  console.log("\n🏊 Pool:");
  console.log("- Present:", listing.PoolYn ? "Yes" : "No");
  console.log("- Features:", extractFeatures("PoolFeatures", listing.PoolFeatures));

  console.log("\n💦 Spa:");
  console.log("- Present:", listing.SpaYn ? "Yes" : "No");
  console.log("- Features:", extractFeatures("SpaFeatures", listing.SpaFeatures));

  console.log("\n👀 View:");
  console.log("- Present:", listing.ViewYn ? "Yes" : "No");
  console.log("- Types:", extractFeatures("View", listing.View));

  await client.close();
}

run().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
