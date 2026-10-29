---
title: Cloudinary — scaling agent photo uploads
status: current
last_verified: 2026-10-28
related: [./README.md, ../multi-tenant/README.md]
---

# Cloudinary — scaling agent photo uploads

## TL;DR

Agents can now upload photos straight into CMS articles and pages (editor
image button, paste, or drag-and-drop → `POST /api/upload` with
`type: "content"`). Every agent is a new source of images, so Cloudinary
storage, bandwidth and transformation usage will grow with the number of
agents. What's in place today keeps each upload small and attributable; the
roadmap below is what to do before volume makes it expensive.

## What's in place (2026-10-28)

| Guard | Where | Why |
|---|---|---|
| Images only, ≤ 4 MB | `src/app/api/upload/route.ts` (all types) + editor pre-check | Non-images and huge files were accepted before; Vercel rejects bodies > 4.5 MB anyway |
| Per-agent folder `jpsrealtor/agents/{userId}/content` | `type: "content"` in the upload route | One tenant's media can be counted, capped or deleted without touching anyone else's |
| Downscale on the way in (≤ 2000 px wide, `quality: auto:good`) | same — an *incoming* transformation | The stored original is web-sized; phone photos are often 4000 px+ |
| Delivered with `f_auto` / `q_auto` | `uploadImage()` in `src/lib/cloudinary.ts` | Modern formats + right-sized quality per browser |

Older uploads (featured images, OG images) still go to shared
`jpsrealtor/articles/...` folders and are not attributed to an agent.

## Where cost comes from as we scale

1. **Storage** grows with every photo and never shrinks: replacing a featured
   image or deleting an article leaves the old asset in Cloudinary (orphans).
2. **Bandwidth** grows with traffic to agent sites, not with uploads.
3. **Transformations** — each new size/format variant counts.
4. **Uploads proxied through our server** cap files at 4.5 MB and spend
   function time on every upload.

## Roadmap (in order of payoff)

1. **Track every upload.** A `MediaAsset` record per upload (owner, publicId,
   bytes, where it's used). Gives per-agent usage, and is the prerequisite for
   everything below.
2. **Orphan cleanup.** A scheduled job deletes assets no article/page/profile
   references after a grace period (e.g. 30 days). Biggest storage win.
3. **Per-plan quotas.** Cap storage per agent by plan (e.g. Basic = N GB);
   refuse uploads over the cap with a clear message.
4. **Direct signed uploads.** Browser → Cloudinary using a short-lived
   signature from our API that locks the folder to the agent. Removes the
   4.5 MB limit and our server from the upload path.
5. **Watch the bill monthly.** Check Cloudinary's usage report; act on the
   next step when usage passes ~75% of the plan's monthly credits.
6. **If Cloudinary cost outgrows its value:** keep originals in cheap object
   storage with no egress fees (Cloudflare R2 or S3) and use Cloudinary only
   to transform/deliver (its "fetch"/auto-upload mapping), or move delivery to
   Cloudflare Images. Cloudinary sub-accounts per tenant are another option on
   higher plans.

## Related

- The review queue tracks a publicly exposed Cloudinary secret (D1,
  `docs/review/README.md`) — rotate it before upload volume grows.
- Listing photos are NOT on Cloudinary (served from synced MLS media).
