//src\app\utils\spark\photos.ts

const SPARK_API_BASE = "https://replication.sparkapi.com/v1/listings";

async function fetchWithBackoff(url: string, token: string, retries = 5): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.status !== 429) return res;

    const delay = Math.pow(2, attempt) * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Exceeded retry limit for ${url}`);
}

export async function fetchListingPhotos(slug: string) {
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token) throw new Error("Missing SPARK_ACCESS_TOKEN");

  const url = `${SPARK_API_BASE}/${slug}/photos`;

  try {
    const res = await fetchWithBackoff(url, token);
    const text = await res.text(); // Read raw response body

    if (!res.ok) {
      console.error("📛 Spark photo fetch failed:");
      console.error(`URL: ${url}`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${text}`);
      throw new Error(`Failed to fetch photos for listing ${slug}`);
    }

    const data = JSON.parse(text);
    return data?.D?.Results || [];
  } catch (error) {
    console.error("❌ Error in fetchListingPhotos:", error);
    throw error;
  }
}
