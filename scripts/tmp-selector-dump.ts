// Scratch: print the selector's ranked top-N for a listing so exclusions can be
// aimed at frames it will actually offer. ~$0.0001/photo. Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import mongoose from "mongoose";
import { selectStagingPhotos } from "../src/lib/content/select-staging-photos";
(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db as any;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  const urls = (l.media || []).map((m: any) => m.MediaURL || m.uri2048 || m.url).filter(Boolean);
  const r = await selectStagingPhotos({ photoUrls: urls, want: 14, sample: Math.min(urls.length, 120) });
  console.log("SELECTED (in order):");
  r.selected.forEach((s, i) => console.log(` ${String(i).padStart(2)} #${String(s.index).padStart(2)} ${s.room.padEnd(16)} ${s.placement}  appeal=${s.appeal}\n      ${s.placementDetail}`));
  console.log("\nALL STAGEABLE:", r.assessed.filter(a=>a.stageable).map(a=>`#${a.index}:${a.room}`).join(" "));
  await mongoose.disconnect();
})();
