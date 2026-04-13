# Ad Campaign Setup Guide

> Last updated: 2026-04-12

## Current Status

| Component | Status | Details |
|---|---|---|
| **Google Analytics 4** | Active | `G-613BBEB2FS` loaded in root `layout.tsx` |
| **Meta Pixel Library** | Built, not active | Full event tracking in `src/lib/meta-pixel.ts` + component in `src/components/MetaPixel.tsx`, rendered in `ClientLayoutWrapper.tsx` |
| **Meta Pixel ID** | Placeholder | `.env.local` has `your_meta_pixel_id_here` — needs real Pixel ID |
| **Google Tag Manager** | Not set up | No GTM container |
| **Google Ads Conversion Tracking** | Not set up | No `AW-` ID, no gtag conversion events |
| **CRM / Contacts DB** | Fully built | MongoDB Contact model with `campaignHistory`, consent tracking, lead source, tags, labels |
| **Campaigns System** | Fully built | Campaign model with voicemail/email/SMS strategies, `ContactCampaign` junction, execution tracking |
| **Lead Capture Forms** | Active | Buy-intake, sell-intake, contact form, campaign form — all create contacts in DB |

---

## File Map

Key files involved in tracking and ad infrastructure:

| File | Purpose |
|---|---|
| `src/app/layout.tsx` (lines 253-268) | GA4 gtag script loading |
| `src/lib/meta-pixel.ts` | Meta Pixel event tracking utilities |
| `src/components/MetaPixel.tsx` | Client component that initializes pixel + tracks page views on route change |
| `src/app/components/ClientLayoutWrapper.tsx` | Renders `<MetaPixel />` site-wide |
| `src/app/utils/map/useSwipeQueue.ts` | Fires `trackAddToWishlist()` when users favorite properties |
| `src/models/Contact.ts` | Contact schema — lead source, consent, campaign history |
| `src/models/Campaign.ts` | Campaign schema — voicemail/email/text strategies, stats |
| `src/models/ContactCampaign.ts` | Junction table linking contacts to campaigns |
| `src/models/CampaignExecution.ts` | Tracks per-execution metrics (delivery, opens, clicks) |
| `src/app/api/leads/buy-intake/route.ts` | Buy-side lead capture → creates Contact |
| `src/app/api/leads/sell-intake/route.ts` | Sell-side lead capture → creates Contact |
| `src/app/api/contact/route.ts` | General contact form → creates Contact |
| `src/app/api/campaign/submit/route.ts` | Landing page form submission → creates user + tracks lead source |
| `.env.local` | All tracking IDs and API keys |
