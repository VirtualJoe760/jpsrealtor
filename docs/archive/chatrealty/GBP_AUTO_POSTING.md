# GBP Auto-Posting — CMS Integration

Automatic Google Business Profile posting when articles are published through the CMS.

## Overview

When an article is published via `POST /api/articles/publish`, the pipeline automatically creates a corresponding post on the agent's Google Business Profile. This is **non-blocking** — if the GBP post fails, the article still publishes normally.

Draft articles are **not** posted to GBP.

## Architecture

```
CMS Publish Button
  → POST /api/articles/publish
    → publishArticle()          # MongoDB + MDX + Git (existing)
    → publishArticleToGBP()     # NEW: creates GBP post
      → gbp-api.ts              # OAuth2 token refresh + API calls
```

### Files

| File | Purpose |
|------|---------|
| `src/lib/gbp-api.ts` | Low-level GBP API client (token refresh, CRUD for local posts) |
| `src/lib/gbp-publisher.ts` | Formats articles into GBP posts and publishes them |
| `src/app/api/articles/publish/route.ts` | Updated to call `publishArticleToGBP` after article publish |
| `src/app/api/gbp/post/route.ts` | Manual GBP post management endpoint (POST/GET/DELETE) |

## GBP Post Format

GBP standard posts do **not** have a dedicated title field. The article title is placed as the first line of the summary text:

```
Article Title Here

Article excerpt/description follows. This gives readers a preview
of what they'll find in the full article.
```

Each post includes:
- **Summary**: Title (first line) + excerpt
- **CTA Button**: "Learn More" linking to `https://jpsrealtor.com/insights/{slug}`
- **Image**: Article's featured image (if provided)

## Environment Variables

These must be set in `.env.local` (already configured via `scripts/gbp-setup.js`):

```
GBP_CLIENT_ID=...
GBP_CLIENT_SECRET=...
GBP_REFRESH_TOKEN=...
```

If any are missing, GBP posting is silently skipped with a console warning.

## GBP Account Details

- **Account ID**: `accounts/101108799337549000917`
- **Location ID**: `locations/7725888369257069197`

## API Endpoints

### Automatic (CMS Pipeline)

`POST /api/articles/publish` — existing endpoint, now includes GBP posting. Response includes a `gbp` field:

```json
{
  "success": true,
  "slugId": "my-article",
  "gbp": {
    "success": true,
    "postName": "accounts/.../locations/.../localPosts/..."
  }
}
```

### Manual (Admin Dashboard)

**Create a GBP post:**
```
POST /api/gbp/post
Body: { "title": "...", "excerpt": "...", "image": "...", "url": "slug-or-full-url" }
```

**List GBP posts:**
```
GET /api/gbp/post
```

**Delete a GBP post:**
```
DELETE /api/gbp/post
Body: { "postName": "accounts/.../locations/.../localPosts/..." }
```

All endpoints require authentication.

## Error Handling

- GBP failures are logged to the server console but **never** block article publishing
- The publish API response includes `gbp.error` if the post failed
- Token refresh is cached with a 60-second expiry buffer to avoid redundant OAuth calls
- If GBP credentials are not configured, posting is skipped with a warning (no error thrown)

## Setup Reference

Initial GBP OAuth setup was done via `scripts/gbp-setup.js`. To re-authorize or test:

```bash
node scripts/gbp-setup.js auth       # Re-authorize (generates new refresh token)
node scripts/gbp-setup.js accounts   # Verify account access
node scripts/gbp-setup.js locations  # Verify location access
```
