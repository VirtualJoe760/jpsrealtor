# Google & Facebook OAuth + Meta Pixel Setup Guide

This guide will walk you through setting up Google OAuth, Facebook OAuth, and Meta Pixel for your JPSRealtor application.

---

## Part 1: Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "JPSRealtor" and click "Create"

### Step 2: Enable Google+ API

1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: JPSRealtor
   - **User support email**: your email
   - **Developer contact**: your email
5. Click "Save and Continue"
6. Skip "Scopes" (click "Save and Continue")
7. Add test users if needed (click "Save and Continue")
8. Click "Back to Dashboard"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Name it "JPSRealtor Web Client"
5. Add Authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://jpsrealtor.com` (your production domain)
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://jpsrealtor.com/api/auth/callback/google` (for production)
7. Click "Create"
8. **SAVE** your Client ID and Client Secret

### Step 5: Add to Environment Variables

Add to your `.env.local` (local development):
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

Add to Vercel (production):
- Go to Vercel Project → Settings → Environment Variables
- Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Redeploy

---

## Part 2: Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Consumer" as the app type
4. Click "Next"
5. Fill in:
   - **App name**: JPSRealtor
   - **App contact email**: your email
6. Click "Create App"

### Step 2: Add Facebook Login Product

1. In your app dashboard, find "Facebook Login"
2. Click "Set Up"
3. Choose "Web" as the platform
4. Enter your site URL:  `https://jpsrealtor.com` (or localhost for dev)
5. Click "Save" and "Continue"

### Step 3: Configure Facebook Login Settings

1. In the left sidebar, go to "Facebook Login" → "Settings"
2. Add Valid OAuth Redirect URIs:
   - `http://localhost:3000/api/auth/callback/facebook` (development)
   - `https://jpsrealtor.com/api/auth/callback/facebook` (production)
3. Click "Save Changes"

### Step 4: Get App Credentials

1. Go to "Settings" → "Basic" in the left sidebar
2. **SAVE** your App ID and App Secret
3. Scroll down and add your Privacy Policy URL and Terms of Service URL
4. Choose a category (e.g., "Business and Pages")
5. Click "Save Changes"

### Step 5: Switch to Live Mode (Production Only)

1. At the top of the dashboard, switch the toggle from "Development" to "Live"
2. This makes your app available to all users (not just test users)

### Step 6: Add to Environment Variables

Add to your `.env.local` (local development):
```bash
FACEBOOK_CLIENT_ID=your_facebook_app_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret_here
```

Add to Vercel (production):
- Go to Vercel Project → Settings → Environment Variables
- Add `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`
- Redeploy

---

## Part 3: Meta Pixel (Facebook Pixel) Setup

### Step 1: Create Meta Pixel

1. Go to [Facebook Events Manager](https://business.facebook.com/events_manager)
2. Click "Connect Data Sources" → "Web"
3. Click "Get Started"
4. Select "Meta Pixel"
5. Name it "JPSRealtor Pixel"
6. Enter your website URL: `https://jpsrealtor.com`
7. Click "Continue"

### Step 2: Get Pixel ID

1. After creation, you'll see your Pixel ID (a number like `1234567890`)
2. **SAVE** this Pixel ID
3. Click "Continue" → Skip the manual installation (we've already added the code)

### Step 3: Add to Environment Variables

Add to your `.env.local` (local development):
```bash
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
```

Add to Vercel (production):
- Go to Vercel Project → Settings → Environment Variables
- Add `NEXT_PUBLIC_META_PIXEL_ID`
- Redeploy

### Step 4: Verify Pixel Installation

1. Install [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper) Chrome extension
2. Visit your website
3. Click the extension icon - you should see your pixel firing
4. You should see events like:
   - `PageView` - on every page
   - `ViewContent` - when viewing a listing
   - `AddToWishlist` - when liking/favoriting a listing
   - `Lead` - when submitting contact forms
   - `Search` - when searching for properties
   - `CompleteRegistration` - when signing up

---

## Part 4: Meta Pixel Events We Track

Your application now tracks these events for retargeting:

### 1. **ViewContent** - When users view a listing
```javascript
// Automatically tracked when viewing listing details
trackViewContent({
  listingKey: "12345",
  address: "123 Main St",
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  city: "Palm Desert",
  subdivision: "Palm Valley"
});
```

### 2. **AddToWishlist** - When users like/favorite a listing
```javascript
// Automatically tracked when swiping right or clicking favorite
trackAddToWishlist({
  listingKey: "12345",
  address: "123 Main St",
  price: 500000,
  // ... other details
});
```

### 3. **Search** - When users search for properties
```javascript
trackSearch({
  searchString: "3 bedroom palm desert",
  city: "Palm Desert",
  minPrice: 300000,
  maxPrice: 700000,
  bedrooms: 3
});
```

### 4. **Lead** - When users contact you
```javascript
trackLead({
  listingKey: "12345",
  address: "123 Main St",
  contactType: "book_appointment"
});
```

### 5. **CompleteRegistration** - When users sign up
```javascript
trackCompleteRegistration("google"); // or "facebook" or "email"
```

---

## Part 5: Setting Up Retargeting Campaigns

### Create a Custom Audience

1. Go to [Facebook Ads Manager](https://business.facebook.com/adsmanager)
2. Click "Audiences" in the menu
3. Click "Create Audience" → "Custom Audience"
4. Choose "Website"
5. Select your pixel

### Create Audience for Favorite Listings

1. Choose "Event" as the source
2. Select "AddToWishlist" event
3. Set timeframe (e.g., last 30 days)
4. Name it "Users Who Favorited Listings - 30 Days"
5. Click "Create Audience"

### Create Audience for Viewed Listings

1. Create another Custom Audience
2. Choose "ViewContent" event
3. Add refinement: "Value is greater than $400,000" (or your target price range)
4. Set timeframe (e.g., last 7 days)
5. Name it "Users Who Viewed High-Value Listings - 7 Days"

### Create Dynamic Ads (Advanced)

1. Create a product catalog in Facebook Commerce Manager
2. Upload your listing data (we'll need to create a product feed)
3. Create Dynamic Ads that show users the EXACT listings they favorited
4. This creates true "omnipresence" - users see their favorite properties everywhere

---

## Part 6: Privacy & Compliance

### Add Privacy Policy

Make sure your privacy policy mentions:
- Use of cookies and tracking pixels
- Data sharing with Facebook/Meta
- User rights to opt-out

### GDPR/CCPA Compliance

Consider adding a cookie consent banner:
```bash
npm install react-cookie-consent
```

---

## Part 7: Testing Everything

### Test OAuth Login:

1. Go to `/auth/signin`
2. Click "Sign in with Google" - should redirect and log you in
3. Click "Sign in with Facebook" - should redirect and log you in
4. Check that user is created in your MongoDB database

### Test Meta Pixel:

1. Install Meta Pixel Helper extension
2. Browse your site
3. View a listing - should see `ViewContent` event
4. Like a listing - should see `AddToWishlist` event
5. Search for properties - should see `Search` event
6. Submit contact form - should see `Lead` event
7. Sign up - should see `CompleteRegistration` event

### Verify in Events Manager:

1. Go to Facebook Events Manager
2. Select your pixel
3. Click "Test Events"
4. Enter your website URL
5. Perform actions on your site
6. Should see events appear in real-time

---

## Part 8: Additional Tracking (Optional)

### Track User's Top Favorites on Dashboard

Add this to your dashboard page:

```typescript
import { trackViewTopListings } from "@/lib/meta-pixel";
import { useEffect } from "react";

// Inside your dashboard component
useEffect(() => {
  if (userFavorites && userFavorites.length > 0) {
    trackViewTopListings(userFavorites.slice(0, 10)); // Top 10 favorites
  }
}, [userFavorites]);
```

### Track Property Details Page Views

Add to your listing detail pages:

```typescript
import { trackViewContent } from "@/lib/meta-pixel";
import { useEffect } from "react";

useEffect(() => {
  if (listing) {
    trackViewContent({
      listingKey: listing.ListingKey,
      address: listing.UnparsedAddress,
      price: listing.ListPrice,
      bedrooms: listing.BedroomsTotal,
      bathrooms: listing.BathroomsTotalInteger,
      city: listing.City,
      subdivision: listing.SubdivisionName,
    });
  }
}, [listing]);
```

---

## Summary of Environment Variables Needed

Add these to `.env.local` AND Vercel:

```bash
# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Meta Pixel
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id

# Existing (already set)
NEXTAUTH_URL=https://jpsrealtor.com
NEXTAUTH_SECRET=your_secret
AUTH_TRUST_HOST=true
```

---

## 🎯 Your Marketing Strategy

With OAuth and Meta Pixel set up, you can now:

1. **Capture Users**: Easy sign-in with Google/Facebook = more users
2. **Track Behavior**: Know exactly which listings users love
3. **Retarget Everywhere**: Show users their favorite listings on Facebook, Instagram, Messenger, Audience Network
4. **Dynamic Ads**: Automatically show the exact properties they liked
5. **Lookalike Audiences**: Find similar users who are likely to be interested in real estate

This creates true **omnipresence** - users will see their favorite properties everywhere they go online, keeping you top-of-mind when they're ready to buy! 🏡

---

## Need Help?

- Google OAuth issues: Check redirect URIs match exactly
- Facebook OAuth issues: Make sure app is in "Live" mode for production
- Meta Pixel not tracking: Check console for errors, verify Pixel ID is correct
- Retargeting not working: Wait 24-48 hours for pixel to gather data

Good luck! 🚀
