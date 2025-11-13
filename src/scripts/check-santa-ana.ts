import mongoose from "mongoose";
import Subdivision from "../models/subdivisions";
import { config } from "dotenv";
import * as path from "path";

const envPath = path.join(__dirname, "../../.env.local");
config({ path: envPath });

async function checkSantaAna() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const subdivisions = await Subdivision.find({ 
    city: { $regex: /^Santa Ana$/i } 
  })
    .select('name city listingCount avgPrice')
    .sort({ listingCount: -1 })
    .lean();
  
  console.log(`\nSanta Ana has ${subdivisions.length} subdivisions:\n`);
  subdivisions.forEach((sub: any) => {
    console.log(`  - ${sub.name}: ${sub.listingCount} listings, Avg: $${Math.round(sub.avgPrice/1000)}k`);
  });
  
  await mongoose.disconnect();
}

checkSantaAna().catch(console.error);
