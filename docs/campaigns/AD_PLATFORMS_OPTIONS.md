# Ad Platform Options: Google Ads & Meta Ads for Real Estate

> Created: 2026-04-13 | Status: Planning Reference
> Purpose: Developer reference for building the campaign wizard UI

---

## Table of Contents

1. [Google Ads](#google-ads)
2. [Meta (Facebook/Instagram) Ads](#meta-facebookinstagram-ads)
3. [Platform Comparison Table](#platform-comparison-table)
4. [Implementation Priority](#implementation-priority)

---

## Google Ads

### Campaign Types

#### 1. Search Campaigns

**What it is:** Text ads that appear on Google Search results pages when users search relevant keywords.

**How it works:** Advertiser selects keywords (e.g., "homes for sale in Palm Springs"), writes ad copy with headlines and descriptions, and bids on keyword auctions. Ads appear above or below organic results.

**Targeting options:**
- Keywords (broad match, phrase match, exact match)
- Negative keywords to exclude irrelevant traffic
- Geographic targeting (see Geo Targeting section)
- Device targeting (mobile, desktop, tablet)
- Ad scheduling (day of week, time of day)
- Demographic overlays (age, gender, household income)

**Creative requirements:**

| Element | Specs |
|---------|-------|
| Headlines | Up to 15, each max 30 characters |
| Descriptions | Up to 4, each max 90 characters |
| Display URL path | 2 fields, each max 15 characters |
| Final URL | Landing page URL |
| Responsive search ads | Google mixes and matches headlines/descriptions automatically |

**Best real estate use cases:**
- Capturing high-intent buyers searching "homes for sale in [city]"
- Seller leads searching "what is my home worth" or "best realtor near me"
- Targeting competitor brand names (e.g., "Zillow [city]")
- Neighborhood-specific campaigns ("Indian Wells luxury homes")

---

#### 2. Display Campaigns

**What it is:** Visual banner ads shown across Google's Display Network — over 2 million websites, apps, and Google-owned properties like YouTube and Gmail.

**How it works:** Advertiser uploads images or uses responsive display ads (Google auto-generates combinations). Ads are shown to users based on audience targeting, contextual targeting, or placement targeting.

**Targeting options:**
- Audience segments (in-market, affinity, custom)
- Contextual targeting (keywords, topics, placements)
- Remarketing lists (website visitors, customer lists)
- Demographic targeting
- Geographic targeting

**Creative requirements:**

| Format | Dimensions | Max File Size |
|--------|-----------|---------------|
| Responsive Display Ad (recommended) | Landscape: 1200x628, Square: 1200x1200, Logo: 1200x1200 | 5 MB each |
| Uploaded Banner (legacy) | 300x250, 728x90, 160x600, 320x50, 300x600 | 150 KB |
| Headlines | Up to 5, max 30 chars each | — |
| Long headline | 1, max 90 chars | — |
| Descriptions | Up to 5, max 90 chars each | — |
| Business name | Max 25 chars | — |

**Best real estate use cases:**
- Brand awareness in target neighborhoods
- Retargeting website visitors who viewed listings
- "Just Listed" and "Just Sold" display ads
- Open house promotion in surrounding ZIP codes

---

#### 3. Performance Max (PMax) Campaigns

**What it is:** Google's AI-driven campaign type that runs ads across ALL Google surfaces — Search, Display, YouTube, Gmail, Discover, and Maps — from a single campaign.

**How it works:** Advertiser provides creative assets (text, images, video) and audience signals. Google's AI optimizes placement, bidding, and creative combinations automatically to maximize conversions.

**Targeting options:**
- Audience signals (suggestions for Google's AI, not hard targeting):
  - Custom segments (search terms, URLs, apps)
  - Your data (remarketing lists, customer match)
  - Interests & demographics
- Geographic targeting
- Final URL expansion (Google can send traffic to any page on your site)

**Creative requirements (asset groups):**

| Asset Type | Quantity | Specs |
|-----------|----------|-------|
| Headlines | 3-5 | Max 30 chars |
| Long headlines | 1-5 | Max 90 chars |
| Descriptions | 2-5 | Max 90 chars |
| Images (landscape) | 1-20 | 1200x628, min 600x314 |
| Images (square) | 1-20 | 1200x1200, min 300x300 |
| Images (portrait) | 0-20 | 960x1200, min 480x600 |
| Logo (square) | 1-5 | 1200x1200, min 128x128 |
| Logo (landscape) | 0-5 | 1200x300, min 512x128 |
| YouTube videos | 0-5 | Linked from YouTube |
| Business name | 1 | Max 25 chars |
| Final URL | 1 | Landing page |
| Call to action | 1 | Select from list |

**Best real estate use cases:**
- General lead generation across all channels with one campaign
- Agents who want maximum reach with minimal management
- Promoting landing pages with lead capture forms
- Running alongside dedicated Search campaigns for incremental reach

**Caveats:**
- Limited transparency into which channels drive results
- Can cannibalize branded Search traffic
- Requires strong conversion tracking to optimize properly

---

#### 4. Video Campaigns (YouTube)

**What it is:** Video ads shown on YouTube and across the Google Video Partners network.

**How it works:** Advertiser uploads video to YouTube, then creates campaigns targeting specific audiences. Multiple ad formats available depending on campaign goal.

**Ad formats:**

| Format | Duration | Skippable | Billing |
|--------|----------|-----------|---------|
| Skippable in-stream | Any length (15-60s recommended) | After 5 seconds | CPV (pay when 30s watched or completed) |
| Non-skippable in-stream | 15 seconds max | No | CPM |
| Bumper ads | 6 seconds max | No | CPM |
| In-feed video ads | Any | N/A (user clicks to watch) | CPC |
| YouTube Shorts | Up to 60 seconds, vertical | After a few seconds | CPV/CPM |

**Creative requirements:**
- Video hosted on YouTube (public or unlisted)
- Companion banner (optional): 300x60
- Recommended resolution: 1920x1080 (landscape) or 1080x1920 (vertical/Shorts)
- Aspect ratios: 16:9 (landscape), 9:16 (vertical), 1:1 (square)

**Best real estate use cases:**
- Property tour videos / virtual walkthroughs
- Neighborhood spotlight videos
- Agent brand/intro videos
- Testimonial videos from past clients
- Market update videos

---

#### 5. Discovery / Demand Gen Campaigns

**What it is:** Visually rich ads across YouTube (in-feed, Shorts), Gmail Promotions tab, and Google Discover feed. Replaced Discovery campaigns in late 2023.

**How it works:** Similar to Display but specifically for Google's high-engagement surfaces. Supports image ads, video ads, and carousel formats.

**Creative requirements:**
- Same asset specs as Performance Max image requirements
- Carousel: 2-10 image cards, each 1200x1200 or 1200x628
- Video: YouTube-hosted, same specs as Video campaigns

**Best real estate use cases:**
- Showcasing multiple listings in carousel format
- Reaching engaged audiences in Gmail and Discover
- Upper-funnel awareness with rich visuals
- Complementing Search campaigns for broader reach

---

#### 6. Local Services Ads (LSAs)

**What it is:** Pay-per-lead ads that appear at the very top of Google Search for local service queries. Agents get a "Google Guaranteed" or "Google Screened" badge.

**How it works:** Agent creates a profile, passes background/license verification, sets a weekly budget, and pays per qualified lead (phone call or message) rather than per click. Google determines when to show the ad.

**Requirements:**
- Business license verification
- Background check
- Insurance verification (may vary by state)
- Google Business Profile
- Reviews on Google (more reviews = better placement)

**Targeting:**
- Service area (ZIP codes or city)
- Service types (buying, selling, rentals, property management)
- Budget set as weekly spend

**Cost model:**
- Pay per lead (not per click)
- Typical cost: $20-$50 per lead for real estate (varies by market)
- Ability to dispute invalid leads for refund

**Best real estate use cases:**
- Highest-intent lead source (user is actively looking for an agent)
- Local market dominance
- Builds trust via Google Screened badge
- Best ROI for direct seller/buyer leads

---

### Google Ads Audience Types

| Audience Type | Description | How to Use | Real Estate Example |
|--------------|-------------|------------|-------------------|
| **In-Market** | Users actively researching or comparing products/services in a category | Layer onto Search/Display campaigns | "Residential Properties" in-market segment |
| **Affinity** | Users with long-term interests and habits | Brand awareness campaigns | "Home Decor Enthusiasts", "Luxury Shoppers" |
| **Custom Segments** | Audiences based on search terms, URLs, or apps you define | Highly targeted campaigns | People searching "moving to Coachella Valley" |
| **Customer Match** | Upload email/phone lists to target existing contacts | Retargeting, upsell, exclusion | Upload CRM contacts for "Just Listed" ads |
| **Similar Audiences** | Users who resemble your customer match lists | Prospecting | Find people like your past buyers |
| **Remarketing** | Website visitors tracked via Google Tag | Retargeting campaigns | People who viewed listings but didn't inquire |
| **Combined Segments** | AND/OR logic combining multiple audience types | Precision targeting | In-market for homes AND affinity for luxury |

**Note:** Similar Audiences are being deprecated in favor of Google's AI-based audience expansion in Performance Max. Customer Match requires a minimum list size of 1,000 active users.

---

### Google Ads Geo Targeting

| Method | Description | Granularity | Best For |
|--------|-------------|-------------|---------|
| **Radius** | Circle around a point (address or pin) | 1 mile minimum | Open house promotion |
| **ZIP Code** | Target specific postal codes | ZIP level | Neighborhood farming |
| **City** | Target entire city | City level | City-wide campaigns |
| **County** | Target entire county | County level | Regional campaigns |
| **DMA (Metro Area)** | Designated Market Area (Nielsen regions) | Metro level | Broad market campaigns (e.g., "Palm Springs DMA") |
| **State** | Target entire state | State level | Relocation campaigns |
| **Location Groups** | Target by places of interest, demographics | Varies | Target "high household income" areas |

**Important settings:**
- **Presence vs. Interest:** "People IN your target area" vs. "People IN or INTERESTED IN your target area" — always use "Presence" for real estate to avoid wasting spend on irrelevant geos
- **Exclusions:** Can exclude specific ZIPs, cities, or radii within a broader target

---

### Google Ads Bidding Strategies

| Strategy | Optimization Goal | Best For | Requires Conversion Tracking |
|----------|------------------|----------|------------------------------|
| **Maximize Conversions** | Most conversions within budget | Lead gen with sufficient conversion data | Yes |
| **Maximize Conversion Value** | Highest total conversion value | When conversions have different values | Yes |
| **Target CPA** | Conversions at a target cost-per-acquisition | Mature campaigns with 30+ conversions/month | Yes |
| **Target ROAS** | Return on ad spend target | E-commerce or value-based bidding | Yes |
| **Maximize Clicks** | Most clicks within budget | Traffic campaigns, new campaigns without conversion data | No |
| **Manual CPC** | Set max CPC per keyword | Full control, experienced advertisers | No |
| **Enhanced CPC** | Manual CPC with Google adjustments | Transition from manual to automated | Yes (optional) |

**Recommendation for real estate:**
1. Start with **Maximize Clicks** for the first 2-4 weeks to gather data
2. Switch to **Maximize Conversions** once you have 15-30 conversions
3. Graduate to **Target CPA** once you have 50+ conversions and know your target cost per lead

---

### Google Ads Extensions (Assets)

| Extension | What It Adds | Real Estate Usage |
|-----------|-------------|-------------------|
| **Sitelinks** | Additional links below the ad | "View Listings", "Seller Services", "Market Reports", "About Joseph" |
| **Callout** | Short text highlights | "Free Home Valuation", "20+ Years Experience", "Palm Springs Specialist" |
| **Call** | Phone number / click-to-call | Agent's phone number — tracks calls as conversions |
| **Location** | Business address from Google Business Profile | Shows office address, map pin, directions |
| **Lead Form** | In-ad lead capture form | Capture name, email, phone without visiting website |
| **Structured Snippet** | Category + list of values | "Neighborhoods: Indian Wells, Palm Desert, La Quinta, Rancho Mirage" |
| **Image** | Visual image alongside text ad | Property photo, agent headshot |
| **Price** | Price cards for services | "Home Valuation: Free", "Buyer Consultation: Free" |
| **Promotion** | Special offer highlight | "Spring Market Special — Free Home Staging Consultation" |

---

### Google Ads Conversion Tracking

**Google Tag (gtag.js):**
- Already implemented on jpsrealtor.com
- Tracks: page views, form submissions, phone calls, chat interactions
- Enhanced conversions: hash and send user data (email, phone) with conversion events for better attribution

**Offline Conversions:**
- Upload CRM data to match ad clicks to closed deals
- Requires GCLID (Google Click ID) capture on lead forms
- Powerful for real estate where the conversion (closed sale) happens months later
- API available for automated uploads

**Key conversion events to track:**

| Event | Type | Value |
|-------|------|-------|
| Lead form submission | Primary | $50-$150 (estimated lead value) |
| Phone call (60s+) | Primary | $50-$150 |
| Property inquiry | Primary | $25-$75 |
| Listing page view | Secondary (observation) | $1-$5 |
| Contact page view | Secondary (observation) | $5-$10 |
| CMA request | Primary | $100-$200 |

---

### Google Ads Budget Recommendations

| Campaign Type | Minimum Monthly Budget | Recommended Monthly Budget | Expected CPL |
|--------------|----------------------|---------------------------|-------------|
| Search (buyer keywords) | $500 | $1,000-$2,500 | $15-$50 |
| Search (seller keywords) | $500 | $1,500-$3,000 | $30-$100 |
| Display (retargeting) | $300 | $500-$1,000 | $20-$60 |
| Display (prospecting) | $500 | $1,000-$2,000 | $40-$100 |
| Performance Max | $1,000 | $2,000-$5,000 | $25-$75 |
| YouTube | $500 | $1,000-$2,000 | $30-$80 (CPV: $0.05-$0.15) |
| Local Services Ads | $300 | $500-$1,500 | $20-$50 (pay per lead) |

**Notes:**
- Google has no hard minimum daily budget, but recommends at least $10-$20/day for Search
- Coachella Valley is a lower-competition market compared to LA or San Diego; CPCs will be lower
- Seller keywords ("sell my home," "home valuation") are typically 2-3x more expensive than buyer keywords
- Budget should run for at least 30 days before evaluating performance

---

## Meta (Facebook/Instagram) Ads

### Campaign Objectives

Meta uses the **Outcome-Driven Ad Experiences (ODAX)** framework with 6 objectives:

| Objective | Optimizes For | Best Real Estate Use |
|-----------|--------------|---------------------|
| **Awareness** | Reach, brand recall, video views | Brand building, new agent in market, market updates |
| **Traffic** | Link clicks, landing page views | Drive to listings page, blog posts, landing pages |
| **Engagement** | Post engagement, page likes, event responses | Open house events, community content, reviews |
| **Leads** | In-app lead forms, conversions | Buyer/seller lead capture, home valuation requests |
| **App Promotion** | App installs, app events | Not applicable |
| **Sales** | Conversions, catalog sales | Retargeting listing viewers, CRM audience upsell |

---

### Ad Formats

#### Single Image Ad
- **Specs:** 1080x1080 (1:1) or 1200x628 (1.91:1)
- **File type:** JPG or PNG
- **Max file size:** 30 MB
- **Primary text:** 125 characters recommended (max 2,200)
- **Headline:** 27 characters recommended (max 255)
- **Description:** 27 characters recommended
- **Best for:** Just listed, just sold, agent branding, testimonials

#### Video Ad
- **Specs:** 1080x1080 (1:1), 1080x1920 (9:16 for Stories/Reels), 1920x1080 (16:9)
- **Duration:** Up to 240 minutes (15-60 seconds recommended)
- **File type:** MP4, MOV
- **Max file size:** 4 GB
- **Best for:** Property tours, neighborhood spotlights, market updates, agent intro

#### Carousel Ad
- **Cards:** 2-10 images or videos
- **Per card:** 1080x1080, max 30 MB (image) or 4 GB (video)
- **Best for:** Multiple listings, property photo showcase, step-by-step guides

#### Collection Ad
- **Cover:** Image or video
- **Below cover:** 4 product images pulled from catalog
- **Opens:** Instant Experience (full-screen mobile)
- **Best for:** Showcasing multiple listings from a neighborhood

#### Stories Ad (Facebook & Instagram)
- **Specs:** 1080x1920 (9:16)
- **Duration:** Up to 120 seconds (video), 5 seconds (image)
- **Safe zone:** Keep text/logos within center 1080x1420 (avoid top/bottom 250px)
- **Best for:** Open house announcements, behind-the-scenes, quick market tips

#### Reels Ad (Instagram & Facebook)
- **Specs:** 1080x1920 (9:16)
- **Duration:** Up to 90 seconds
- **Best for:** Property walkthroughs, day-in-the-life, neighborhood tours

#### Instant Experience (formerly Canvas)
- **What:** Full-screen mobile landing page within Facebook/Instagram
- **Components:** Images, videos, carousels, text blocks, buttons, forms
- **Best for:** Immersive property showcases, neighborhood guides

---

### Placement Options

| Placement | Available For | Notes |
|-----------|--------------|-------|
| **Facebook Feed** | All formats | Highest reach, most versatile |
| **Instagram Feed** | All formats | Visual-first, younger demographic |
| **Instagram Stories** | Image, Video, Carousel | Full-screen vertical, 24hr ephemeral feel |
| **Instagram Reels** | Video (9:16) | Highest organic potential, younger demo |
| **Facebook Stories** | Image, Video | Similar to IG Stories, lower competition |
| **Facebook Reels** | Video (9:16) | Growing placement |
| **Facebook Marketplace** | Image, Video | High intent — users browsing to buy things |
| **Facebook Right Column** | Image | Desktop only, small format, cheap impressions |
| **Messenger** | Image, Video | Inbox ads, sponsored messages |
| **Messenger Stories** | Image, Video | Lower volume |
| **Audience Network** | Image, Video, Native | Third-party apps/sites, lower quality |
| **Instagram Explore** | Image, Video | Discovery-oriented users |
| **Facebook In-Stream Video** | Video (5-15s) | Pre-roll/mid-roll in Facebook Watch videos |

**Recommendation:** Use **Advantage+ Placements** (let Meta optimize) for most campaigns. Manually select placements only when creative is format-specific (e.g., vertical-only video for Reels/Stories).

---

### Audience Types

#### Core Audiences (Interest & Demographic Targeting)

**Demographics:**
- Age, gender, language
- Education level
- Relationship status
- Job title, industry, employer
- Life events (recently moved, newlywed, new job)

**Interests:**
- Real estate (Zillow, Realtor.com, HGTV, house hunting)
- Home improvement, interior design
- Luxury lifestyle, golf, tennis
- Local interests (Coachella Festival, Palm Springs lifestyle)

**Behaviors:**
- Likely to move
- Homeowners vs. renters
- Net worth / income brackets
- Recent home-related purchases
- Travel frequency (for vacation/second home targeting)

**IMPORTANT: Special Ad Category restrictions apply — see section below.**

---

#### Custom Audiences

| Source | Description | Min Size | Retention |
|--------|-------------|----------|-----------|
| **Website (Pixel)** | Visitors tracked by Meta Pixel (already installed: 1378421766770456) | 100 | Up to 180 days |
| **Customer List** | Upload emails, phones, names, ZIP codes from CRM | 100 matched | Until deleted |
| **Engagement** | People who engaged with your FB/IG page, posts, or ads | 100 | Up to 365 days |
| **Video Viewers** | People who watched your videos (25%, 50%, 75%, 95%) | 100 | Up to 365 days |
| **Lead Form** | People who opened or submitted your lead forms | 100 | Up to 90 days |
| **Instagram Account** | People who visited your IG profile or engaged with content | 100 | Up to 365 days |
| **Facebook Page** | People who visited or engaged with your FB page | 100 | Up to 365 days |

**Key website custom audiences to build:**
1. All website visitors (180 days)
2. Listing page viewers (60 days)
3. Neighborhood page viewers (90 days)
4. Blog/article readers (90 days)
5. Contact page visitors (30 days)
6. Lead form submitters (exclude from prospecting)

---

#### Lookalike Audiences

- Based on any Custom Audience source
- Size: 1% (most similar) to 10% (broadest reach)
- Country-specific
- Typically use 1-3% for real estate

| Source Audience | Lookalike % | Use Case |
|----------------|-------------|----------|
| Past clients (closed deals) | 1% | Highest quality — find people like your best clients |
| Lead form submitters | 1-2% | Find people likely to submit leads |
| Website visitors (listing pages) | 2-3% | Find active home shoppers |
| Engaged Instagram followers | 3-5% | Broader brand awareness |

**IMPORTANT: Lookalike audiences are limited under Special Ad Category — see below.**

---

#### Retargeting Strategies

| Strategy | Audience | Timeframe | Ad Content |
|----------|----------|-----------|------------|
| **Website Retargeting** | All site visitors excluding converters | 7-30 days | "Still looking? See new listings" |
| **Listing Viewer Retargeting** | Viewed specific listings | 3-14 days | Similar listings, price drops, open house invites |
| **Video Retargeting** | Watched 50%+ of property tour video | 14-30 days | CTA to schedule showing, more listings |
| **Engagement Retargeting** | Engaged with FB/IG posts | 30-90 days | Lead magnet, home valuation offer |
| **Lead Nurture** | Submitted form but not converted | 30-90 days | Testimonials, market reports, new listings |
| **Past Client Retargeting** | CRM upload of past clients | Ongoing | Referral requests, market updates, anniversary |

---

### Special Ad Category: Housing (CRITICAL)

Meta requires all real estate ads to be placed in the **Special Ad Category: Housing**. This significantly restricts targeting options.

**What gets restricted:**

| Feature | Normal Ads | Housing Category |
|---------|-----------|-----------------|
| **Age targeting** | Any range | Disabled (must target 18-65+) |
| **Gender targeting** | Male, Female, All | Disabled (must target All) |
| **ZIP code targeting** | Available | Disabled |
| **Detailed targeting exclusions** | Available | Disabled |
| **Lookalike audiences** | 1-10% | Replaced with "Special Ad Audiences" (less precise) |
| **Radius targeting** | 1 mile minimum | 15 mile minimum |

**What IS still available:**
- Location targeting by city, state, DMA (with 15-mile minimum radius)
- Interest targeting (inclusion only, no exclusions)
- Behavioral targeting (inclusion only)
- Custom audiences (website, customer list, engagement)
- Age range 18-65+ (cannot narrow)
- All placements
- All ad formats
- All bidding strategies

**Compliance requirements:**
- Must select "Housing" in Special Ad Category when creating campaign
- Ad copy must not discriminate based on protected classes
- Fair Housing Act applies to all ad content
- Meta can reject ads that appear to target/exclude protected groups

**Impact on wizard UI:**
- Auto-select Housing category for all campaigns
- Hide age/gender targeting controls
- Enforce 15-mile minimum on radius targeting
- Replace "Lookalike" language with "Special Ad Audience"
- Hide ZIP code targeting option
- Remove detailed targeting exclusion controls

---

### Lead Forms (In-App Lead Generation)

**How it works:** User clicks ad, a pre-filled form appears within Facebook/Instagram (no website visit needed). Form can pre-populate name, email, phone from the user's Facebook profile.

**Form fields available:**
- Pre-filled: Full name, email, phone, city, state, ZIP, address
- Custom questions: Short answer, multiple choice, conditional
- Appointment scheduling (select date/time)

**Form types:**
- **More Volume:** Pre-filled, easy submit — higher volume, lower quality
- **Higher Intent:** Adds a review step before submission — lower volume, better quality

**Post-submission options:**
- Thank you screen with CTA (visit website, call, download)
- Webhook integration (send leads to CRM in real-time)
- Download CSV from Ads Manager

**Best practices for real estate:**
- Use "Higher Intent" form type to reduce junk leads
- Pre-fill name, email, phone
- Add 1-2 qualifying questions: "Are you looking to buy or sell?", "Timeline: 0-3 months, 3-6 months, 6-12 months"
- Webhook to CRM for instant follow-up (speed to lead matters)
- Follow up within 5 minutes for best conversion

**Integration with our system:**
- Webhook endpoint receives lead data
- Auto-create contact in CRM
- Fire CAPI event for conversion tracking
- Trigger SMS/email auto-response

---

### Dynamic Ads for Real Estate

**What it is:** Meta automatically shows relevant listings to interested users based on their browsing behavior, using a property catalog.

**How it works:**
1. Upload a property catalog (feed of listings with images, price, location, URL)
2. Meta Pixel tracks which listings users view on your website
3. Meta automatically retargets users with the specific listings they viewed, or similar listings

**Catalog requirements:**

| Field | Required | Description |
|-------|----------|-------------|
| home_listing_id | Yes | Unique ID for each listing |
| name | Yes | Listing title |
| image | Yes | Array of image URLs |
| address | Yes | Street address, city, state, ZIP |
| price | Yes | Listing price |
| url | Yes | Listing detail page URL |
| availability | Yes | for_sale, for_rent, recently_sold |
| description | Recommended | Listing description |
| num_beds | Recommended | Bedrooms |
| num_baths | Recommended | Bathrooms |
| area_size | Recommended | Square footage |
| property_type | Recommended | house, condo, townhouse, etc. |
| year_built | Optional | Year built |
| latitude/longitude | Recommended | For location-based delivery |

**Campaign types:**
- **Retargeting:** Show users the exact listings they viewed
- **Broad audience:** Show listings to people likely interested based on signals
- **Cross-sell:** Show related listings to past viewers

**Best real estate use cases:**
- Retargeting listing page visitors with the homes they viewed
- Showing new listings to engaged website visitors
- "You might also like" recommendations

---

### Meta Creative Best Practices & Size Requirements

#### Image Specifications Summary

| Placement | Recommended Size | Aspect Ratio | Max File Size |
|-----------|-----------------|--------------|---------------|
| Feed (FB + IG) | 1080x1080 | 1:1 | 30 MB |
| Feed (landscape) | 1200x628 | 1.91:1 | 30 MB |
| Stories / Reels | 1080x1920 | 9:16 | 30 MB |
| Carousel | 1080x1080 | 1:1 | 30 MB |
| Right Column | 1200x628 | 1.91:1 | 30 MB |
| Marketplace | 1080x1080 | 1:1 | 30 MB |

#### Video Specifications Summary

| Placement | Recommended Size | Aspect Ratio | Max Duration | Max File Size |
|-----------|-----------------|--------------|-------------|---------------|
| Feed | 1080x1080 or 1920x1080 | 1:1 or 16:9 | 240 min | 4 GB |
| Stories / Reels | 1080x1920 | 9:16 | 90 sec (Reels), 120 sec (Stories) | 4 GB |
| In-Stream | 1920x1080 | 16:9 | 5-15 sec | 4 GB |

#### Text Recommendations

| Element | Recommended | Maximum |
|---------|------------|---------|
| Primary text | 125 chars | 2,200 chars |
| Headline | 27 chars | 255 chars |
| Description | 27 chars | 255 chars |
| CTA Button | Select from predefined list | — |

**Available CTA buttons:** Learn More, Sign Up, Contact Us, Get Quote, Apply Now, Book Now, Download, Send Message, Call Now, Shop Now, Watch More

#### Creative Tips for Real Estate
- Lead with the property hero shot (exterior or best interior)
- Include price and key details (beds/baths/sqft) in the image or first 2 seconds of video
- Use carousel format to show multiple rooms/angles
- For video: hook in first 3 seconds, keep under 30 seconds for best completion rates
- Include agent branding (photo, name, brokerage) for trust
- Use testimonial quotes as ad copy
- Seasonal messaging works well ("Spring Market", "Holiday Buyers")

---

### Meta Budget Recommendations

| Campaign Type | Minimum Daily Budget | Recommended Monthly Budget | Expected CPL |
|--------------|---------------------|---------------------------|-------------|
| Lead Gen (lead forms) | $10/day | $500-$1,500 | $5-$25 |
| Traffic to website | $10/day | $300-$800 | N/A (CPC: $0.50-$2.00) |
| Retargeting (website) | $5/day | $150-$500 | $3-$15 |
| Brand Awareness | $5/day | $150-$500 | N/A (CPM: $5-$15) |
| Video Views | $5/day | $150-$500 | N/A (CPV: $0.01-$0.05) |
| Dynamic Ads (catalog) | $10/day | $300-$1,000 | $10-$30 |

**Notes:**
- Meta requires a minimum of ~$1/day per ad set, but performance is poor below $5/day
- The learning phase requires ~50 conversions per week per ad set — budget accordingly
- Coachella Valley audience size is smaller than major metros, so budgets can be lower
- Meta is typically cheaper per lead than Google for real estate but leads are lower intent
- Best results come from combining lead gen + retargeting

---

### Meta Conversion Tracking

**Already configured:**
- Meta Pixel: `1378421466770456` (installed on site)
- Conversions API (CAPI): Server-side event tracking via permanent token
- Events tracked: PageView, Lead, ViewContent

**Additional events to implement:**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `Lead` | Form submission | content_name, content_category |
| `ViewContent` | Listing page view | content_ids, content_type, value |
| `Search` | Search/filter listings | search_string, content_category |
| `Contact` | Phone call click, email click | content_name |
| `Schedule` | Tour/showing request | content_name |
| `FindLocation` | Neighborhood page view | content_name, city |

---

## Platform Comparison Table

### Which Platform for Which Use Case

| Use Case | Google Ads | Meta Ads | Winner | Why |
|----------|-----------|----------|--------|-----|
| **Buyer leads (high intent)** | Search campaigns | Lead forms | **Google** | User is actively searching — highest intent |
| **Seller leads** | Search ("sell my home") | Lead forms with home valuation offer | **Google** | Seller searches are high-intent; Meta works as supplement |
| **Brand awareness** | Display, YouTube | Feed ads, Stories, Reels | **Meta** | Cheaper CPM, better visual storytelling |
| **Just Listed promotion** | Display (geo-targeted) | Feed + Stories | **Meta** | Visual platform, easy to create, good geo targeting |
| **Just Sold promotion** | Display (geo-targeted) | Feed + Stories | **Meta** | Social proof works well in social feeds |
| **Open House** | Local campaigns, Display | Event ads, Stories | **Meta** | Easy to create, event RSVP, Stories urgency |
| **Retargeting site visitors** | Display remarketing | Website custom audience | **Tie** | Both effective; run both for frequency |
| **Listing retargeting** | Display (limited) | Dynamic Ads catalog | **Meta** | Dynamic ads show exact listings viewed |
| **Neighborhood farming** | Display by ZIP | Interest + location targeting | **Meta** | Cheaper reach, better creative options |
| **Agent recruitment** | Search ("join brokerage") | Job title targeting | **Google** | Lower volume but higher intent |
| **Relocation leads** | Search ("moving to Palm Springs") | Interest + behavior targeting | **Google** | Captures active intent to move |
| **Luxury market** | Search + Display | Interest + income targeting | **Both** | Google for intent, Meta for aspiration |
| **Past client nurture** | Customer Match display | Custom audience | **Meta** | More natural touchpoint in social feed |
| **Market update content** | YouTube | Video + Reels | **Meta** | Better organic amplification potential |
| **CMA / home valuation** | Search ("home value estimate") | Lead form with value prop | **Google** | Highest intent, but Meta can scale volume |

### Cost Comparison

| Metric | Google Ads | Meta Ads |
|--------|-----------|----------|
| Average CPC | $1.50-$5.00 | $0.50-$2.00 |
| Average CPM | $5-$15 | $5-$15 |
| Average CPL (lead gen) | $20-$75 | $5-$25 |
| Lead quality | Higher (active intent) | Lower (passive interest) |
| Lead-to-client conversion | 3-8% | 1-3% |
| Time to first lead | 1-3 days | 1-2 days |
| Learning period | 2-4 weeks | 1-2 weeks |
| Effective cost per closed deal | $1,500-$5,000 | $1,500-$5,000 |

---

## Implementation Priority

### Phase 1: Foundation (Build First — Highest ROI, Lowest Complexity)

**Priority 1: Meta Lead Form Campaign**
- **ROI:** High — cheapest leads, fastest results
- **Complexity:** Low — no catalog needed, simple setup
- **Wizard steps:**
  1. Choose objective (auto-select "Leads")
  2. Set budget (daily, with preset recommendations)
  3. Choose location (city/radius, enforce 15-mile minimum for housing)
  4. Select/create audience (core interests, custom, or special ad audience)
  5. Upload creative (image/video + copy)
  6. Build lead form (pre-built templates: "Home Valuation", "Buyer Inquiry", "Seller Inquiry")
  7. Review and launch
- **API:** Meta Marketing API — `POST /{ad-account-id}/campaigns`

**Priority 2: Meta Website Traffic / Retargeting Campaign**
- **ROI:** High — retargeting has best ROAS in digital advertising
- **Complexity:** Low — Pixel already installed, CAPI already configured
- **Wizard steps:**
  1. Choose audience source (website visitors, listing viewers, engagement)
  2. Set lookback window (7, 14, 30, 60, 90, 180 days)
  3. Set budget
  4. Upload creative
  5. Set destination URL (listing page, landing page, home page)
  6. Review and launch

**Priority 3: Google Search Campaign**
- **ROI:** Highest quality leads
- **Complexity:** Medium — requires keyword research, ad copy, landing pages
- **Wizard steps:**
  1. Choose campaign goal (buyer leads, seller leads, brand)
  2. Select keyword theme (pre-built groups: "homes for sale [city]", "sell my home [city]", "realtor [city]")
  3. Set geographic targeting (city, radius, ZIP)
  4. Set budget (daily, with recommendations by market)
  5. Write ad copy (or use AI-generated templates)
  6. Add extensions (sitelinks, callouts, call)
  7. Set bidding strategy (default: Maximize Clicks for new campaigns)
  8. Review and launch
- **API:** Google Ads API — `CustomerService`, `CampaignService`, `AdGroupService`

---

### Phase 2: Growth (Build Second — Good ROI, Medium Complexity)

**Priority 4: Meta "Just Listed" / "Just Sold" Quick Campaign**
- **Complexity:** Low (template-driven)
- **Implementation:** Pre-built templates that auto-populate from listing data
  - Pull listing photo, price, beds/baths, address from our database
  - Agent selects listing from dropdown
  - Auto-generate ad copy with AI
  - Default to 10-mile radius around listing address
  - Default budget: $5-$10/day for 7-14 days
- **API:** Same Meta Marketing API, but with template system

**Priority 5: Google Local Services Ads**
- **Complexity:** Medium (requires Google verification, separate from Google Ads)
- **ROI:** Excellent — pay per lead, Google Screened badge
- **Implementation:** Guide agent through setup process (external to our dashboard initially)
  - Link to LSA enrollment
  - Track leads in CRM via call tracking integration

**Priority 6: Google Performance Max**
- **Complexity:** Medium-High (many asset types required)
- **Implementation:** Asset group builder in wizard
  - Upload multiple images, headlines, descriptions
  - Link YouTube videos
  - Set audience signals from CRM data
  - Geographic targeting

---

### Phase 3: Advanced (Build Later — Specialized, Higher Complexity)

**Priority 7: Meta Dynamic Ads (Listing Catalog)**
- **Complexity:** High — requires property catalog feed, ongoing sync
- **Implementation:**
  - Build catalog feed from our listing database (auto-sync nightly)
  - Map listing fields to Meta catalog schema
  - Create retargeting and broad audience campaigns
- **Dependencies:** Catalog feed API, listing data pipeline

**Priority 8: Google Display Campaigns**
- **Complexity:** Medium
- **Implementation:** Responsive display ad builder
  - Image upload/crop tool
  - Headline/description templates
  - Audience selection (remarketing, in-market, custom)

**Priority 9: YouTube Video Campaigns**
- **Complexity:** Medium-High (requires video content)
- **Implementation:**
  - YouTube channel linking
  - Video selection from linked channel
  - Audience and geo targeting
  - Budget and bidding setup

**Priority 10: Google Demand Gen Campaigns**
- **Complexity:** Medium
- **Implementation:** Similar to Display but with carousel support

---

### Wizard UI Architecture Summary

```
Campaign Wizard
├── Step 1: Platform Selection
│   ├── Meta (Facebook/Instagram)
│   └── Google Ads
│
├── Step 2: Campaign Type (filtered by platform)
│   ├── Meta: Lead Gen | Retargeting | Just Listed/Sold | Brand Awareness
│   └── Google: Search | Display | Performance Max | Video
│
├── Step 3: Audience
│   ├── Location (map picker with radius, city, ZIP)
│   ├── Audience type (new, retargeting, custom list, lookalike/special ad)
│   └── Interest/behavior layering (if applicable)
│
├── Step 4: Creative
│   ├── Image/video upload
│   ├── Ad copy (AI-assisted generation)
│   ├── Preview by placement
│   └── Lead form builder (if lead gen)
│
├── Step 5: Budget & Schedule
│   ├── Daily/lifetime budget
│   ├── Start/end dates
│   ├── Bidding strategy
│   └── Budget recommendations
│
└── Step 6: Review & Launch
    ├── Campaign summary
    ├── Estimated reach/results
    ├── Compliance check (housing category)
    └── Submit to platform API
```

---

### API Requirements Summary

| Platform | API | Auth Method | Key Endpoints |
|----------|-----|-------------|--------------|
| **Meta Marketing API** | Graph API v21.0 | OAuth 2.0 + System User Token | Campaigns, Ad Sets, Ads, Custom Audiences, Lead Forms, Product Catalogs |
| **Google Ads API** | REST / gRPC (v17) | OAuth 2.0 + Developer Token | Campaigns, Ad Groups, Ads, Keywords, Audiences, Conversions |
| **Google LSA** | Local Services API (limited) | OAuth 2.0 | Lead retrieval only (campaign management via LSA portal) |

**Meta API access levels:**
- Standard access: Up to 300 API calls/hour — sufficient for campaign management
- Requires: Facebook App, Business Manager, Ad Account, System User

**Google Ads API access levels:**
- Basic access: 15,000 operations/day — sufficient for campaign management
- Requires: Google Ads Manager Account, Developer Token (apply via Google Ads), OAuth credentials

---

### Key Data Points for the Dashboard

**Campaign metrics to display:**

| Metric | Google | Meta | Description |
|--------|--------|------|-------------|
| Impressions | Yes | Yes | Times ad was shown |
| Clicks | Yes | Yes | Times ad was clicked |
| CTR | Yes | Yes | Click-through rate |
| CPC | Yes | Yes | Cost per click |
| CPM | Yes | Yes | Cost per 1,000 impressions |
| Conversions | Yes | Yes | Leads, form fills, calls |
| CPL | Yes | Yes | Cost per lead |
| Spend | Yes | Yes | Total amount spent |
| ROAS | Yes | Yes | Return on ad spend |
| Reach | Limited | Yes | Unique people who saw ad |
| Frequency | Limited | Yes | Average times each person saw ad |
| Video views | Yes | Yes | Video view counts (by % watched) |
| Quality Score | Yes (keywords) | Yes (relevance) | Ad quality indicator |

---

*This document is a planning reference for the campaign wizard implementation. Specs and pricing are current as of April 2026 but should be verified against platform documentation before implementation.*
