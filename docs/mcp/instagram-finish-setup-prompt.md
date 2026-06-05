---
title: Prompt — finish Instagram publish setup
status: current
last_verified: 2026-06-04
related: [./instagram-posting.md, ./README.md]
---

# Prompt — finish Instagram publish setup

Hand this entire document to whoever is finishing the Instagram setup
(a browser-controlling Claude, another Claude instance, or a human).
It's self-contained — no prior context needed.

---

## Goal

Make the ChatRealty MCP tool `post_instagram_carousel` actually publish
a carousel to Joseph Sardella's Instagram Business Account from
production at https://chatrealty.io.

## Current state (already done)

- MCP tool `post_instagram_carousel` shipped in
  `@chatrealty/mcp-server@0.6.0`
- Backend route exists at `src/app/api/skill/instagram/carousel/route.ts`
  (uses the legacy Facebook Page Access Token flow)
- OAuth scope list at `src/app/api/auth/meta-ads/connect/route.ts` was
  updated to request `instagram_basic` and `instagram_content_publish`.
  This change is on branch `feat/landing-page-claude-byok-and-skill`,
  commit `50696f9f`. **It has not been deployed to chatrealty.io yet.**
- Per-token scope `social:post` exists. Joseph still needs to mint a
  fresh `crt_live_*` token that includes this scope.

## Known account facts

| Item | Value |
|---|---|
| Meta App ID | `3698458803622960` (app name: chatRealty) |
| Meta App business id (URL param) | `1260738784844861` |
| Joseph's FB Page ID | `109387773924627` (Joseph Sardella) |
| Instagram Business Account ID | `17841400926130218` (handle: instadella) |
| ChatRealty production domain | `chatrealty.io` |
| Alt production domain | `jpsrealtor.com` |
| Joseph's email | `josephsardella@gmail.com` |
| GitHub repo | `https://github.com/VirtualJoe760/jpsrealtor` |
| Branch with the pending code | `feat/landing-page-claude-byok-and-skill` |
| Existing granted Meta scopes | `pages_show_list, ads_management, ads_read, pages_read_engagement, pages_manage_ads, public_profile` — **missing `instagram_basic` and `instagram_content_publish`** |

## Tasks — do them in order, don't skip

### 1. Meta App Domains

Go to https://developers.facebook.com/apps/3698458803622960/settings/basic/

- Find the **"App Domains"** field. Add `chatrealty.io` and `jpsrealtor.com`
  (press Enter between each so each becomes a chip).
- Scroll to the bottom-right, click the blue **"Save changes"** button.
- Confirm the green "Changes saved" toast appears.

### 2. Valid OAuth Redirect URIs

In the left sidebar of the same Meta dashboard:

- Click **"Facebook Login for Business"**
- Click **"Settings"** underneath it
- Find the **"Valid OAuth Redirect URIs"** field. Add:
  ```
  https://chatrealty.io/api/auth/meta-ads/callback
  https://jpsrealtor.com/api/auth/meta-ads/callback
  ```
- Save at the bottom of the page.

### 3. Add Instagram permissions to the existing Marketing API use case

Go to https://developers.facebook.com/apps/3698458803622960/use_cases/

- Find the row "Create & manage ads with Marketing API" and click **Customize**
- On the next page, click the **"Permissions"** tab
- Find `instagram_basic` in the list → click **"Request advanced access"** (or
  "Get standard access" if you only see that — both work for your own
  connected IG account)
- Find `instagram_content_publish` → same: request access
- These should auto-grant **Standard Access** for Joseph's own connected IG
  account (instadella, 17841400926130218). No app review is needed for
  publishing to accounts you admin via Business Manager.

If either permission isn't visible under Marketing API, try the same flow
under the **"Manage everything on your Page"** or **"Engage with customers
on Instagram"** use case — Meta sometimes shuffles where these live.

### 4. Deploy the new OAuth scope list to chatrealty.io

The site is on Vercel and auto-deploys from the `main` branch. The new code
lives on `feat/landing-page-claude-byok-and-skill`. Open a PR and merge:

```bash
cd /path/to/jpsrealtor
git push origin feat/landing-page-claude-byok-and-skill
gh pr create --base main \
  --title "feat: ChatRealty MCP v0.6.0 — listing audit pass + Instagram carousel" \
  --body "Includes commits 210490df → 50696f9f. See PR description for full list. Adds the Instagram-publish OAuth scopes (instagram_basic, instagram_content_publish) so Settings → Integrations → Connect Meta Ads grants what we need."
gh pr merge --merge --auto
```

Vercel will deploy automatically on merge. Confirm at
https://vercel.com/<your-org>/jpsrealtor that the deployment to
production succeeded (green check, status "Ready") before continuing.

### 5. Reauthorize Meta from the live site

1. Open https://chatrealty.io/ in a browser, signed in as
   `josephsardella@gmail.com`
2. Go to **Settings → Integrations**
3. Find the **"ChatRealty Meta Ads"** card (or whatever it's named) and
   click **"Connect Meta Ads"** (or "Reconnect")
4. Facebook's consent screen will load. It should now list two NEW
   permissions:
   - "Access profile and posts from the Instagram account connected to
     your Page"
   - "Create and manage content on your Instagram account"
5. Click **"Continue"** / approve them
6. You should be redirected back to the Integrations page with a
   success message

### 6. Verify the new scopes stuck

From a terminal in the repo:

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const m = require('mongoose');
(async () => {
  await m.connect(process.env.MONGODB_URI);
  const user = await m.connection.db.collection('users').findOne({ email: 'josephsardella@gmail.com' });
  const tok = user?.adAccounts?.meta?.pageAccessToken || user?.adAccounts?.meta?.accessToken;
  const perms = await fetch('https://graph.facebook.com/v21.0/me/permissions?access_token=' + tok).then(r => r.json());
  console.log(perms.data.filter(p => p.permission.startsWith('instagram')));
  await m.disconnect();
})();
"
```

Expected output:

```js
[
  { permission: 'instagram_basic', status: 'granted' },
  { permission: 'instagram_content_publish', status: 'granted' }
]
```

If you see anything else (declined, missing, empty array) — go back and
verify steps 3 and 5.

### 7. Mint an MCP token with `social:post` scope

1. On https://chatrealty.io/ → **Settings → Integrations** → **Generate
   ChatRealty API Token**
2. In the preset picker, choose **"Custom"**
3. Check the boxes for the scopes Joseph wants in this token. At minimum:
   - `listings:read` — so the tool can call `get_listing` / `get_listing_photos`
     to build the carousel
   - `landing_pages:read` (optional)
   - `social:post` — **REQUIRED for IG publish**
4. Click **Generate**. Copy the token (starts with `crt_live_`)
5. Paste the token into Joseph's Claude Code or Claude Desktop config to
   replace the existing one. In Claude Code:
   ```bash
   claude mcp add-env chatrealty CHATREALTY_API_TOKEN=crt_live_xxxxxxxx
   ```
   Restart Claude Code.

### 8. Test a real post

In Claude (any client where the chatrealty MCP is connected), ask:

> Post a 3-image carousel to my Instagram with these listing photos from
> 75809 Via Pisa Toscana. Caption: "New on the market in Toscana —
> 75809 Via Pisa, $3.095M. Italianate design on the 10th fairway, 4 BR
> + casita. DM for tour."

Claude should:
1. Call `get_listing_photos` for listingKey `20260429174250492207000000`
2. Call `post_instagram_carousel` with 3 of the URLs + the caption
3. Return a permalink to the live post

If it errors, the response will include `details.step` and Meta's exact
error message. Common causes:
- `child_container_failed` — image URL not publicly reachable OR not
  JPEG/PNG. Use Cloudinary URLs or Spark CDN `-o.jpg` URLs.
- `meta_not_connected` — step 5 didn't save. Re-run step 5.
- `social:post` not on the token — re-run step 7 with that scope checked.

### 9. Report back

Reply with:
- Confirmation steps 1-7 completed
- Either the test-post permalink (success) OR the full error JSON
  (failure)
- Anything Meta's UI showed that didn't match this guide, so I can
  update the doc for next time
