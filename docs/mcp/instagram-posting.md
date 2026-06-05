---
title: Instagram carousel posting via MCP
status: current
last_verified: 2026-06-04
related: [./README.md, ./scopes-and-safety.md, ./tools.md]
---

# Instagram carousel posting via MCP

`post_instagram_carousel` publishes a 2-10 image carousel to the agent's
Instagram Business Account via the Meta Graph API. **Publishes
immediately** — there is no draft step.

## Architecture

```
Claude (Desktop / Code / .ai)
   │
   ▼  MCP tool call
@chatrealty/mcp-server
   │
   ▼  HTTPS POST {imageUrls, caption}
/api/skill/instagram/carousel          ◄── requires social:post scope
   │
   ▼  3 calls to Meta Graph API v21.0
   1. POST /{ig-user-id}/media          (child container per image)
   2. POST /{ig-user-id}/media           (CAROUSEL parent, children=...)
   3. POST /{ig-user-id}/media_publish   (publish)
   │
   ▼
Instagram post goes live
```

## Prerequisites

| Requirement | How to verify |
|---|---|
| Facebook Page with a linked Instagram Business Account | Confirmed at OAuth — the page record returns `instagram_business_account.id` |
| Page Access Token stored in `User.adAccounts.meta.pageAccessToken` | Set during the Meta Ads connect flow |
| Token scopes include `instagram_basic` + `instagram_content_publish` | See **One-time reauthorization** below |
| `crt_live_*` token granted the `social:post` scope | Mint a fresh token in Settings → Integrations with that scope checked |

## One-time reauthorization

The existing Meta connection was built for ad campaigns, so it only requested
`ads_*` and `pages_*` scopes. Adding the IG scopes is a one-line change to
`src/app/api/auth/meta-ads/connect/route.ts` (done in commit that ships this
doc). Existing connections need to grant the new scopes once:

1. Open Settings → Integrations → "Connect Meta Ads"
2. Facebook will display a consent screen listing the new IG permissions.
   Approve them.
3. The callback overwrites your saved token with the upgraded one. Old token
   is no longer needed.

Verify it took with:

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const m = require('mongoose');
(async () => {
  await m.connect(process.env.MONGODB_URI);
  const u = await m.connection.db.collection('users').findOne({ email: 'YOU@YOURMAIL.COM' });
  const t = u?.adAccounts?.meta?.pageAccessToken;
  const p = await fetch('https://graph.facebook.com/v21.0/me/permissions?access_token=' + t).then(r => r.json());
  console.log(p.data.filter(d => d.permission.startsWith('instagram')));
  await m.disconnect();
})();
"
```

Look for two entries: `{permission: 'instagram_basic', status: 'granted'}` and
`{permission: 'instagram_content_publish', status: 'granted'}`.

## Constraints (Meta-enforced)

| Limit | Value | Failure mode |
|---|---|---|
| Image count | 2-10 | 400 from our route before calling Meta |
| Image URL | HTTPS, publicly fetchable | 400 from our route |
| Image format | JPEG or PNG | Meta returns 400 with "Invalid image format" |
| Caption length | ≤ 2200 chars | 400 from our route |
| Posts per IG account per day | ~25 (Meta soft limit) | 429 from Meta once you hit it |

ChatRealty doesn't enforce a per-token cap separately; the write-tier rate
limit (60 req / hour at the token level) is the safety rail. If you find
agents spamming, tighten the limiter or add a dedicated `social:posts/day`
counter.

## Tool input shape

```ts
{
  imageUrls: string[],   // 2-10 HTTPS URLs
  caption: string,       // ≤ 2200 chars; hashtags + line breaks ok
}
```

## Recipes

### 1. Listing carousel (the headline use case)

```
1. search_listings { city: "Indian Wells", minBeds: 4, hasPool: true, limit: 1 }
2. get_listing_photos { listingKey, limit: 8 }
3. Build caption from listing fields (price, beds/baths/sqft, neighborhood)
4. post_instagram_carousel { imageUrls: photos.map(p => p.url), caption }
```

Tip: use `uri1280` or `uri1024` (not `uri2048`) for IG — smaller files, faster
fetch by Meta during container creation. The skill `photos.url` field already
prefers the largest available; for IG specifically you can replace `-o.jpg`
with the resized variants. (Or accept the larger files; Meta down-samples
anyway.)

### 2. Market snapshot carousel

```
1. get_market_stats { city: "Palm Desert" }
2. (External step) Generate stat tile images — Cloudinary text overlay,
   Figma export, or a small server-side renderer. ChatRealty doesn't
   ship an image generator (yet).
3. post_instagram_carousel { imageUrls, caption }
```

### 3. Article promo carousel

```
1. get_article { slugId }
2. featuredImage.url goes first
3. Extract 2-4 key bullet points → generate tile images (same as above)
4. post_instagram_carousel { imageUrls, caption: link + first paragraph }
```

### 4. Manual

The agent supplies the URLs and caption directly; Claude just calls the tool.

## Failure modes

| Error code | Meaning | Recovery |
|---|---|---|
| `validation_failed` | Bad input shape (count, HTTPS, caption length) | Fix input |
| `meta_not_connected` | No `adAccounts.meta` block — never connected | Settings → Integrations → Connect Meta Ads |
| `no_ig_business_account` | The connected FB Page has no linked IG account | Link it in IG → Settings → Linked Accounts |
| `child_container_failed` | Meta rejected one of the image URLs (404, format, oversize) | Re-check URLs in a browser; resize if huge |
| `parent_container_failed` | Carousel container creation failed | Inspect `details.response`; rare in practice |
| `publish_failed` | Final publish step rejected | Inspect `details.response`; container id retained in details for retry |

Common cause of `child_container_failed`: the image URL is reachable from
your browser but Meta's fetchers in Europe/Asia time out. Cloudinary URLs
with `f_auto,q_auto` transformations are reliable; raw Spark photo URLs are
also reliable.

## What we explicitly DON'T support (yet)

- Single-image posts (only carousels). Add a sibling `post_instagram_image`
  if needed; same flow, skip step 2.
- Reels / videos. Different `media_type=REELS` flow with video_url + cover.
- Stories. Separate API surface (`/stories` endpoint).
- Scheduling. IG Content Publishing API doesn't expose a scheduled-publish
  param; you'd build a queue collection in our DB and a cron worker.
- Multi-account agents. The route always posts to the single IG biz
  account linked to the FB Page in the user's `adAccounts.meta`.

## Tech debt to address as use grows

- Per-token spend/post counter (separate from rate limit) so we can show
  "X carousels posted via Claude this week" in agent analytics.
- Audit log entry per post — currently no row is written; `McpToolCallLog`
  isn't built yet (see `scopes-and-safety.md`).
- Confirmation flow (two-call pattern from `scopes-and-safety.md`). For now,
  Claude is trusted to confirm with the agent before calling.
