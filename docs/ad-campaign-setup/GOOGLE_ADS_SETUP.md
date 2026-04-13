# Google Ads Conversion Tracking Setup

## What's Already Done

- **GA4 is active** (`G-613BBEB2FS`) — loaded via gtag in `src/app/layout.tsx`
- The gtag infrastructure is already in place — Google Ads just needs to be added alongside it

## What's Needed

- Google Ads account
- Conversion ID (`AW-XXXXXXXXX`)
- Conversion Labels for each action you want to track

---

## Step 1: Create a Google Ads Account

1. Go to [ads.google.com](https://ads.google.com)
2. Sign in with the Google account tied to your business
3. Complete the account setup (billing, etc.)
4. Note your **Customer ID** (format: `XXX-XXX-XXXX` shown in top-right of Ads dashboard)

## Step 2: Link GA4 to Google Ads

This gives you audience sharing and conversion import capabilities:

1. In Google Ads: **Tools > Linked accounts > Google Analytics (GA4)**
2. Find the `G-613BBEB2FS` property and click **Link**
3. In GA4 Admin: **Product Links > Google Ads Links** — confirm the link

## Step 3: Create Conversion Actions

In Google Ads, go to **Tools > Conversions > New conversion action > Website**:

### Recommended Conversions

| Conversion Name | Category | Trigger |
|---|---|---|
| Lead - Contact Form | Lead / Submit form | General contact form submission |
| Lead - Buy Intake | Lead / Submit form | Buy-side lead form submission |
| Lead - Sell Intake | Lead / Submit form | Sell-side lead form submission |
| Lead - Campaign Form | Lead / Submit form | Landing page form submission |
| Signup | Signup | User registration completion |
| Property Search | Page view | User executes a property search |

For each conversion, Google Ads gives you:
- **Conversion ID**: `AW-XXXXXXXXX` (same for all conversions in the account)
- **Conversion Label**: unique per conversion action (e.g., `AbCdEfGh123`)

## Step 4: Add Google Ads to .env.local

```env
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
```

## Step 5: Code Implementation

Once you have the Conversion ID and labels, we'll:

### 1. Load Google Ads gtag alongside GA4

In `src/app/layout.tsx`, add a `gtag('config')` call for the Ads ID. The existing gtag script already loads from googletagmanager.com — we just configure the additional ID:

```typescript
gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}');
```

### 2. Create a tracking utility

Create `src/lib/google-ads.ts` (mirroring the meta-pixel.ts pattern):

```typescript
// Conversion event helpers
export function trackConversion(conversionLabel: string, value?: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/${conversionLabel}`,
      value: value || 0,
      currency: 'USD',
    });
  }
}
```

### 3. Fire conversion events in forms

Same locations as Meta Pixel events — lead forms, signup, search.

---

## Step 6: Google Ads Customer Match (Audience Sync)

Use your CRM contacts for targeted advertising:

### Manual Upload
1. In Google Ads: **Tools > Audience Manager > Customer Lists**
2. Upload CSV with emails and/or phone numbers from your contacts
3. Google matches these to signed-in Google users
4. Use for targeting or create **Similar Audiences**

### Requirements
- Account must be in good standing
- Account must be older than 90 days
- Account must have more than $50,000 total lifetime spend (for Customer Match)
  - Alternative: Use **GA4 Audiences** which have no spend threshold

### GA4 Audiences (No Spend Threshold)
1. In GA4: **Admin > Audiences > New Audience**
2. Create audiences based on website behavior:
   - Users who viewed 5+ listings
   - Users who favorited properties
   - Users who submitted lead forms
   - Users from specific neighborhoods/cities
3. These audiences auto-sync to your linked Google Ads account

---

## Enhanced Conversions (Recommended)

Enhanced Conversions improve match rates by sending hashed first-party data (email, phone) with conversion events:

```typescript
gtag('set', 'user_data', {
  email: hashedEmail,
  phone_number: hashedPhone,
});
```

This can be wired into the same form submission handlers where you already have the user's contact info. Implementation details will be handled when we build the `google-ads.ts` utility.
