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
 *   look at photos  → selectStagingPhotos (affordance rule, per-frame placement)
 *   stage           → Gemini, edit-not-generate, native 4:5
 *   VERIFY          → verifyStagedPhoto; anything that altered the room is dropped
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
import { verifyStagedPhoto, describeImage } from "../src/lib/content/verify-staged-photo";
import { stageByComposite, type Wardrobe } from "../src/lib/content/stage-composite";

// Wardrobe follows the scene. A dark suit by the pool reads wrong; shorts in
// the formal living room reads wrong the other way.
const ROOM_WARDROBE: Record<string, Wardrobe> = {
  pool: "business_casual",
  outdoor_living: "business_casual",
  game_room: "business_casual",
  kitchen: "business_casual",
};
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

import { STAGING_BASE_PROMPT as BASE_PROMPT, POSTURE_VARIATIONS } from "../src/lib/content/staging-prompt";

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
  if (!slug) throw new Error("usage: build-pending-post.ts <slug>");
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
  const { selected } = await selectStagingPhotos({ photoUrls, want: 8, sample: 26 });
  for (const s of selected.slice(0, WANT_SLIDES)) console.log(`   #${s.index} ${s.room} — ${s.placementDetail}`);
  if (selected.length === 0) throw new Error("no stageable photos");

  // ---- 2. STAGE + 3. VERIFY ---------------------------------------------
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
  const head = await b64(HEADSHOT_URL);
  const staged: Array<{ url: string; publicId: string; room: string; index: number }> = [];

  // Retry a rejected frame before abandoning it. A rejection means THAT ROLL
  // repainted something, not that the photo is unusable — the model is
  // sampling, so the next take from the same input often preserves the room.
  const MAX_TAKES = 3;
  const usedRooms = new Set<string>();

  // Posture and expression must VARY across a batch — four standing shots read
  // as one pose with the background swapped, which is exactly what a reviewer
  // called out. Alternate seated/standing and rotate the expression, and reject
  // a take whose posture duplicates one already accepted.
  // See actor-generation.md §3c.
  const VARIATION = POSTURE_VARIATIONS;
  const usedPostures = new Set<string>();

  const COMPOSITE_POSES = [
    "STANDING, weight on one leg, hands relaxed at their sides. Warm, natural smile. Looking at the camera.",
    "STANDING, half-turned into the room, hands loosely clasped in front. Calm, easy expression. Looking into the room.",
    "WALKING, caught mid-stride, arms natural. Relaxed, candid. Looking slightly off-camera.",
    "STANDING, one hand in trouser pocket, the other relaxed. Slight laugh, mid-conversation. Looking at the camera.",
  ];

  for (const s of selected) {
    if (staged.length >= WANT_SLIDES) break;
    if (usedRooms.has(s.room)) continue; // keep the walkthrough varied

    // COMPOSITE FIRST: the actor is generated alone, matted, and planted on
    // the untouched original — the room cannot change because no image model
    // ever receives it. Falls back to edit+QC when the composite retakes run
    // out (or a contact pose is wanted for this room).
    try {
      const comp = await stageByComposite({
        photoUrl: photoUrls[s.index],
        headshotUrl: HEADSHOT_URL,
        placement: s.placementDetail,
        poseDirection: COMPOSITE_POSES[staged.length % COMPOSITE_POSES.length],
        wardrobe: ROOM_WARDROBE[s.room] || "business_professional",
      });
      const up = await cloudinary.uploader.upload(
        "data:image/png;base64," + comp.png.toString("base64"),
        { folder: `jpsrealtor/pending/${slug}/staged` }
      );
      // Figure-defect check only; room checks are moot on a composite.
      const v = await verifyStagedPhoto({ originalUrl: photoUrls[s.index], stagedUrl: up.secure_url });
      const figureIssues = (v.changes || []).filter((c) => /figure|blank band/i.test(c));
      if (figureIssues.length === 0) {
        console.log(`2. staging #${s.index} (${s.room}) COMPOSITE… PASS (room untouched by construction)`);
        staged.push({ url: up.secure_url, publicId: up.public_id, room: s.room, index: s.index });
        usedRooms.add(s.room);
        continue;
      }
      console.log(`2. staging #${s.index} (${s.room}) COMPOSITE… figure rejected — ${figureIssues[0]}`);
      await cloudinary.uploader.destroy(up.public_id).catch(() => {});
    } catch (e: any) {
      console.log(`2. staging #${s.index} (${s.room}) COMPOSITE… fell back — ${String(e.message).slice(0, 80)}`);
    }

    const src = await b64(photoUrls[s.index]);
    // Describe the ORIGINAL once per photo and reuse it across takes, so the
    // baseline cannot drift between retries of the same frame.
    let baseline: any = null;
    try { baseline = await describeImage(photoUrls[s.index]); } catch {}
    for (let take = 1; take <= MAX_TAKES; take++) {
      process.stdout.write(`2. staging #${s.index} (${s.room}) take ${take}… `);
      try {
        const res: any = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: src.data, mimeType: src.mimeType } },
                { inlineData: { data: head.data, mimeType: head.mimeType } },
                {
                  text:
                    `${BASE_PROMPT}` +
                    `\n\nWHERE TO PUT THEM IN THIS SPECIFIC PHOTOGRAPH: ${s.placementDetail}` +
                    `\n\nPOSTURE AND EXPRESSION FOR THIS SLIDE — must differ from the other slides in this set: ${VARIATION[staged.length % VARIATION.length]}`,
                },
              ],
            },
          ],
          config: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
        });
        const img = (res?.candidates?.[0]?.content?.parts || []).find((p: any) => p?.inlineData?.data);
        if (!img) throw new Error("no image returned");

        const up = await cloudinary.uploader.upload(
          `data:image/png;base64,${img.inlineData.data}`,
          { folder: `jpsrealtor/pending/${slug}/staged` }
        );

        // QC before it is allowed anywhere near the queue.
        const v = await verifyStagedPhoto({
          originalUrl: photoUrls[s.index],
          stagedUrl: up.secure_url,
          originalDescription: baseline,
        });
        if (!v.pass) {
          console.log(`rejected — ${v.changes.join("; ") || v.error}`);
          // Don't keep a rejected asset around; it must never be reachable.
          await cloudinary.uploader.destroy(up.public_id).catch(() => {});
          continue;
        }
        // "none" means the describer did not report a posture, not that two
        // slides share one — treating it as a duplicate rejected good takes.
        if (v.posture && v.posture !== "none" && usedPostures.has(v.posture) && take < MAX_TAKES) {
          console.log(`rejected — posture "${v.posture}" already used on another slide`);
          await cloudinary.uploader.destroy(up.public_id).catch(() => {});
          continue;
        }
        if (v.posture) usedPostures.add(v.posture);
        console.log("PASS" + (v.notes?.length ? `  (note: ${v.notes[0]})` : ""));
        staged.push({ url: up.secure_url, publicId: up.public_id, room: s.room, index: s.index });
        usedRooms.add(s.room);
        break;
      } catch (e: any) {
        console.log(`failed — ${e.message}`);
      }
    }
  }
  if (staged.length < 2) throw new Error(`only ${staged.length} photo(s) survived QC; need at least 2`);

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

  const roomSlides = staged.map((st) => {
    // Caption is looked up by room too, falling back to any spare line rather
    // than to whatever happened to sit at this index.
    const byRoom = (CFG.rooms || []).find(
      (r: any) => r.room === st.room || r.label === ROOM_LABELS[st.room]
    );
    const label = ROOM_LABELS[st.room] || "INSIDE";
    const caption = byRoom?.caption || CFG.fallbackCaption || "";
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
