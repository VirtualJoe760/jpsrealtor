/**
 * Build ONE complete carousel and drop it in the agent's review queue.
 *
 * This is the generator the Sun/Tue/Thu cron will call. Running it by hand is
 * the same code path the automation will use — deliberately, so the thing that
 * gets tested is the thing that ships.
 *
 *   npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts <slug>
 *
 * Slugs and their copy live in scripts/data/pending/<slug>.ts. The copy is
 * hand-written per listing on purpose (docs/content-templates/auto-posting.md):
 * everything else here is mechanical, but the words have to sound like the
 * agent.
 *
 * Pipeline:
 *   look at photos  → selectStagingPhotos narrows the set
 *   stage           → scripts/stage_geometric.py: read → crop → depth/floor →
 *                     render the agent USING the room → geometry + identity gates
 *   band            → room label + caption over each surviving photo
 *   cover           → simple-luxury
 *   cma             → only when the subdivision actually has closed-sale stats
 *   text + cta      → from the config
 *   queue           → PendingPost, status awaiting_review
 */
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";
import { selectStagingPhotos } from "../src/lib/content/select-staging-photos";
import { stageGeometric } from "../src/lib/content/stage-geometric";
import { buildSimpleLuxuryTransformations } from "../src/lib/cover-templates/simple-luxury";

const {
  buildBannerTransform,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
} = require("../src/lib/cover-templates/carousel-slides.js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const HEADSHOT_URL =
  "https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/headshots/head-shot-2026.png";
const HEADSHOT_ID = "headshots/head-shot-2026";
const BROKER_LOGO_ID = "jpsrealtor/logos/EXP-Black-square";
const HANDLE = "@instadella";
const AGENT_EMAIL = "josephsardella@gmail.com";

async function b64(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const buf = await r.arrayBuffer();
  const ct = r.headers.get("content-type") || "";
  return {
    data: Buffer.from(buf).toString("base64"),
    mimeType: ct.startsWith("image/") ? ct : "image/jpeg",
  };
}

function money(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? "$" + Math.round(v).toLocaleString("en-US") : "";
}
function compact(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (v >= 10_000) return "$" + Math.round(v / 1000) + "K";
  return "$" + Math.round(v).toLocaleString("en-US");
}
function code() {
  const L = "ABCDEFGHJKLMNPQRTUVWXYZ";
  const D = "23456789";
  return L[Math.floor(Math.random() * L.length)] + D[Math.floor(Math.random() * D.length)];
}

(async () => {
  const slug = process.argv[2];
  if (!slug) throw new Error("usage: build-pending-post.ts <slug> [--exclude 3,7,12]");

  // Photos already used for this listing. A second post about the same house
  // that reuses the same four frames reads as a repost, so rebuilds take a
  // fresh set — and a rejected frame is worth excluding too, since the reasons
  // (no floor, nothing to use) tend to be properties of the photo.
  const exArg = process.argv.indexOf("--exclude");
  const EXCLUDE = new Set<number>(
    exArg > -1 ? (process.argv[exArg + 1] || "").split(",").map(Number).filter(Number.isFinite) : []
  );
  if (EXCLUDE.size) console.log(`   excluding photos: ${[...EXCLUDE].join(", ")}`);
  const CFG = require(`./data/pending/${slug}`).default ?? require(`./data/pending/${slug}`);

  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;

  const listing: any = await db
    .collection("unifiedlistings")
    .findOne({ listingKey: CFG.listingKey });
  if (!listing) throw new Error(`listing ${CFG.listingKey} not found`);

  const user: any = await db.collection("users").findOne({ email: AGENT_EMAIL });
  const photoUrls: string[] = (listing.media || [])
    .map((m: any) => m.MediaURL || m.uri2048 || m.url)
    .filter(Boolean);

  const addr = String(listing.unparsedAddress || "").split(",")[0].trim();
  console.log(`\n=== ${addr} — ${money(listing.listPrice)} (${photoUrls.length} photos) ===`);

  // ---- 1. LOOK -----------------------------------------------------------
  console.log("1. looking at photos…");
  // Ask for MORE candidates than we need. Preservation is probabilistic even
  // with the rewritten prompt — measured across two listings, one passed 3 of 4
  // and the next only 1 of 4 — so the pipeline needs spare frames to fall back
  // on rather than failing the whole post.
  const WANT_SLIDES = 4;
  // Sample wide. With 87 photos on this listing a narrow sample keeps landing
  // on the same handful, and excluding those then leaves nothing.
  const picked = await selectStagingPhotos({ photoUrls, want: 14, sample: 48 });
  const selected = picked.selected.filter((s) => !EXCLUDE.has(s.index));
  for (const s of selected.slice(0, WANT_SLIDES + 4)) console.log(`   #${s.index} ${s.room}`);
  if (selected.length === 0) throw new Error("no stageable photos left after exclusions");

  // ---- 2. STAGE (geometric) ----------------------------------------------
  // Handed wholesale to scripts/stage_geometric.py, which reads each photo
  // BEFORE cropping, proves a standing spot against a fitted floor plane,
  // renders the agent USING the room (or reacting at the frame edge when there
  // is nothing worth using), and verifies identity with ArcFace. See
  // docs/content-templates/actor-generation.md.
  //
  // Everything the old block did here — placement prose, posture rotation,
  // room-preservation QC — is now either structural or a numeric gate inside
  // that script, so none of it is duplicated on this side.
  const staged: Array<{ url: string; publicId: string; room: string; index: number;
                        feature?: string; action?: string }> = [];

  const jobs = selected.slice(0, WANT_SLIDES + 5).map((s) => ({
    photoUrl: photoUrls[s.index],
    index: s.index,
  }));
  console.log(`2. staging ${jobs.length} candidates for ${WANT_SLIDES} slots…`);

  const results = await stageGeometric(jobs, {
    onProgress: (line) => console.log("   " + line),
  });

  const usedRooms = new Set<string>();
  for (const r of results) {
    if (staged.length >= WANT_SLIDES) break;
    if (!r.ok || !r.png) {
      console.log(`   #${r.index} rejected — ${r.error}`);
      continue;
    }
    const room = r.room || "room";
    if (usedRooms.has(room)) {
      console.log(`   #${r.index} skipped — already have a ${room}`);
      continue;
    }
    const up = await cloudinary.uploader.upload(
      "data:image/png;base64," + r.png.toString("base64"),
      { folder: `jpsrealtor/pending/${slug}/staged` }
    );
    console.log(`   #${r.index} PASS (${room}, ${r.tier}) — ${r.action}`);
    staged.push({ url: up.secure_url, publicId: up.public_id, room, index: r.index,
                  feature: r.feature, action: r.action });
    usedRooms.add(room);
  }

  if (staged.length === 0) throw new Error("no photo survived staging");
  if (staged.length < WANT_SLIDES) {
    console.log(`   only ${staged.length}/${WANT_SLIDES} slides survived — continuing`);
  }

  // ---- 4. BAND ------------------------------------------------------------
  console.log("3. banding rooms…");

  // Labels come from the room that was ACTUALLY staged, never from position in
  // the config. Photos are chosen dynamically and rejected takes shift
  // everything after them: a rejected game room promoted a bedroom into slot 4,
  // and the positional label shipped a dining nook captioned "THE GAME ROOM"
  // and a bedroom captioned "THE POOL DECK".
  const ROOM_LABELS: Record<string, string> = {
    living: "THE GREAT ROOM",
    kitchen: "THE KITCHEN",
    dining: "THE DINING ROOM",
    primary_bedroom: "THE PRIMARY",
    bedroom: "THE BEDROOM",
    game_room: "THE GAME ROOM",
    office: "THE OFFICE",
    outdoor_living: "OUTDOOR LIVING",
    pool: "THE POOL DECK",
    exterior: "THE GROUNDS",
    other: "INSIDE",
  };

  // The photo reader and the hand-written configs use different vocabularies
  // for the same rooms, so room-keyed lookup silently missed and fell through
  // to the spare line: an outdoor deck and a great room both shipped captioned
  // "Beamed ceilings, arched windows". Keying by room only works if both sides
  // agree what a room is called.
  const ROOM_ALIASES: Record<string, string> = {
    great_room: "living",
    outdoor: "pool",
    outdoor_living: "pool",
    bedroom: "primary_bedroom",
    office: "living",
    other: "living",
  };
  const norm = (r: string) => ROOM_ALIASES[r] || r;

  const roomSlides = staged.map((st) => {
    // Caption is looked up by room, falling back to any spare line rather than
    // to whatever happened to sit at this index.
    const key = norm(st.room);
    // `r.label === ROOM_LABELS[st.room]` was the real caption bug, not the
    // vocabulary mismatch: config rows carry no `label`, and an unmapped room
    // gives no label either, so the comparison was `undefined === undefined`
    // and matched the FIRST row every time. A balcony and a garage both
    // inherited the living room's line while looking like a successful lookup.
    const byRoom = (CFG.rooms || []).find(
      (r: any) =>
        norm(r.room) === key ||
        (r.label != null && ROOM_LABELS[st.room] != null && r.label === ROOM_LABELS[st.room])
    );
    const label = ROOM_LABELS[st.room] || ROOM_LABELS[key] || "INSIDE";
    const caption = byRoom?.caption || CFG.fallbackCaption || "";
    if (!byRoom) console.log(`   note: no caption written for "${st.room}" — using the spare line`);
    return {
      url: cloudinary.url(st.publicId, { transformation: buildBannerTransform(label, caption) }),
      publicId: st.publicId,
      kind: "room" as const,
    };
  });

  // ---- 5. COVER -----------------------------------------------------------
  console.log("4. cover…");
  const coverSrc = await cloudinary.uploader.upload(photoUrls[CFG.coverPhotoIndex ?? selected[0].index], {
    folder: `jpsrealtor/pending/${slug}/cover`,
  });
  const beds = listing.bedroomsTotal ?? listing.bedsTotal;
  const baths = listing.bathroomsTotalInteger ?? listing.bathsTotal;
  const specs = [beds && `${beds} BD`, baths && `${baths} BA`, listing.livingArea && `${Number(listing.livingArea).toLocaleString()} SQFT`]
    .filter(Boolean).join("  |  ");
  const credit = listing.listAgentName && listing.listOfficeName
    ? `Listed by ${listing.listAgentName}  ·  ${listing.listOfficeName}` : "";
  const coverUrl = cloudinary.url(coverSrc.public_id, {
    transformation: buildSimpleLuxuryTransformations({
      basePhotoPublicId: coverSrc.public_id,
      headshotPublicId: HEADSHOT_ID,
      hook: CFG.hook,
      city: String(listing.city || "").toUpperCase(),
      price: money(listing.listPrice),
      addressLine1: addr.toUpperCase(),
      addressLine2: `${listing.city}, ${listing.stateOrProvince}`.toUpperCase(),
      specs,
      body: CFG.coverBody,
      listingCredit: credit,
      accentColor: CFG.accentColor,
    } as any),
  });

  // ---- 6. CMA (only with real numbers) -----------------------------------
  const slides: any[] = [{ n: 1, kind: "cover", url: coverUrl, publicId: coverSrc.public_id }];
  roomSlides.forEach((r) => slides.push({ n: slides.length + 1, kind: "room", url: r.url, publicId: r.publicId }));

  const sub: any = listing.subdivisionName && !/not applicable|not in a development/i.test(listing.subdivisionName)
    ? await db.collection("subdivisions").findOne({
        name: new RegExp(`^${String(listing.subdivisionName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        city: new RegExp(`^${String(listing.city).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      })
    : null;
  const closed = sub?.cmaStats?.closed;
  if (closed?.count) {
    console.log(`5. CMA — ${sub.name}: ${closed.count} closed`);
    const subj = Number(listing.listPrice);
    slides.push({
      n: slides.length + 1, kind: "cma",
      url: cloudinary.url("sample", {
        transformation: buildCmaTransformation({
          color: CFG.accentColor,
          scope: String(sub.name).toUpperCase(),
          period: `LAST ${sub.cmaStats?.sampleWindow?.months || 12} MONTHS`,
          stats: [
            { value: String(closed.count), label: "HOMES SOLD" },
            { value: compact(closed.medianClosePrice), label: "MEDIAN CLOSE" },
            { value: compact(closed.medianPricePerSqft), label: "PRICE / SQFT" },
            { value: compact(closed.maxClosePrice), label: "TOP CLOSE" },
          ],
          listingLabel: "THIS LISTING",
          listingPrice: money(subj),
          pitch: subj >= closed.medianClosePrice
            ? `Above the recent median in ${sub.name}. Below the top close.`
            : `Below the recent median in ${sub.name}.`,
        }, HANDLE),
      }),
      publicId: null,
    });
  } else {
    console.log("5. CMA — skipped (no closed-sale stats for this subdivision)");
  }

  // ---- 7. TEXT + CTA ------------------------------------------------------
  console.log("6. text slides + CTA…");
  for (const t of CFG.textPosts) {
    slides.push({
      n: slides.length + 1, kind: "text",
      url: cloudinary.url("sample", { transformation: buildTextPostTransformation(t, HANDLE) }),
      publicId: null,
    });
  }
  slides.push({
    n: slides.length + 1, kind: "cta",
    url: cloudinary.url("sample", {
      transformation: buildCtaTransformation({
        color: CFG.accentColor,
        label: "WHY WORK WITH ME",
        agentName: String(user?.name || "").toUpperCase(),
        agentLicense: `DRE ${user?.agentProfile?.licenseNumber || user?.licenseNumber}`,
        paragraphs: CFG.cta.paragraphs,
        italicLast: CFG.cta.italicLast,
        handle: HANDLE,
        headshotPublicId: HEADSHOT_ID,
        brokerLogoPublicId: BROKER_LOGO_ID,
      }),
    }),
    publicId: null,
  });

  // ---- 8. QUEUE -----------------------------------------------------------
  const approvalCode = code();
  const r = await db.collection("pendingposts").insertOne({
    agentId: user._id,
    template: "simple-luxury-carousel",
    status: "awaiting_review",
    listingKey: CFG.listingKey,
    listingSnapshot: {
      address: addr, city: listing.city, price: money(listing.listPrice),
      beds, baths, sqft: listing.livingArea,
      listAgentName: listing.listAgentName, listOfficeName: listing.listOfficeName,
    },
    slides, caption: CFG.caption,
    approvalCode, approvedAt: null, approvedVia: null, declinedAt: null, declineReason: null,
    scheduledFor: null, rollCount: 0, notifiedAt: null, remindedAt: null,
    postedAt: null, igPostId: null, permalink: null, error: null, assetsDeletedAt: null,
    generation: {
      photoIndexes: staged.map((s) => s.index),
      poses: selected.map((s) => s.placementDetail),
      hook: CFG.hook, accentColor: CFG.accentColor, attempt: 1,
    },
    createdAt: new Date(), updatedAt: new Date(),
  });

  console.log(`\nQUEUED  ${slides.length} slides  code ${approvalCode}  id ${r.insertedId}`);
  await mongoose.disconnect();
})().catch((e) => { console.error("\nfatal:", e.message); process.exit(1); });
