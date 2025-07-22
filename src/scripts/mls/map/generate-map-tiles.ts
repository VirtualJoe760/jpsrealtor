// src/scripts/mls/map/generate-map-tiles.ts

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import path from "path";
import fs from "fs/promises";
import Supercluster from "supercluster";
import connectDB from "@/lib/db";
import { Listing } from "@/models/listings";
import { IListing } from "@/models/listings";
import { lngLatToTile, tileToBBOX } from "@/app/utils/map/tileMath";

type GeoJSONPoint = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Record<string, any>;
};

async function generateTiles() {
  console.log("📦 Connecting to MongoDB...");
  await connectDB();

  const listings = (await Listing.find({
    latitude: { $exists: true },
    longitude: { $exists: true },
  }).lean()) as IListing[];

  console.log(`✅ Loaded ${listings.length} listings.`);

  const geoPoints: GeoJSONPoint[] = listings.map((listing) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [Number(listing.longitude), Number(listing.latitude)],
    },
    properties: {
      slug: listing.slug,
      listingKey: listing.listingKey,
      listPrice: listing.listPrice,
      city: listing.city,
      beds: listing.bedsTotal ?? listing.bedroomsTotal ?? null,
      baths: listing.bathroomsTotalDecimal ?? listing.bathroomsTotalInteger ?? null,
      photo: listing.primaryPhotoUrl ?? null,
      subdivision: listing.subdivisionName ?? null,
      yearBuilt: listing.yearBuilt ?? null,
      cluster: false,
    },
  }));

  const cluster = new Supercluster({
    radius: 60,
    maxZoom: 13,
    minZoom: 5,
  });

  cluster.load(geoPoints);

  const outputDir = path.join(process.cwd(), "public", "tiles");
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const zoomLevels = [5, 6, 7, 8, 9, 10, 11, 12, 13];
  const californiaBbox: [number, number, number, number] = [-125, 32, -113, 43];

  for (const z of zoomLevels) {
    const minTile = lngLatToTile(californiaBbox[0], californiaBbox[3], z); // west, north
    const maxTile = lngLatToTile(californiaBbox[2], californiaBbox[1], z); // east, south

    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        const bbox = tileToBBOX(x, y, z);
        const features = cluster.getClusters(bbox, z);
        if (features.length === 0) continue;

        const tilePath = path.join(outputDir, `${z}`, `${x}`);
        await fs.mkdir(tilePath, { recursive: true });

        const filePath = path.join(tilePath, `${y}.json`);
        await fs.writeFile(filePath, JSON.stringify(features), "utf8");
      }
    }

    console.log(`🧱 Finished tiles for zoom level ${z}`);
  }

  console.log("✅ Tile generation complete.");
}

generateTiles().catch((err) => {
  console.error("❌ Error generating tiles:", err);
});
