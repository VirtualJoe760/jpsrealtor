---
title: ChatRealty Content Templates
last_verified: 2026-06-05
owner: content
---

# Content Templates

Canonical templates for generating real-estate content on the ChatRealty
platform. Each template has a stable name; future requests like *"create
a simple-luxury carousel for 75890 Topaz Lane"* resolve through the
registry in [`scripts/content-templates/index.js`](../../scripts/content-templates/index.js).

Templates are **storage-agnostic** — all source photos, generated
artifacts, captions, and manifests live in Cloudinary under
`jpsrealtor/content/<slug>/`. Local `temp-images/<slug>/` is a *cache*
that auto-populates from Cloudinary on demand and is safe to delete.

| Template | Status | Output | First listing |
|---|---|---|---|
| `simple-luxury-carousel` | production | 10-slide IG carousel | 48750 El Nido |
| `staging-timelapse-reel` | wip | ~45s 9:16 IG Reel | 1 Makena Lane |

---

## `simple-luxury-carousel`

10-slide editorial Instagram carousel for a single luxury listing.

### Slide structure (1080×1350, 4:5 portrait)

| # | Slide | Source |
|---|---|---|
| 1 | Cover — left accent panel + Joseph headshot, hook + price + address + body | listing's primary photo |
| 2–5 | 4 staged shots — Joseph composited into each room with banner label | curated interior/exterior photos via Gemini staging |
| 6 | CMA infographic — subdivision/city sales stats, listing price contextualized | `search_closed_listings` MCP data |
| 7–9 | 3 cream-bg text posts — story, qualities-of-an-agent, pricing context | hand-authored per listing |
| 10 | eXp CTA card — Joseph headshot, DRE, italic close, @instadella | shared template |

### Inputs

```js
// scripts/data/carousels/<slug>.js
module.exports = {
  slug: "75890-topaz",
  color: "5A2A2E",          // hex without # — banner accent
  handle: "@instadella",
  cover: {
    hook: "ON THE FAIRWAY",
    city: "INDIAN WELLS",
    price: "$4,900,000",
    addressLine1: "75890 TOPAZ LANE",
    addressLine2: "INDIAN WELLS, CA",
    listingCredit: "Listed by ...",
    specs: "4 BD  |  4 BA  |  4,698 SQFT",
    body: "...",
    agentName: "JOSEPH SARDELLA",
    headshotPublicId: "headshots:head-shot-2026",
    sourcePhoto: "photo-01.jpg",
  },
  staged: [
    { n: 2, photo, room, pose, expression, label, caption },
    // ...4 entries total
  ],
  cma: { scope, period, stats: [{value,label}×4], listingLabel, listingPrice, pitch, color },
  textPosts: [
    { n: 7, paragraphs: [...], italicLast: "..." },
    // 3 entries
  ],
  cta: {
    label: "WHY WORK WITH ME",
    agentName: "JOSEPH SARDELLA",
    agentLicense: "DRE 02106916",
    paragraphs: [...],
    italicLast: "DM me. Let's ...",
    handle: "@instadella",
    headshotPublicId: "jpsrealtor:agents:joseph-circular",
    brokerLogoPublicId: "jpsrealtor:logos:EXP-white-square",
    color,
  },
};
```

### Invocation

```bash
node scripts/carousel-build.js <slug>               # full 10-slide build
node scripts/carousel-rebuild-bookends.js <slug>    # rebuild only cover + CTA (no Gemini)
node scripts/carousel-rebuild-static.js <slug>      # rebuild everything except staged
node scripts/carousel-upload-and-publish.js <slug>  # publish to IG
```

### Outputs (Cloudinary)

```
jpsrealtor/content/<slug>/
  source/                photo-NN.jpg               (listing photos)
  generated/slides/      slide-NN.jpg               (10 final slides)
  meta/caption.txt                                  (IG caption with hashtags)
```

### Cost & timing

- ~$0.05 per build (Gemini staging × 4)
- ~45 seconds end-to-end

### Reference listings

- `48750-el-nido` (The Lodge) — first carousel shipped
- `77655-iroquois` (IWCC)
- `78890-lima` (The Citrus)
- `81193-columbus` (Madison Club)

---

## `staging-timelapse-reel`

~45-second 9:16 Instagram Reel showing a luxury listing transforming
from empty rooms to fully staged spaces, intercut with smooth
forward-dolly transitions and ending on a sunset shot.

### Storyboard (9 shots, ~5s each, with narration overlay)

| Time | Shot type | Source |
|---|---|---|
| 0:00–0:04 | opening dolly | exterior approach |
| 0:04–0:12 | **timelapse** | empty → staged great room |
| 0:12–0:15 | dolly transition | hallway with depth |
| 0:15–0:22 | **timelapse** | empty → staged kitchen |
| 0:22–0:25 | dolly transition | hallway with depth |
| 0:25–0:31 | **timelapse** | empty → staged primary |
| 0:31–0:34 | dolly transition | doorway to outside |
| 0:34–0:40 | **timelapse** | empty → staged pool deck |
| 0:40–0:45 | sunset finale | twilight close, fade to black |

### Pipeline

1. **Narration**: ElevenLabs from a per-listing script in `scripts/data/narration/<slug>.txt`. Measure duration with ffprobe; that's the audio timeline.
2. **Empty rooms**: Gemini 2.5 Flash Image (NanoBanana) strips furniture from the 4 timelapse source photos while preserving architecture.
3. **Video clips**: WAN 2.2 FLF2V via ComfyUI on RunPod Serverless (target). Each timelapse = (empty, staged) keyframe pair. Each dolly = single keyframe + forward camera motion prompt. Sunset = slow drift.
4. **Stitch**: ffmpeg concatenates clips to match narration timeline, overlays audio, adds fade-to-black, exports H.264 MP4.

### Inputs

```js
// scripts/data/reels/<slug>.js
module.exports = {
  slug: "1-makena",
  listingKey: "...",
  address: "...",
  shots: [
    { id, type: "dolly"|"timelapse", photo, duration, lumaPrompt, roomDesc? },
    // ...9 entries
  ],
  narrationFile: "narration.mp3",
  narrationDurationSec: 39.73,
  totalDurationSec: 45,
};

// scripts/data/narration/<slug>.txt
// ~85 words, plain text for ElevenLabs.
```

### Invocation

```bash
node scripts/generate-narration.js <slug> [voice_id]   # ElevenLabs → mp3
node scripts/reel-prep-empties.js <slug>               # NanoBanana → 4 empty pngs
node scripts/reel-kickoff-comfyui.js <slug>            # RunPod ComfyUI → 9 mp4s   (planned)
node scripts/reel-stitch.js <slug>                     # ffmpeg → final mp4         (planned)
```

### Outputs (Cloudinary)

```
jpsrealtor/content/<slug>/
  source/                photo-NN.jpg
  generated/empties/     <shot-id>.png
  generated/clips/       <shot-id>.mp4
  generated/narration.mp3
  generated/reel-final.mp4
  meta/manifest.json
  meta/caption.txt
```

### Cost & timing comparison

| Provider | Per reel | Quality | Notes |
|---|---|---|---|
| Kling Pro v1-6 + Std v1 | ~$2.50 | known good | works today, requires account top-up |
| Luma Dream Machine ray-2 | ~$2.50 | known good | requires separate Dream Machine API key |
| **RunPod 4090 Serverless + WAN 2.2 + Lightning LoRA** | **~$0.25** | TBD | target architecture |
| RunPod H100 Pod + WAN 2.2 | ~$0.45 | TBD | spike option |

End-to-end: ~10 minutes (narration < 5s, empties < 10s, 9 video gens ~5–10 min parallel, stitch ~30s).

### Reference listings

- `1-makena` (Makena, Rancho Mirage) — first reel in progress

---

## Storage layer

All templates use [`scripts/lib/content-storage.js`](../../scripts/lib/content-storage.js):

```js
const { storage } = require("./scripts/lib/content-storage");
const s = storage("1-makena");

await s.putLocal("originals/photo-00.jpg", "source/photo-00.jpg"); // upload
const url = s.url("source/photo-00.jpg");                          // delivery URL
await s.ensureLocal("source/photo-00.jpg");                        // download to cache
```

### Folder convention

```
jpsrealtor/content/<slug>/
  source/        — pulled MLS photos, agent assets needed for the build
  generated/     — pipeline outputs (slides, clips, audio, final files)
  meta/          — captions, manifests, configs (Cloudinary raw resources)
```

### Why Cloudinary as source of truth

- The MCP server will eventually self-host (Phase 2 of the platform plan).
- Workers/queues for video generation may run on RunPod, Modal, or other ephemeral compute.
- Any node in the pipeline (Joseph's laptop today, a containerized worker tomorrow) can read/write the same content addressable by `<slug>/<key>` without filesystem coupling.
- Local `temp-images/` remains as a free dev cache for iteration speed but is not load-bearing.

---

## Migration script

[`scripts/migrate-temp-images-to-cloudinary.js`](../../scripts/migrate-temp-images-to-cloudinary.js)

One-shot upload of an existing `temp-images/<slug>/` folder to Cloudinary.
Used once on 2026-06-05 to lift the 4 production carousels and the in-progress
1-Makena reel into cloud storage.

```bash
node scripts/migrate-temp-images-to-cloudinary.js              # 5 active slugs
node scripts/migrate-temp-images-to-cloudinary.js <slug>       # one slug
node scripts/migrate-temp-images-to-cloudinary.js --all        # everything in temp-images
```
