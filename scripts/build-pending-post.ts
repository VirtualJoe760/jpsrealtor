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
import { listingCredits } from "../src/lib/spark-roster";
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
// The approval code is what Joseph texts back — `POST L6` — so two live posts
// sharing one is not a cosmetic problem, it is an ambiguous instruction to
// publish. A blind draw could not avoid that: the alphabet is 23 letters by 8
// digits, 184 codes, and with ~22 posts sitting in the queue the birthday odds
// of a clash are already better than even. They had duly happened twice —
// 2800 E Vista Chino and 71817 Samarkand Drive both hold R4, and this listing
// drew Hepburn Drive's L6 on its first build. So the draw now excludes what is
// already awaiting review, and widens to three characters rather than looping
// forever if the space is ever genuinely full.
function code(taken: Set<string> = new Set()) {
  const L = "ABCDEFGHJKLMNPQRTUVWXYZ";
  const D = "23456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  for (let i = 0; i < 500; i++) {
    const c = pick(L) + pick(D);
    if (!taken.has(c)) return c;
  }
  for (let i = 0; i < 500; i++) {
    const c = pick(L) + pick(D) + pick(D);
    if (!taken.has(c)) return c;
  }
  throw new Error("could not find a free approval code");
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

  // On a unit-numbered listing this feed puts the unit in its OWN comma
  // segment — 5803 Los Santos Drive #19 arrives as "5803 Los Santos Drive, 19,
  // Palm Springs, CA 92264" — so `split(",")[0]` was silently dropping it and
  // the cover named the building rather than the door. 78250 Cortez Lane #129
  // and 255 S Avenida Caballeros #313 are already queued that way.
  //
  // The unit goes on address line 2 with the city, not appended to line 1.
  // Line 1 is 28pt inside a 480px panel with line 2 fixed 40px under it, so a
  // wrap there overprints the city; see the note in simple-luxury.ts. Line 2 is
  // 20pt and has the room.
  const streetLine = String(listing.unparsedAddress || "").split(",")[0].trim();
  const unit = String(listing.unitNumber ?? listing.streetAdditionalInfo ?? "").trim();
  const addr = streetLine;
  const cityLine = [unit && `#${unit}`, `${listing.city}, ${listing.stateOrProvince}`]
    .filter(Boolean).join("  ·  ");
  console.log(`\n=== ${[streetLine, unit && `#${unit}`].filter(Boolean).join(" ")} — ${money(listing.listPrice)} (${photoUrls.length} photos) ===`);

  // ---- 1. LOOK -----------------------------------------------------------
  console.log("1. looking at photos…");
  // Ask for MORE candidates than we need. Preservation is probabilistic even
  // with the rewritten prompt — measured across two listings, one passed 3 of 4
  // and the next only 1 of 4 — so the pipeline needs spare frames to fall back
  // on rather than failing the whole post.
  const WANT_SLIDES = 4;
  // Sample wide. With 87 photos on this listing a narrow sample keeps landing
  // on the same handful, and excluding those then leaves nothing.
  //
  // Sample ALL of them, not a prefix. selectStagingPhotos does
  // `photoUrls.slice(0, sample)`, so a fixed 48 silently discards the tail of
  // any longer set — and MLS feeds routinely put the pool and the outdoor
  // living last. 74586 Tesla Drive has 74 photos with every pool, spa and patio
  // frame at index 62+, so a 48-photo prefix offered the selector no outdoor
  // shot at all while `pool` sits third in its own room-priority list. The cap
  // is only a runaway guard: classification is ~$0.0001/photo, so the whole
  // sweep costs under a cent.
  const picked = await selectStagingPhotos({
    photoUrls,
    want: 14,
    sample: Math.min(photoUrls.length, 120),
  });
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

  // The photo reader and the hand-written configs use different vocabularies
  // for the same rooms, so room-keyed lookup silently missed and fell through
  // to the spare line: an outdoor deck and a great room both shipped captioned
  // "Beamed ceilings, arched windows". Keying by room only works if both sides
  // agree what a room is called.
  //
  // Declared HERE, above the de-duplication, because de-duplicating on the raw
  // key while captioning on the normalised one lets a pair through that the
  // caption layer then collapses. 1062 E Via San Michael queued with slides 2
  // and 5 both reading "THE GREAT ROOM / Vaulted ceilings, and room to spare
  // around the grand piano" — the stager had called one frame `great_room` and
  // the other `living`, distinct to this loop, identical by the time they were
  // labelled. Slide 5 did not even have the piano in shot. Two rooms that share
  // a caption are one room as far as the reader is concerned.
  const ROOM_ALIASES: Record<string, string> = {
    great_room: "living",
    outdoor: "pool",
    outdoor_living: "pool",
    bedroom: "primary_bedroom",
    office: "living",
    other: "living",
  };
  const norm = (r: string) => ROOM_ALIASES[r] || r;

  const usedRooms = new Set<string>();
  for (const r of results) {
    if (staged.length >= WANT_SLIDES) break;
    if (!r.ok || !r.png) {
      console.log(`   #${r.index} rejected — ${r.error}`);
      continue;
    }
    const room = r.room || "room";
    if (usedRooms.has(norm(room))) {
      console.log(`   #${r.index} skipped — already have a ${norm(room)}`);
      continue;
    }
    const up = await cloudinary.uploader.upload(
      "data:image/png;base64," + r.png.toString("base64"),
      { folder: `jpsrealtor/pending/${slug}/staged` }
    );
    console.log(`   #${r.index} PASS (${room}, ${r.tier}) — ${r.action}`);
    staged.push({ url: up.secure_url, publicId: up.public_id, room, index: r.index,
                  feature: r.feature, action: r.action });
    usedRooms.add(norm(room));
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
    // stage_geometric.py emits `outdoor`, the selector emits `outdoor_living`,
    // and only the latter had a label. The missing key fell through to
    // ROOM_LABELS[norm("outdoor")] = pool, so a covered patio on a house with
    // NO POOL was about to ship captioned "THE POOL DECK" — a false claim about
    // another brokerage's listing. 46109 Roadrunner Lane (poolYN: false) is the
    // listing that caught it.
    outdoor: "OUTDOOR LIVING",
    pool: "THE POOL DECK",
    exterior: "THE GROUNDS",
    other: "INSIDE",
  };

  // `pool` is the only label in that table that asserts a FEATURE rather than
  // naming a space, and stage_geometric.py returns it for any outdoor frame —
  // a patio, a hot-tub deck, a stretch of yard. On a listing with no pool that
  // ships a false claim about another brokerage's inventory. The `outdoor`
  // spelling of this was caught on 46109 Roadrunner Lane and fixed by giving
  // `outdoor` its own label; the `pool` spelling was still live, and 9223 N
  // Star Trail (poolYN false, spaYN true — a hot tub and a covered patio, no
  // pool anywhere) would have tripped it.
  //
  // AND `poolYN` IS NOT "THIS HOME HAS A POOL". It is true whenever the feed
  // records any pool at all, including a shared one: 28 Oak Tree is
  // `poolFeatures: "Association"` — the Mission Hills community pool, a quarter
  // mile away — and `poolYN: true`, while the condo itself has no water on the
  // lot. Reading the flag alone was about to print THE POOL DECK over a
  // golf-course patio, which is the same false claim about another brokerage's
  // inventory that Roadrunner Lane and Star Trail caught, arriving through a
  // field that reads true. So the flag is necessary and not sufficient: if
  // every pool feature named is a shared-facility one, this property has no
  // pool deck to label.
  //
  // AND THE TEST IS ABOUT OWNERSHIP, NOT ABOUT EVERY WORD IN THE FIELD. The
  // first version of this guard demanded that EVERY comma-separated token look
  // like a shared facility, which only ever worked because Oak Tree's field was
  // the single word "Association". 5803 Los Santos Drive #19 is
  // `poolFeatures: "Community, In Ground"` — the community pool, and it is in
  // the ground — so `.every()` failed on " In Ground", the whole string read as
  // private, and THE POOL DECK was about to print over an enclosed private
  // patio on a condo whose own remarks say the pools are "steps from" it. "In
  // Ground", "Gunite", "Heated", "Salt Water" and the rest describe how the
  // water was BUILT; none of them says who owns it, and a token that says
  // nothing about ownership must not be able to vote a shared pool back into
  // private. So: a shared facility named and no private one named is shared.
  const poolTokens = String(listing.poolFeatures || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  const namesShared = poolTokens.some((f) => /association|community|shared/i.test(f));
  const namesPrivate = poolTokens.some((f) => /private/i.test(f));
  const namesNone = poolTokens.length > 0 && poolTokens.every((f) => /^none$/i.test(f));
  const sharedPoolOnly = namesNone || (namesShared && !namesPrivate);
  if (!listing.poolYN || sharedPoolOnly) ROOM_LABELS.pool = "OUTDOOR LIVING";

  // ROOM_ALIASES / norm are declared above the staging de-duplication — see the
  // comment there for why they cannot live down here.
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
  // CREDIT BOTH LISTING AGENTS, one after the other. A co-listing on someone
  // else's inventory is a courtesy that costs nothing and is noticed when it's
  // missing — 53806 Ridge Road went out crediting only Peyson Robertson when
  // there was a second agent.
  //
  // The second name comes from the MLS when it names a PERSON (15,432 of the
  // 15,635 active co-listings). When the co-list slot holds a TEAM instead —
  // Ridge Road's says "The Obsidian Group" — the MLS never recorded which
  // member co-listed, so the team's own name is credited rather than a guess,
  // and the review queue carries the candidate members for a human to correct.
  // See src/lib/spark-roster.ts.
  const credits = await listingCredits(db, listing);
  const names = [credits.primary?.name, credits.secondary?.name].filter(Boolean);
  const credit = names.length && listing.listOfficeName
    ? `Listed by ${names.join("  &  ")}  ·  ${listing.listOfficeName}`
    : "";
  if (credits.secondaryIsTeam) {
    console.log(`   co-list is a TEAM (${credits.secondary?.name}) — crediting the team.`);
    console.log(`   members who list under it: ${credits.teamCandidates.slice(0, 6).map((t) => t.name).join(", ")}`);
  } else if (credits.secondary) {
    console.log(`   crediting two agents: ${names.join(" & ")}`);
  }
  const coverUrl = cloudinary.url(coverSrc.public_id, {
    transformation: buildSimpleLuxuryTransformations({
      basePhotoPublicId: coverSrc.public_id,
      headshotPublicId: HEADSHOT_ID,
      hook: CFG.hook,
      city: String(listing.city || "").toUpperCase(),
      price: money(listing.listPrice),
      addressLine1: addr.toUpperCase(),
      addressLine2: cityLine.toUpperCase(),
      specs,
      body: CFG.coverBody,
      listingCredit: credit,
      accentColor: CFG.accentColor,
    } as any),
  });

  // ---- 6. CMA (only with real numbers) -----------------------------------
  const slides: any[] = [{ n: 1, kind: "cover", url: coverUrl, publicId: coverSrc.public_id }];
  roomSlides.forEach((r) => slides.push({ n: slides.length + 1, kind: "room", url: r.url, publicId: r.publicId }));

  // A CMA slide names a subdivision and attributes closed sales to it, so the
  // name has to BE a subdivision. Several feed values are placeholders meaning
  // "no subdivision", and `subdivisions` has a document for each of them, per
  // city, holding that city's miscellaneous closings — 152 docs are literally
  // named "Other". 76434 Encanto Drive is `subdivisionName: "Other"` in 29
  // Palms; there is no Other/29 Palms doc so the name+city query missed and the
  // slide was skipped by luck. Other/Desert Hot Springs, Other/Thermal,
  // Other/Palm Desert and Other/Blythe all exist and are all cities this team
  // lists in, so the next such listing would have printed a whole city's
  // unrelated sales under a heading reading OTHER. Same family as the `poolYN`
  // guard: a field that reads true through a value the guard did not name.
  //
  // Matched WHOLE-STRING, not by substring. "not applicable" is distinctive
  // enough to test loosely; "other" and "none" are not — "Mother Lode Estates"
  // is a real subdivision name and must not be struck.
  const SUBDIVISION_PLACEHOLDERS = new Set([
    "not applicable", "n/a", "na", "not in a development", "other", "unknown", "none",
  ]);
  const subName = String(listing.subdivisionName || "").trim().toLowerCase();
  const sub: any = subName && !SUBDIVISION_PLACEHOLDERS.has(subName)
    ? await db.collection("subdivisions").findOne({
        name: new RegExp(`^${String(listing.subdivisionName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        city: new RegExp(`^${String(listing.city).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      })
    : null;
  const closed = sub?.cmaStats?.closed;

  // `count` alone does not mean the slide has anything to print. Villa
  // Caballeros carries `closed: {count: 25}` and NOTHING else — no median, no
  // price/sqft, no top close — so three of the four stat tiles built as empty
  // text overlays and Cloudinary rejected the whole transformation ("Must
  // supply public_id for non-text overlay"), killing the run *after* staging
  // had already been paid for in Gemini spend.
  //
  // The crash was the lucky half of that bug. The pitch is chosen by comparing
  // the list price against those same absent numbers, and `354900 > undefined`
  // and `354900 >= undefined` are both false, so the slide had already settled
  // on "Below the median close in Villa Caballeros" — a comparative claim about
  // another brokerage's listing, measured against a median that does not exist.
  // copy-voice.md §9: market figures must come from real closed-sale data.
  //
  // So gate on the FIGURES the slide prints, not on the count that labels them.
  // `> 0` rather than merely finite: Number(null) is 0, so a null median would
  // otherwise pass the gate and print a $0 close on the one slide whose whole
  // job is real figures.
  const cmaFigures = [closed?.medianClosePrice, closed?.medianPricePerSqft, closed?.maxClosePrice];
  const cmaReady = !!closed?.count && cmaFigures.every((v) => Number(v) > 0);

  if (cmaReady) {
    console.log(`5. CMA — ${sub.name}: ${closed.count} closed`);
    const subj = Number(listing.listPrice);

    // The window label has to describe the data that is actually ON the slide.
    // `sampleWindow` is the QUERY window (12 months), but the closed set is
    // capped at `listingCap` (25) listings, so in a busy subdivision it spans
    // far less: Indian Palms' 25 most recent closings cover Apr–Jul 2026.
    // Printing "LAST 12 MONTHS" over a three-month sample misstates the sample
    // on the one slide whose whole job is real closed-sale figures
    // (copy-voice.md §9). UTC, or a midnight-UTC date lands in the prior month.
    const mon = (d: any) =>
      new Date(d)
        .toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
        .toUpperCase();
    const period =
      closed.sampleStartDate && closed.sampleEndDate
        ? `${mon(closed.sampleStartDate)} - ${mon(closed.sampleEndDate)}`
        : `LAST ${sub.cmaStats?.sampleWindow?.months || 12} MONTHS`;

    // "Below the top close" was printed for EVERY listing at or above the
    // median — including ones priced above the highest close in the
    // subdivision, which is simply false. It is live in the current pool:
    // 46109 Roadrunner Lane asks $940,000 in Westward Shadows, whose top close
    // is $900,000. On another agent's listing that is a false comparative
    // claim, so the over-the-top case drops the second sentence rather than
    // inverting it — "above every close here" is true but reads as a valuation,
    // which copy-voice.md §9 forbids just as firmly.
    // "Recent" was doing unearned work. The sample is the last `listingCap`
    // closings, however long they took to accumulate — Westward Shadows' 20 run
    // SEP 2021 to NOV 2025, so "the recent median" described a four-year window
    // as though it were this season's. The period label directly above the
    // pitch already states the window; the sentence only has to be true of it.
    // copy-voice.md §9: market figures must be described as what they are.
    const pitch =
      subj > closed.maxClosePrice
        ? `Above the median close in ${sub.name}.`
        : subj >= closed.medianClosePrice
        ? `Above the median close in ${sub.name}. Below the top close.`
        : `Below the median close in ${sub.name}.`;
    console.log(`   window ${period} — ${pitch}`);

    slides.push({
      n: slides.length + 1, kind: "cma",
      url: cloudinary.url("sample", {
        transformation: buildCmaTransformation({
          color: CFG.accentColor,
          scope: String(sub.name).toUpperCase(),
          period,
          stats: [
            { value: String(closed.count), label: "HOMES SOLD" },
            { value: compact(closed.medianClosePrice), label: "MEDIAN CLOSE" },
            { value: compact(closed.medianPricePerSqft), label: "PRICE / SQFT" },
            { value: compact(closed.maxClosePrice), label: "TOP CLOSE" },
          ],
          listingLabel: "THIS LISTING",
          listingPrice: money(subj),
          pitch,
        }, HANDLE),
      }),
      publicId: null,
    });
  } else if (closed?.count) {
    console.log(`5. CMA — skipped (${sub.name} records ${closed.count} closed but carries no figures)`);
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
  // Draw against what is actually live. Only awaiting_review and approved
  // matter: those are the two states `POST <code>` can act on. A posted or
  // declined record is history and its code is free again.
  const liveCodes = new Set<string>(
    await db.collection("pendingposts").distinct("approvalCode", {
      status: { $in: ["awaiting_review", "approved"] },
    })
  );
  const approvalCode = code(liveCodes);
  const r = await db.collection("pendingposts").insertOne({
    agentId: user._id,
    template: "simple-luxury-carousel",
    status: "awaiting_review",
    listingKey: CFG.listingKey,
    listingSnapshot: {
      address: addr, city: listing.city, price: money(listing.listPrice),
      beds, baths, sqft: listing.livingArea,
      listAgentName: listing.listAgentName, listOfficeName: listing.listOfficeName,
      credits: {
        primary: credits.primary,
        secondary: credits.secondary,
        secondaryIsTeam: credits.secondaryIsTeam,
        teamCandidates: credits.teamCandidates,
      },
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
