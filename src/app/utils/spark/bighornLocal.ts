// src/utils/spark/bighornLocal.ts
import { promises as fs } from "fs";
import path from "path";

type SparkListingPhoto = {
  Id: string;
  Uri300?: string;
  [key: string]: any;
};

type SparkListing = {
  Id: string;
  UnparsedAddress?: string;
  StandardStatus?: string;
  Photos?: SparkListingPhoto[];
  [key: string]: any;
};

export async function getBighornListingsFromFile(): Promise<SparkListing[]> {
  const filePath = path.resolve(process.cwd(), "bighorn_active_listings.json");

  try {
    const file = await fs.readFile(filePath, "utf-8");
    const listings: SparkListing[] = JSON.parse(file);
    return listings;
  } catch (err) {
    console.error("❌ Failed to load local listings file:", err);
    return [];
  }
}
