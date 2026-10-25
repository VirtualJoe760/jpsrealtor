// Scratch: print EVERY assessed frame with its verdict, plus the three counts
// that say whether the selector actually SAW the photos.
//
// `assessOne` swallows API failures as `null` and `selectStagingPhotos` filters
// those out, so a frame that errored and a frame the model refused are
// indistinguishable downstream — a Gemini outage reads as "this listing is thin"
// and earns a listing a permanent strike. On 2026-10-24 the selected-only dump
// of 17 Lugo Drive showed 4 stageable out of 35 frames; this script showed
// `assessed=0`, i.e. every call was 403ing. Compare `urls` with `assessed`
// BEFORE believing a low stageable count. See docs/review/README.md R8.
//
// Safe to delete once the selector distinguishes refusal from error.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import mongoose from "mongoose";
import { selectStagingPhotos } from "../src/lib/content/select-staging-photos";

(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db as any;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: process.argv[2] });
  if (!l) throw new Error(`no listing row for ${process.argv[2]}`);
  const urls = (l.media || []).map((m: any) => m.MediaURL || m.uri2048 || m.url).filter(Boolean);

  const r = await selectStagingPhotos({ photoUrls: urls, want: 14, sample: Math.min(urls.length, 120) });
  const stageable = (r.assessed as any[]).filter((a) => a.stageable).length;

  console.log(`urls=${urls.length} assessed=${r.assessed.length} stageable=${stageable}`);
  if (r.assessed.length < urls.length) {
    console.log(
      `WARNING: ${urls.length - r.assessed.length} frame(s) never came back. That is an API` +
        ` failure, not a refusal — run scripts/tmp-gemini-probe.ts for the real error` +
        ` and do NOT strike this listing on the count below.`
    );
  }
  (r.assessed as any[]).forEach((a) =>
    console.log(
      `#${String(a.index).padStart(2)} ${a.stageable ? "OK " : "NO "} ${String(a.room).padEnd(14)}` +
        ` appeal=${a.appeal} :: ${a.reason || ""}`
    )
  );
  await mongoose.disconnect();
})();
