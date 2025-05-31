// src/app/utils/spark/fetchFullListingDetails.ts

export async function fetchFullListingDetails(listingId: string) {
    const token = process.env.SPARK_ACCESS_TOKEN;
    if (!token) throw new Error("Missing SPARK_ACCESS_TOKEN");
  
    const url = `https://replication.sparkapi.com/v1/listings/${listingId}?_expand=Photos,Videos,VirtualTours,OpenHouses,Documents,Rooms,Units,CustomFields`;
  
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
        console.error("📛 Spark full listing fetch failed:", res.status, text);
        throw new Error("Failed to fetch full listing data");
      }
  
      const data = JSON.parse(text);
      return data?.D?.Results?.[0] || null;
    } catch (error) {
      console.error("❌ Error in fetchFullListingDetails:", error);
      throw error;
    }
  }
  