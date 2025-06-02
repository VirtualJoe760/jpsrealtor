// 📄 src/app/utils/spark/getPublicRemarks.ts

import { config } from "dotenv";
import path from "path";

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), ".env.local") });

const BASE_URL = "https://replication.sparkapi.com/v1/listings";

/**
 * Fetches the PublicRemarks field for a listing by its ListingKey.
 * @param listingKey - The ListingKey of the listing.
 * @returns A string with the public remarks or null if not found.
 */
export async function getPublicRemarks(listingKey: string): Promise<string | null> {
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token) {
    console.error("❌ Missing SPARK_ACCESS_TOKEN");
    return null;
  }

  const url = `${BASE_URL}/${listingKey}`;

  console.log("🚀 Fetching PublicRemarks for:", listingKey);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("❌ Spark API fetch failed");
      console.error("🔗 URL:", url);
      console.error("📄 Raw response:", text);
      return null;
    }

    const json = JSON.parse(text);
    const remarks = json?.D?.Results?.[0]?.StandardFields?.PublicRemarks ?? null;

    if (remarks) {
      console.log("✅ PublicRemarks retrieved successfully");
    } else {
      console.warn("⚠️ No PublicRemarks found for this listing.");
    }

    return remarks;
  } catch (err) {
    console.error("💥 Error fetching PublicRemarks:", err);
    return null;
  }
}
