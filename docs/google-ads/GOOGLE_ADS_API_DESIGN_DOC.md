# Google Ads API Integration — Design Document

**Company:** Joseph Sardella Real Estate (jpsrealtor.com)
**Contact:** josephsardella@gmail.com
**Manager Account ID:** 206-304-7113
**Customer Account ID:** 802-958-0768
**Date:** April 21, 2026

---

## 1. Overview

We are building a campaign management tool integrated into our real estate agent dashboard at jpsrealtor.com. The tool allows real estate agents to create and manage Google Ads Search and Display campaigns directly from our platform, targeting specific neighborhoods and communities in the Coachella Valley, California.

## 2. Purpose

Our platform serves real estate agents who need to run geo-targeted PPC campaigns for neighborhood-specific landing pages. Instead of navigating the full Google Ads Manager interface, agents can:

1. Select a community or neighborhood page from our website
2. Configure targeting (radius, keywords, budget)
3. Launch a Search campaign via the Google Ads API
4. Review campaign performance in our dashboard

All campaigns are created in **PAUSED** status so the agent can review them in Google Ads Manager before enabling.

## 3. Campaign Types

### Search Campaigns (Primary)
- **Use case:** Drive traffic to neighborhood landing pages (e.g., jpsrealtor.com/neighborhoods/indio/monte-vina/buy)
- **Keywords:** Auto-generated from neighborhood data (e.g., "Monte Vina homes for sale", "Indio real estate")
- **Ad format:** Responsive Search Ads with up to 15 headlines and 4 descriptions
- **Geo-targeting:** Radius targeting around the neighborhood center point
- **Bid strategy:** Maximize Clicks (initial), transitioning to Maximize Conversions

### Display Campaigns (Secondary)
- **Use case:** Retargeting website visitors who viewed neighborhood pages
- **Ad format:** Responsive Display Ads
- **Targeting:** Remarketing lists from website visitors
- **Placements:** Google Display Network

## 4. Technical Architecture

### API Integration Flow

```
Agent Dashboard (Next.js React App)
    ↓
POST /api/campaigns/{id}/launch-ads
    ↓
src/lib/google-ads-api.ts (API Client)
    ↓
Google Ads REST API v18
    ↓
Creates: Budget → Campaign → Ad Group → Keywords → Ad
    ↓
Campaign created PAUSED for agent review
```

### Authentication
- **OAuth 2.0** with offline access for refresh tokens
- Agent connects Google account via `/api/auth/google-ads/connect`
- Refresh token stored securely in MongoDB (per-agent)
- Access tokens refreshed automatically before each API call

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/customers/{id}/campaignBudgets:mutate` | POST | Create daily budget |
| `/customers/{id}/campaigns:mutate` | POST | Create Search campaign |
| `/customers/{id}/adGroups:mutate` | POST | Create ad group |
| `/customers/{id}/adGroupCriteria:mutate` | POST | Add keywords |
| `/customers/{id}/adGroupAds:mutate` | POST | Create responsive search ad |
| `/customers/{id}/campaignCriteria:mutate` | POST | Set geo-targeting |

### Data Storage
- Campaign configuration stored in MongoDB `Campaign` model
- External campaign/ad group IDs stored in `AdCampaignRecord` model
- Agent credentials stored in `User.adAccounts.google` (encrypted at rest)

## 5. Account Management

- **Single manager account** (206-304-7113) manages all agent sub-accounts
- Each agent links their own Google Ads customer account
- Credentials are per-agent — no shared tokens
- Agents can disconnect at any time via the dashboard

## 6. Rate Limiting & Error Handling

- API calls are made server-side only (Next.js API routes)
- Retry logic with exponential backoff for transient errors
- Rate limit: well within Basic Access limits (< 100 operations per campaign creation)
- All errors logged and surfaced to the agent in the UI

## 7. Compliance

- All campaigns target the United States only
- Real estate ads comply with Google's housing advertising policies
- No automated bidding changes — agents review all campaigns before enabling
- No bulk account creation — agents connect existing Google Ads accounts

## 8. Screenshots

### Campaign Creation Wizard
The agent selects a community page, configures keywords and budget, reviews, and launches.

### Ad Accounts Setup
Agents connect their Google Ads account via OAuth and enter their Customer ID.

## 9. Technology Stack

- **Frontend:** Next.js 16 (React), TypeScript
- **Backend:** Next.js API Routes, MongoDB
- **Authentication:** NextAuth.js with Google OAuth 2.0
- **Hosting:** Vercel (serverless)
- **API Version:** Google Ads REST API v18
