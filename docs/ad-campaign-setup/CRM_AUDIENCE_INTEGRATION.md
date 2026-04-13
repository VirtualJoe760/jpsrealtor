# CRM & Audience Integration

How your existing contacts and campaigns system connects to Meta and Google ad platforms.

## Your CRM Data That's Useful for Ads

### Contact Model Fields (from `src/models/Contact.ts`)

| Field | Ad Platform Use |
|---|---|
| `emails[].address` | Custom Audience matching (Meta + Google) |
| `phones[].number` | Custom Audience matching (Meta + Google) |
| `status` (uncontacted → client) | Segment audiences by funnel stage |
| `source` (website, referral, csv_import, etc.) | Attribute leads back to ad campaigns |
| `tags[]` | Custom segmentation (e.g., "luxury buyer", "investor") |
| `labels[]` | Structured segmentation via Label model |
| `interests` (buying/selling prefs, price range, locations) | Target ads to intent signals |
| `consent.marketingConsent` | Required before including in Custom Audiences |
| `doNotContact` | Must be excluded from all ad audiences |
| `campaignHistory` | Track which ad-driven campaigns a contact has been in |

### Campaign System (from `src/models/Campaign.ts`)

| Campaign Type | Ad Opportunity |
|---|---|
| `sphere_of_influence` | Retarget your sphere on Meta/Google with listing ads |
| `past_clients` | Upsell/referral ads to past clients |
| `neighborhood_expireds` | Geo-targeted ads to expired listing neighborhoods |
| `high_equity` | Targeted seller ads to high-equity homeowners |
| `custom` | Any custom audience segment |

---

## Audience Building Strategy

### Tier 1: Pixel-Based Audiences (Automatic)

Once Meta Pixel and Google Ads are active, these audiences build automatically:

| Audience | Platform | Trigger |
|---|---|---|
| All site visitors | Meta + Google | Any page view |
| Property viewers | Meta | `ViewContent` event |
| Favorited properties | Meta | `AddToWishlist` event |
| Lead form submitters | Meta + Google | `Lead` / conversion event |
| Registered users | Meta + Google | `CompleteRegistration` / conversion |
| Active searchers | Meta | `Search` event |

### Tier 2: CRM-Based Custom Audiences (Manual Upload)

Export segments from your CRM and upload to Meta/Google:

| Segment | Query Logic | Use Case |
|---|---|---|
| All clients | `status: 'client'` | Referral/review campaigns |
| Qualified leads | `status: 'qualified'` | Nurturing ads |
| Buyers by area | `interests.locations` contains target city | Geo-targeted listing ads |
| Sellers | `interests.selling: true` | CMA / listing presentation ads |
| High-value leads | `interests.priceRange.max > 1000000` | Luxury property ads |
| Inactive contacts | `status: 'inactive'` | Re-engagement campaigns |

**Compliance requirement**: Only include contacts where `consent.marketingConsent === true` and `doNotContact !== true`.

### Tier 3: Lookalike / Similar Audiences

Upload your best-performing segments (e.g., closed clients) and let the platforms find similar users:

- **Meta**: Lookalike Audiences (1-10% of target country population)
- **Google**: Similar Audiences via GA4 audience sharing

---

## Future: Automated Audience Sync

### Meta Conversions API (CAPI)

Server-side event tracking from your API routes. Benefits:
- Bypasses ad blockers (~30% of users)
- Better identity matching with hashed email/phone
- Required for best optimization in 2026+

**Implementation plan:**
- Add Meta CAPI calls to `/api/leads/buy-intake`, `/api/leads/sell-intake`, `/api/contact`, `/api/campaign/submit`
- Send `Lead` events with user identity data (hashed)
- Requires: Meta System User Access Token + Pixel ID

### Google Ads API Audience Sync

Automatically push CRM segments to Google Ads:
- Requires: Google Ads API developer token + OAuth
- Customer Match lists updated via API
- Contacts synced nightly or on segment change

### Dashboard Integration

Build into the agent dashboard (`/agent/campaigns`):
- "Sync to Meta" button on campaign contact lists
- "Create Lookalike" workflow
- Audience performance metrics from Meta/Google APIs

---

## Privacy & Compliance Checklist

- [ ] Only sync contacts with `marketingConsent === true`
- [ ] Exclude all `doNotContact === true` contacts
- [ ] Respect `unsubscribedAt` dates
- [ ] Hash all PII (email, phone) before sending to ad platforms
- [ ] Include privacy policy disclosure about ad targeting on lead capture forms
- [ ] Honor opt-out requests within 48 hours
- [ ] CCPA: Provide "Do Not Sell My Personal Information" mechanism for California users
