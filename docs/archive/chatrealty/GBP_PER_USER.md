# GBP Per-User Architecture

## Overview

The Google Business Profile (GBP) integration has been refactored from a hardcoded single-account system to a per-user/per-agent architecture. Each agent can connect their own GBP account via OAuth, and article publishing will automatically post to their profile.

## Architecture

### Credential Hierarchy

1. **App-level credentials** (env vars, same for all users):
   - `GBP_CLIENT_ID` — Google OAuth app client ID
   - `GBP_CLIENT_SECRET` — Google OAuth app client secret

2. **Per-user credentials** (stored in MongoDB `User.adAccounts.gbp`):
   - `refreshToken` — OAuth refresh token obtained during connect flow
   - `accountId` — Auto-discovered GBP account (e.g., `accounts/101108799337549000917`)
   - `locationId` — Auto-discovered GBP location (e.g., `locations/7725888369257069197`)

3. **Platform owner fallback** (env var `GBP_REFRESH_TOKEN`):
   - Used when no `userId` is provided or user has no GBP connected
   - Falls back to hardcoded account/location IDs for Joseph's profile

### Data Model

```
User.adAccounts.gbp: {
  accountId: String,      // GBP account resource name
  locationId: String,     // GBP location resource name
  refreshToken: String,   // Per-agent OAuth refresh token
  connectedAt: Date,
  status: 'connected' | 'disconnected' | 'pending'
}
```

## Files Modified

| File | Change |
|------|--------|
| `src/models/User.ts` | Added `adAccounts.gbp` schema with accountId, locationId, refreshToken, connectedAt, status |
| `src/lib/gbp-api.ts` | All methods accept optional `credentials` param; token cache is per-refresh-token; added `listAccounts()` and `listLocations()` for auto-discovery |
| `src/lib/gbp-publisher.ts` | `publishArticleToGBP(article, userId?)` — looks up user's GBP creds, falls back to env vars |
| `src/app/api/gbp/post/route.ts` | All handlers resolve per-user GBP config from session; returns 422 with helpful message if no GBP connected |
| `src/app/api/articles/publish/route.ts` | Passes `session.user.id` to `publishArticleToGBP()` for per-user posting |
| `src/app/api/agent/ad-accounts/route.ts` | GET returns `gbp` status; POST/DELETE support `platform: 'gbp'` |
| `src/app/components/campaigns/AdAccountsSetup.tsx` | Added GBP connection card with OAuth button, connected status, disconnect |

## Files Created

| File | Purpose |
|------|---------|
| `src/app/api/auth/gbp/connect/route.ts` | Initiates GBP OAuth flow with `business.manage` scope |
| `src/app/api/auth/gbp/callback/route.ts` | Exchanges code for refresh token, auto-discovers account/location, saves to user profile |

## OAuth Flow

1. User clicks "Connect Google Business Profile" in Settings > Ad Accounts
2. Redirected to `/api/auth/gbp/connect` which builds Google OAuth URL with `business.manage` scope
3. User grants consent on Google's screen
4. Google redirects to `/api/auth/gbp/callback` with auth code
5. Callback exchanges code for tokens
6. Callback auto-discovers accountId via `GET /v4/accounts`
7. Callback auto-discovers locationId via `GET /v4/{accountId}/locations`
8. All saved to `User.adAccounts.gbp`
9. User redirected to `/agent/campaigns?gbp=connected`

## Publishing Flow

When an article is published (not draft):

1. `publishArticleToGBP(article, userId)` is called
2. If `userId` provided, looks up `User.adAccounts.gbp` from MongoDB
3. If user has GBP connected (refreshToken + accountId + locationId), uses those
4. If not, falls back to platform owner env vars (`GBP_REFRESH_TOKEN` + hardcoded IDs)
5. If neither available, skips silently with `{ success: false, skipped: true }`

## Token Caching

Access tokens are cached in a `Map` keyed by the last 16 characters of the refresh token. Each token is cached for its lifetime minus 60 seconds. This means multiple users each get their own cached access token without collision.

## Backward Compatibility

- All existing env var flows continue to work unchanged
- The platform owner (Joseph) can still use `GBP_REFRESH_TOKEN` env var without connecting via OAuth
- API methods without credentials parameter default to env var resolution
- The `publishArticleToGBP()` function without `userId` behaves identically to the old version
