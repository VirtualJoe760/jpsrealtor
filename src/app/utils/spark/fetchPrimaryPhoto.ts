// src/app/utils/spark/photos.ts

const SPARK_API_BASE = "https://replication.sparkapi.com/v1/listings";

export async function fetchListingPhotos(listingId: string) {
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token) throw new Error("Missing SPARK_ACCESS_TOKEN");

  const url = `${SPARK_API_BASE}/${listingId}/photos`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text(); // Always read raw text for better error logs

    if (!res.ok) {
      console.error("📛 Spark photo fetch failed:");
      console.error(`URL: ${url}`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${text}`);
      return [];
    }

    const data = JSON.parse(text);
    return data?.D?.Results || [];
  } catch (error) {
    console.error("❌ Error in fetchListingPhotos:", error);
    return [];
  }
}
