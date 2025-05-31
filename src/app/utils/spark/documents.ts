// /utils/spark/documents.ts

const SPARK_API_BASE = "https://replication.sparkapi.com/v1/listings";

export async function fetchListingDocuments(listingId: string) {
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token) throw new Error("Missing SPARK_ACCESS_TOKEN");

  const res = await fetch(`${SPARK_API_BASE}/${listingId}/documents`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch documents for listing ${listingId}`);
  }

  const data = await res.json();
  return data.D?.Results || [];
}
