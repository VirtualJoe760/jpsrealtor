// src/utils/spark/bighornListings.ts
import dotenv from "dotenv";
import path from "path";
import fetch from "node-fetch"; // needed for backend API route or server functions

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ACCESS_TOKEN = process.env.SPARK_ACCESS_TOKEN;
const BASE_URL = "https://replication.sparkapi.com/v1/listings";
const HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  Accept: "application/json",
};

export async function fetchBighornActiveListings(): Promise<any[]> {
  let listings: any[] = [];
  let skiptoken: string | undefined;
  let page = 1;

  while (true) {
    let url = `${BASE_URL}?_limit=1000&_filter=StandardStatus eq 'Active' and SubdivisionName eq 'Bighorn Golf Club'&_expand=Photos`;
    if (skiptoken) url += `&_skiptoken=${skiptoken}`;

    console.log(`Fetching page ${page}...`);

    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();

    if (!data?.D?.Success) {
      console.error("❌ API error:", data);
      break;
    }

    const results = data.D.Results;
    listings = listings.concat(results);

    skiptoken = data.D?.Next?.SkipToken;
    if (!skiptoken || results.length === 0) break;

    page++;
  }

  return listings;
}
