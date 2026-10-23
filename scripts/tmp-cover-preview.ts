// Scratch: render simple-luxury cover previews for candidate photos + accents.
// No Gemini, no PendingPost — just Cloudinary transforms so the cover can be
// judged before an expensive staging build. Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { buildSimpleLuxuryTransformations } from "../src/lib/cover-templates/simple-luxury";
import { listingCredits } from "../src/lib/spark-roster";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const HEADSHOT_ID = "headshots/head-shot-2026";

(async () => {
  const [key, hook, body, outDir, idxCsv, colorCsv] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db as any;
  const l = await db.collection("unifiedlistings").findOne({ listingKey: key });
  const urls = (l.media || []).map((m: any) => m.uri2048 || m.uriLarge || m.uri1600);
  const addr = [l.streetNumber, l.streetName, l.unitNumber ? "#" + l.unitNumber : ""].filter(Boolean).join(" ");
  const beds = l.bedroomsTotal ?? l.bedsTotal;
  const baths = l.bathroomsTotalInteger ?? l.bathsTotal;
  const specs = [beds && `${beds} BD`, baths && `${baths} BA`, l.livingArea && `${Number(l.livingArea).toLocaleString()} SQFT`].filter(Boolean).join("  |  ");
  const credits = await listingCredits(db, l);
  const names = [credits.primary?.name, credits.secondary?.name].filter(Boolean);
  const credit = names.length && l.listOfficeName ? `Listed by ${names.join("  &  ")}  ·  ${l.listOfficeName}` : "";
  console.log("credit:", credit);

  for (const i of idxCsv.split(",").map(Number)) {
    const up = await cloudinary.uploader.upload(urls[i], { folder: `jpsrealtor/tmp/coverpreview` });
    for (const c of colorCsv.split(",")) {
      const u = cloudinary.url(up.public_id, {
        transformation: buildSimpleLuxuryTransformations({
          basePhotoPublicId: up.public_id, headshotPublicId: HEADSHOT_ID,
          hook, city: String(l.city).toUpperCase(), price: "$" + Number(l.listPrice).toLocaleString("en-US"),
          addressLine1: addr.toUpperCase(), addressLine2: `${l.city}, ${l.stateOrProvince}`.toUpperCase(),
          specs, body, listingCredit: credit, accentColor: c,
        } as any),
      });
      const r = await fetch(u);
      if (!r.ok) { console.log(`#${i} ${c} FAIL ${r.status}`, (await r.text()).slice(0,200)); continue; }
      const p = `${outDir}/cover-${i}-${c}.jpg`;
      fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
      console.log("wrote", p);
    }
    await cloudinary.uploader.destroy(up.public_id).catch(() => {});
  }
  await mongoose.disconnect();
})();
