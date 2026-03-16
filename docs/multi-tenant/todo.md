# ChatRealty Multi-Tenant Platform - Implementation TODO

**Created**: March 16, 2026
**Target**: 24-week build (Phase 1)
**Current Phase**: Phase 1 - jpsrealtor.com Multi-Tenant Foundation

---

## 🎯 OVERVIEW

This TODO tracks the transformation of jpsrealtor.com into the ChatRealty multi-tenant platform. We are NOT cloning the site - we're building multi-tenancy directly into the current codebase, with Joseph as Tenant #1.

**Strategy**:
1. Build on jpsrealtor.com (Weeks 1-24)
2. Rebrand domain to chatrealty.io (DNS change)
3. Map jpsrealtor.com to tenant route (custom domain)
4. Recruit Agent #2 (validate multi-tenancy)

---

## 📅 PHASE 1: WEEKS 1-2 - DATA LAYER

### User Model Extensions

- [ ] **1.1 Create agentProfile Schema**
  - [ ] Add agentProfile interface to User model
  - [ ] Photos & media fields (headshot, heroPhoto, videoIntro, etc.)
  - [ ] Custom backgrounds object (4 variations)
  - [ ] Branding fields (tagline, bio, specialties, servingAreas)
  - [ ] Social links object
  - [ ] Stats object (yearsExperience, salesVolume, etc.)
  - [ ] Contact info object
  - [ ] Testimonials array
  - [ ] MLS data sources array (GeoJSON coverage)
  - [ ] Licenses array (state, number, verified)
  - [ ] Team relationship fields
  - [ ] Landing page settings object
  - [ ] Subscription & billing fields
  - [ ] Sponsored clients tracking
  - File: `src/models/User.ts`

- [ ] **1.2 Add Client-Side User Fields**
  - [ ] agentRelationship (ObjectId reference)
  - [ ] representationAgreement object
  - [ ] subscriptionTier enum
  - [ ] subscriptionStatus enum
  - [ ] sponsoredBy (ObjectId if agent paying)
  - [ ] usageLimits object (AI queries, browsing time, actions)
  - File: `src/models/User.ts`

- [ ] **1.3 Update User TypeScript Types**
  - [ ] Create agentProfile interface types
  - [ ] Export types for components
  - [ ] Update session types
  - File: `src/types/agent.ts` (new file)

### New Models

- [ ] **1.4 Create Team Model**
  - [ ] Team schema (name, slug, leaderId, memberIds)
  - [ ] Team branding fields
  - [ ] Blog posts references
  - [ ] Timestamps
  - [ ] Indexes (slug, leaderId)
  - File: `src/models/Team.ts` (new file)

- [ ] **1.5 Create Transaction Model**
  - [ ] Transaction schema (listing, buyer, seller)
  - [ ] Agent IDs (closing, referring, dataSource, handoff)
  - [ ] Gross commission
  - [ ] Fee breakdown object
  - [ ] Net to closing agent
  - [ ] Status tracking
  - [ ] Billing fields
  - [ ] Timestamps
  - File: `src/models/Transaction.ts` (new file)

- [ ] **1.6 Create AgentMatch Model**
  - [ ] Match schema (userId, agentId)
  - [ ] Source tracking (swipe, direct, handoff)
  - [ ] Agent response status
  - [ ] Handoff tracking
  - [ ] Fee fields
  - [ ] Timestamps
  - File: `src/models/AgentMatch.ts` (new file)

### Listing Model Updates

- [ ] **1.7 Add Data Attribution to Listings**
  - [ ] Add dataSource object to UnifiedListing model
  - [ ] agentId (data broker)
  - [ ] mlsName, mlsId
  - [ ] contributedAt timestamp
  - [ ] Optional tenantId for future full multi-tenant
  - File: `src/models/unified-listing.ts`

### Database Indexes

- [ ] **1.8 Create Database Indexes**
  - [ ] User: agentProfile.landingPageSettings.slug
  - [ ] User: agentProfile.mlsDataSources (geospatial)
  - [ ] User: agentRelationship
  - [ ] User: representationAgreement.expiresAt
  - [ ] Team: slug
  - [ ] Transaction: closingAgentId, listingKey
  - [ ] AgentMatch: userId, agentId, agentStatus
  - [ ] UnifiedListing: dataSource.agentId
  - Script: `scripts/add-indexes.ts` (new file)

### Migration Scripts

- [ ] **1.9 Create Migration for Existing Data**
  - [ ] Migrate Joseph's data to agentProfile structure
  - [ ] Set Joseph as first data broker (GPS + CRMLS)
  - [ ] Backfill dataSource on existing listings
  - [ ] Create default landingPageSettings for Joseph
  - Script: `scripts/migrate-to-multi-tenant.ts` (new file)

---

## 📅 PHASE 1: WEEKS 3-4 - ASSET UPLOAD SYSTEM

### Cloudinary Integration

- [ ] **2.1 Setup Cloudinary Configuration**
  - [ ] Add Cloudinary credentials to .env
  - [ ] Install cloudinary SDK: `npm install cloudinary`
  - [ ] Create cloudinary config file
  - [ ] Setup upload presets (agent_assets)
  - [ ] Configure folder structure (agents/{agentId}/{assetType})
  - File: `src/lib/cloudinary.ts` (new file)

- [ ] **2.2 Image Transformation Utilities**
  - [ ] Create transformation configs:
    - Headshot: 400x400, crop fill, auto quality
    - Hero: 1920x1080, crop fill
    - Background Desktop: 1920x1080
    - Background Mobile: 750x1334
    - Logo: 500x500, transparent
  - [ ] Create helper functions for transformations
  - File: `src/lib/cloudinary.ts`

### Upload API Endpoints

- [ ] **2.3 Photo Upload API**
  - [ ] POST /api/agent/profile/upload
  - [ ] Accept multipart/form-data
  - [ ] Validate file type (images only)
  - [ ] Validate file size (max 10MB)
  - [ ] Upload to Cloudinary
  - [ ] Apply transformations based on assetType
  - [ ] Return secure URL
  - [ ] Update User.agentProfile with URL
  - File: `src/app/api/agent/profile/upload/route.ts` (new file)

- [ ] **2.4 Batch Upload API** (for galleries)
  - [ ] POST /api/agent/profile/upload-batch
  - [ ] Accept multiple files
  - [ ] Process in parallel
  - [ ] Return array of URLs
  - File: `src/app/api/agent/profile/upload-batch/route.ts` (new file)

- [ ] **2.5 Delete Asset API**
  - [ ] DELETE /api/agent/profile/upload
  - [ ] Accept Cloudinary public_id
  - [ ] Delete from Cloudinary
  - [ ] Remove URL from User.agentProfile
  - File: `src/app/api/agent/profile/upload/route.ts`

### Asset Management Utilities

- [ ] **2.6 Upload Helper Functions**
  - [ ] uploadAgentAsset(file, agentId, assetType)
  - [ ] deleteAgentAsset(publicId)
  - [ ] getOptimizedUrl(publicId, transformation)
  - [ ] validateImageFile(file)
  - File: `src/lib/upload-utils.ts` (new file)

---

## 📅 PHASE 1: WEEKS 5-6 - AGENT DASHBOARD

### Profile Management API

- [ ] **3.1 Get Agent Profile API**
  - [ ] GET /api/agent/profile
  - [ ] Require authentication
  - [ ] Return agentProfile from User model
  - [ ] Include asset URLs
  - File: `src/app/api/agent/profile/route.ts` (new file)

- [ ] **3.2 Update Agent Profile API**
  - [ ] PUT /api/agent/profile
  - [ ] Validate all fields
  - [ ] Update User.agentProfile
  - [ ] Return updated profile
  - File: `src/app/api/agent/profile/route.ts`

### Dashboard UI Components

- [ ] **3.3 Agent Dashboard Layout**
  - [ ] Create dashboard route: /agent/dashboard
  - [ ] Sidebar navigation
  - [ ] Sections: Profile, Assets, Content, Stats, Settings
  - [ ] Mobile responsive layout
  - [ ] Theme-aware styling
  - File: `src/app/agent/dashboard/layout.tsx` (new file)

- [ ] **3.4 Photo Upload Components**
  - [ ] PhotoUploader component (drag-and-drop)
  - [ ] Preview before upload
  - [ ] Progress indicator
  - [ ] Crop/edit interface (optional)
  - [ ] Upload success/error states
  - [ ] Support for all asset types:
    - Headshot
    - Hero photo
    - Team photo
    - Office photo
    - Gallery (multiple)
    - Custom backgrounds (4 variations)
    - Logo
  - File: `src/app/components/admin/PhotoUploader.tsx` (new file)

- [ ] **3.5 Background Upload Manager**
  - [ ] Separate component for 4 background variations
  - [ ] Preview for each (light/dark, desktop/mobile)
  - [ ] Upload all at once or individually
  - [ ] Responsive preview
  - File: `src/app/components/admin/BackgroundUploader.tsx` (new file)

- [ ] **3.6 Bio & Content Editors**
  - [ ] Tagline input (single line, max chars)
  - [ ] Bio editor (Markdown supported, rich text preview)
  - [ ] Specialties multi-select (pills/chips)
  - [ ] Serving areas input (autocomplete cities)
  - File: `src/app/components/admin/ContentEditor.tsx` (new file)

- [ ] **3.7 Contact Info Form**
  - [ ] Phone input with validation
  - [ ] Email input
  - [ ] Website URL
  - [ ] Office address (autocomplete)
  - File: `src/app/components/admin/ContactInfoForm.tsx` (new file)

- [ ] **3.8 Social Links Form**
  - [ ] Inputs for all platforms:
    - Facebook, Instagram, LinkedIn
    - YouTube, Twitter, TikTok
  - [ ] URL validation
  - [ ] Show/hide preview
  - File: `src/app/components/admin/SocialLinksForm.tsx` (new file)

- [ ] **3.9 Stats & Achievements Form**
  - [ ] Years experience (number input)
  - [ ] Sales volume (currency input)
  - [ ] Transactions completed
  - [ ] Average rating (stars)
  - [ ] Auto-calculate from transactions (future)
  - File: `src/app/components/admin/StatsForm.tsx` (new file)

- [ ] **3.10 Testimonial Manager**
  - [ ] List all testimonials
  - [ ] Add new testimonial form:
    - Client name
    - Client initials (privacy option)
    - Rating (1-5 stars)
    - Testimonial text
    - Property type
    - Date
    - Featured toggle
  - [ ] Edit testimonial
  - [ ] Delete testimonial
  - [ ] Reorder testimonials (drag-and-drop)
  - File: `src/app/components/admin/TestimonialManager.tsx` (new file)

- [ ] **3.11 MLS Data Source Form**
  - [ ] Add MLS source:
    - Name, MLS ID
    - Coverage (cities, counties, states)
    - Upload GeoJSON file OR draw on map
    - Data share agreement checkbox
  - [ ] List existing MLS sources
  - [ ] Edit/update coverage
  - [ ] View coverage on map
  - File: `src/app/components/admin/MLSSourceForm.tsx` (new file)

- [ ] **3.12 License Verification Form**
  - [ ] Add license:
    - State dropdown
    - License number
    - Issue date, expiration date
  - [ ] List existing licenses
  - [ ] Admin verification status
  - [ ] Upload license doc (proof)
  - File: `src/app/components/admin/LicenseForm.tsx` (new file)

- [ ] **3.13 Landing Page Settings**
  - [ ] Enable/disable landing page toggle
  - [ ] Slug input (URL-friendly, unique)
  - [ ] Custom domain input
  - [ ] Domain verification status
  - [ ] Meta title/description (SEO)
  - [ ] CTA text customization
  - [ ] Preview button (open landing page in new tab)
  - File: `src/app/components/admin/LandingPageSettings.tsx` (new file)

### Dashboard Pages

- [ ] **3.14 Dashboard Home**
  - [ ] Overview stats
  - [ ] Recent activity
  - [ ] Quick actions
  - File: `src/app/agent/dashboard/page.tsx` (new file)

- [ ] **3.15 Profile Page**
  - [ ] All forms above in organized sections
  - [ ] Save button (calls PUT /api/agent/profile)
  - [ ] Success/error notifications
  - File: `src/app/agent/dashboard/profile/page.tsx` (new file)

---

## 📅 PHASE 1: WEEKS 7-8 - LANDING PAGE TRANSFORMATION

### Transform Insights Page

- [ ] **4.1 Agent Hero Section Component**
  - [ ] Agent headshot (circular or rounded)
  - [ ] Name, tagline, credentials
  - [ ] Coverage area
  - [ ] Stats badges (years, sales volume)
  - [ ] CTA buttons (Start Searching, View Listings, Contact)
  - [ ] Theme-aware styling
  - [ ] Mobile responsive
  - File: `src/app/components/agent-landing/HeroSection.tsx` (new file)

- [ ] **4.2 About Section Component**
  - [ ] Agent bio (Markdown rendering)
  - [ ] Photo gallery (optional)
  - [ ] Video intro embed (if provided)
  - [ ] "Why work with me" value props
  - File: `src/app/components/agent-landing/AboutSection.tsx` (new file)

- [ ] **4.3 Stats Showcase Component**
  - [ ] 3-4 column grid
  - [ ] Animated counters (years, sales, transactions)
  - [ ] Icons for each stat
  - [ ] Theme-aware colors
  - File: `src/app/components/agent-landing/StatsSection.tsx` (new file)

- [ ] **4.4 Specialties Section Component**
  - [ ] List of specialties with icons
  - [ ] Hover effects
  - [ ] Grid layout
  - File: `src/app/components/agent-landing/SpecialtiesSection.tsx` (new file)

- [ ] **4.5 Testimonials Carousel Component**
  - [ ] Auto-rotating carousel
  - [ ] Star ratings
  - [ ] Client name/initials
  - [ ] Property type
  - [ ] Navigation dots
  - [ ] Swipe support (mobile)
  - File: `src/app/components/agent-landing/TestimonialsSection.tsx` (new file)

- [ ] **4.6 Tools Showcase Component**
  - [ ] Tab switcher (AI Chat | Interactive Map)
  - [ ] Demo screenshots or live preview
  - [ ] Feature bullets
  - [ ] "Try it now" CTA
  - File: `src/app/components/agent-landing/ToolsShowcase.tsx` (new file)

- [ ] **4.7 Social Proof Section**
  - [ ] Awards/certifications
  - [ ] Team affiliation (eXp Realty)
  - [ ] Professional associations
  - File: `src/app/components/agent-landing/SocialProofSection.tsx` (new file)

- [ ] **4.8 Final CTA Section**
  - [ ] Large hero CTA
  - [ ] Multiple action buttons
  - [ ] Contact info
  - [ ] Social media links
  - File: `src/app/components/agent-landing/CTASection.tsx` (new file)

- [ ] **4.9 Social Links Component**
  - [ ] Icon bar with all social platforms
  - [ ] Hover effects
  - [ ] Open in new tab
  - File: `src/app/components/agent-landing/SocialLinks.tsx` (new file)

### Landing Page Layout

- [ ] **4.10 Agent Landing Page Route**
  - [ ] Create /agent/[slug]/[license]/landing route
  - [ ] Fetch agent by slug
  - [ ] 404 if agent not found or landing disabled
  - [ ] Render all sections in order
  - [ ] Pass agent data to components
  - File: `src/app/agent/[slug]/[license]/landing/page.tsx` (new file)

- [ ] **4.11 Landing Page Layout Component**
  - [ ] Custom background (agent's 4 variations)
  - [ ] Smooth scroll
  - [ ] Sticky header
  - [ ] Theme toggle in header
  - File: `src/app/agent/[slug]/[license]/landing/layout.tsx` (new file)

- [ ] **4.12 Metadata Generation**
  - [ ] Dynamic generateMetadata() function
  - [ ] Use agent's metaTitle or generate from name/area
  - [ ] Use agent's metaDescription or generate
  - [ ] OpenGraph tags (with agent headshot)
  - [ ] Twitter card tags
  - [ ] Schema.org structured data (Person, RealEstateAgent)
  - File: `src/app/agent/[slug]/[license]/landing/page.tsx`

### Home Page Redirect

- [ ] **4.13 Update Root Home Page**
  - [ ] Redirect / to Joseph's landing page for now
  - [ ] Later: Becomes ChatRealty.io home
  - File: `src/app/page.tsx`

---

## 📅 PHASE 1: WEEKS 9-10 - CUSTOM BACKGROUNDS & THEME SYSTEM

### Background System

- [ ] **5.1 Update ThemeContext for Custom Backgrounds**
  - [ ] Add customBackgrounds to theme state
  - [ ] Load agent's custom backgrounds from agentProfile
  - [ ] Fall back to default SpaticalBackground if no custom
  - [ ] Handle 4 variations:
    - Light desktop
    - Light mobile
    - Dark desktop
    - Dark mobile
  - File: `src/app/contexts/ThemeContext.tsx`

- [ ] **5.2 Custom Background Component**
  - [ ] Detect current theme (light/dark)
  - [ ] Detect device (desktop/mobile)
  - [ ] Load appropriate background image
  - [ ] Optimize image loading (lazy, blur placeholder)
  - [ ] CSS background styles (cover, center, fixed)
  - File: `src/app/components/backgrounds/CustomBackground.tsx` (new file)

- [ ] **5.3 Update SpaticalBackground Wrapper**
  - [ ] Check if custom backgrounds exist
  - [ ] If yes → render CustomBackground
  - [ ] If no → render default SpaticalBackground
  - File: `src/app/components/backgrounds/SpaticalBackground.tsx`

### Theme Transition Updates

- [ ] **5.4 Fetch Agent's Featured Listings**
  - [ ] Query listings where agentId matches
  - [ ] If no agent listings → query team listings
  - [ ] If no team listings → query brokerage listings
  - [ ] Cache in memory for transitions
  - File: `src/lib/theme/featured-listings.ts` (new file)

- [ ] **5.5 Update Theme Transition Overlay**
  - [ ] Load agent's headshot (bottom right)
  - [ ] Transparent PNG overlay, absolute positioned
  - [ ] Contact info (bottom left):
    - Agent name
    - License number
    - Phone
    - Email
    - Website
  - [ ] Pull from User.agentProfile.contactInfo
  - [ ] Property details center (existing)
  - File: `src/app/contexts/ThemeContext.tsx`

- [ ] **5.6 Featured Listing Logic**
  - [ ] Function: getAgentFeaturedListing(agentId)
  - [ ] Priority:
    1. Agent's own listings
    2. Team listings
    3. Brokerage listings (eXp Obsidian)
  - [ ] Random selection from available pool
  - File: `src/lib/theme/featured-listings.ts`

- [ ] **5.7 Update playExitAnimation()**
  - [ ] Use agent's featured listing
  - [ ] Add agent branding overlay
  - File: `src/app/contexts/ThemeContext.tsx`

- [ ] **5.8 Update playEnterAnimation()**
  - [ ] Use different agent listing than exit
  - [ ] Add agent branding overlay
  - File: `src/app/contexts/ThemeContext.tsx`

---

## 📅 PHASE 1: WEEKS 11-12 - SUBSCRIPTION & FEATURE GATES

### Subscription System

- [ ] **6.1 Stripe Integration Setup**
  - [ ] Install stripe SDK: `npm install stripe @stripe/stripe-js`
  - [ ] Add Stripe keys to .env
  - [ ] Create Stripe config
  - File: `src/lib/stripe.ts` (new file)

- [ ] **6.2 Create Stripe Products & Prices**
  - [ ] Create products in Stripe Dashboard:
    - Pro ($10/mo)
    - Ultimate ($20/mo)
    - Investor ($99/mo)
  - [ ] Get price IDs
  - [ ] Store in environment variables
  - Script: `scripts/setup-stripe-products.ts` (new file)

- [ ] **6.3 Subscription Checkout API**
  - [ ] POST /api/subscription/checkout
  - [ ] Create Stripe Checkout Session
  - [ ] Redirect to Stripe hosted page
  - [ ] Handle success/cancel URLs
  - File: `src/app/api/subscription/checkout/route.ts` (new file)

- [ ] **6.4 Stripe Webhook Handler**
  - [ ] POST /api/webhooks/stripe
  - [ ] Verify webhook signature
  - [ ] Handle events:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed
  - [ ] Update User.subscriptionTier and status
  - File: `src/app/api/webhooks/stripe/route.ts` (new file)

- [ ] **6.5 Subscription Management API**
  - [ ] GET /api/subscription - Get current subscription
  - [ ] POST /api/subscription/cancel - Cancel subscription
  - [ ] POST /api/subscription/update - Upgrade/downgrade
  - File: `src/app/api/subscription/route.ts` (new file)

### Usage Tracking

- [ ] **6.6 Usage Tracking Middleware**
  - [ ] Track AI queries per user per day
  - [ ] Track browsing time (session-based)
  - [ ] Track actions (page views, clicks)
  - [ ] Reset daily at midnight
  - [ ] Store in User.usageLimits
  - File: `src/middleware/usage-tracking.ts` (new file)

- [ ] **6.7 Usage Limit Checker**
  - [ ] Function: checkUsageLimit(userId, limitType)
  - [ ] Return: { allowed: boolean, remaining: number }
  - [ ] Limit types: aiQuery, browsingTime, actions
  - [ ] Check against tier limits
  - File: `src/lib/usage-limits.ts` (new file)

- [ ] **6.8 Usage Reset Cron Job**
  - [ ] Daily cron at midnight
  - [ ] Reset usageLimits.aiQueriesUsedToday
  - [ ] Reset usageLimits.browsingMinutesUsedToday
  - [ ] Reset usageLimits.actionsUsedToday
  - [ ] Update usageLimits.lastResetAt
  - Script: `scripts/reset-usage-limits.ts` (new file)

### Feature Gates

- [ ] **6.9 Feature Gate Middleware (AI Chat)**
  - [ ] Check tier before allowing AI query
  - [ ] Anonymous: Block all AI
  - [ ] Free: 3-5 queries per day
  - [ ] Pro: 20-30 queries per day
  - [ ] Ultimate/Investor: Unlimited
  - [ ] Return 402 Payment Required if exceeded
  - File: `src/middleware/feature-gates.ts` (new file)

- [ ] **6.10 Feature Gate Middleware (Advanced AI)**
  - [ ] Tools: comps, cashflow, appreciation, draft offer
  - [ ] Free: 0 per day
  - [ ] Pro: 5 per day
  - [ ] Ultimate: Unlimited
  - [ ] Investor: Unlimited + advanced tools
  - File: `src/middleware/feature-gates.ts`

- [ ] **6.11 Browsing Time Gate (Anonymous)**
  - [ ] Track session start time
  - [ ] Alert at 5 min, 10 min
  - [ ] Block at 15 min
  - [ ] Show upgrade modal
  - [ ] Reset on login
  - File: `src/lib/browsing-timer.ts` (new file)

- [ ] **6.12 Action Limit Gate (Anonymous)**
  - [ ] Track clicks, page views
  - [ ] Limit: 20 actions
  - [ ] Show upgrade modal at limit
  - File: `src/lib/action-tracker.ts` (new file)

### Upgrade UI Components

- [ ] **6.13 Upgrade Modal Component**
  - [ ] Triggered when limits hit
  - [ ] Show tier comparison table
  - [ ] Highlight current tier
  - [ ] "Upgrade Now" buttons
  - [ ] Close/dismiss (stay on current tier)
  - File: `src/app/components/modals/UpgradeModal.tsx` (new file)

- [ ] **6.14 Usage Indicator Component**
  - [ ] Show remaining queries/time
  - [ ] Progress bar
  - [ ] Subtle, non-intrusive
  - [ ] Update in real-time
  - File: `src/app/components/usage/UsageIndicator.tsx` (new file)

- [ ] **6.15 Tier Badge Component**
  - [ ] Show user's current tier (header/profile)
  - [ ] Free, Pro, Ultimate, Investor
  - [ ] Color-coded
  - File: `src/app/components/subscription/TierBadge.tsx` (new file)

- [ ] **6.16 Subscription Management Page**
  - [ ] View current plan
  - [ ] Upgrade/downgrade buttons
  - [ ] Cancel subscription
  - [ ] Billing history
  - [ ] Next billing date
  - File: `src/app/account/subscription/page.tsx` (new file)

---

## 📅 PHASE 1: WEEKS 13-14 - REPRESENTATION AGREEMENTS

### E-Signature Integration

- [ ] **7.1 Choose E-Signature Provider**
  - [ ] Options: DocuSign, HelloSign, SignWell, PandaDoc
  - [ ] Recommendation: HelloSign (Dropbox) or SignWell (affordable)
  - [ ] Sign up for API access
  - [ ] Add API keys to .env

- [ ] **7.2 Agreement Template Setup**
  - [ ] Create 30-day representation agreement PDF template
  - [ ] Add signature fields
  - [ ] Add date fields
  - [ ] Upload to e-signature platform
  - [ ] Get template ID
  - File: `templates/representation-agreement.pdf` (new file)

- [ ] **7.3 E-Signature API Integration**
  - [ ] Install SDK
  - [ ] Create config
  - [ ] Helper functions:
    - createSignatureRequest()
    - getSignatureStatus()
    - downloadSignedDocument()
  - File: `src/lib/esignature.ts` (new file)

### Agreement Flow

- [ ] **7.4 Initiate Agreement API**
  - [ ] POST /api/agreement/initiate
  - [ ] Create signature request
  - [ ] Send to client email
  - [ ] Store request ID in database
  - [ ] Set status: "pending"
  - File: `src/app/api/agreement/initiate/route.ts` (new file)

- [ ] **7.5 Agreement Webhook Handler**
  - [ ] POST /api/webhooks/esignature
  - [ ] Handle signature_request_signed event
  - [ ] Download signed PDF
  - [ ] Upload to Cloudinary (document storage)
  - [ ] Update User.representationAgreement:
    - status: "active"
    - signedAt: now
    - expiresAt: now + 30 days
  - File: `src/app/api/webhooks/esignature/route.ts` (new file)

- [ ] **7.6 Agreement Status API**
  - [ ] GET /api/agreement/status
  - [ ] Return current agreement details
  - [ ] Days remaining
  - [ ] Download signed document link
  - File: `src/app/api/agreement/status/route.ts` (new file)

### Agreement UI

- [ ] **7.7 Agent Selection Modal**
  - [ ] Triggered when user tries agent-locked feature
  - [ ] "Choose an agent to unlock this feature"
  - [ ] List of agents (if multiple in area)
  - [ ] Or: Link to swipe matching
  - [ ] "Continue with [Current Agent]" if already chosen
  - File: `src/app/components/modals/AgentSelectionModal.tsx` (new file)

- [ ] **7.8 Agreement Signing Modal**
  - [ ] Embedded e-signature iframe
  - [ ] OR redirect to e-signature page
  - [ ] Progress indicator
  - [ ] "What you're signing" explanation
  - [ ] Terms: 30 days, renewable, etc.
  - File: `src/app/components/modals/AgreementSigningModal.tsx` (new file)

- [ ] **7.9 Agreement Status Component**
  - [ ] Show in header/profile
  - [ ] "Agreement with [Agent] expires in X days"
  - [ ] Renew button
  - [ ] View signed document link
  - File: `src/app/components/agreement/AgreementStatus.tsx` (new file)

### Agreement Expiration

- [ ] **7.10 Expiration Notification System**
  - [ ] Daily cron job
  - [ ] Find agreements expiring in 2 days
  - [ ] Send email notification
  - [ ] Create in-app notification
  - Script: `scripts/check-agreement-expirations.ts` (new file)

- [ ] **7.11 Agreement Renewal Flow**
  - [ ] POST /api/agreement/renew
  - [ ] Create new signature request
  - [ ] Extend expiresAt by 30 days
  - [ ] Increment renewalCount
  - File: `src/app/api/agreement/renew/route.ts` (new file)

- [ ] **7.12 Expiration Modal**
  - [ ] Shows on day 30 or first login after expiration
  - [ ] "Your agreement has expired"
  - [ ] Options:
    - Renew with same agent
    - Choose different agent
    - Browse without agreement (limited features)
  - File: `src/app/components/modals/AgreementExpiredModal.tsx` (new file)

### Agreement-Locked Features

- [ ] **7.13 Feature: Schedule Showings**
  - [ ] Check if user has active agreement
  - [ ] If not → Show agreement modal
  - [ ] If yes → Show scheduling interface
  - File: `src/app/components/features/ScheduleShowing.tsx`

- [ ] **7.14 Feature: Submit Offers**
  - [ ] Check active agreement
  - [ ] If not → Modal
  - [ ] If yes → Offer form
  - File: `src/app/components/features/SubmitOffer.tsx`

- [ ] **7.15 Feature: Direct Agent Messaging**
  - [ ] Check active agreement
  - [ ] If not → Modal
  - [ ] If yes → Chat with agent
  - File: `src/app/components/features/AgentMessaging.tsx`

---

## 📅 PHASE 1: WEEKS 15-16 - AGENT MATCHING SYSTEM

### Swipe UI

- [ ] **8.1 Agent Swipe Page**
  - [ ] Route: /find-agent (or chatrealty.io/find-agent when rebranded)
  - [ ] Fetch available agents (in user's search area)
  - [ ] Tinder-style card stack
  - [ ] Swipe animations
  - File: `src/app/find-agent/page.tsx` (new file)

- [ ] **8.2 Agent Card Component**
  - [ ] Agent headshot
  - [ ] Name, tagline
  - [ ] Coverage area (small map or text)
  - [ ] Stats (years exp, sales, rating)
  - [ ] Specialties (pills/chips)
  - [ ] Short bio (2-3 sentences)
  - [ ] Swipe left/right buttons
  - [ ] "Learn More" button (expand card)
  - File: `src/app/components/matching/AgentCard.tsx` (new file)

- [ ] **8.3 Swipe Gesture Handler**
  - [ ] Touch/mouse drag
  - [ ] Threshold for swipe (> 150px)
  - [ ] Swipe left → Pass
  - [ ] Swipe right → Match
  - [ ] Animation on swipe
  - [ ] Load next agent
  - File: `src/app/components/matching/SwipeHandler.tsx` (new file)

- [ ] **8.4 Match Confirmation Modal**
  - [ ] Shows immediately after swipe right
  - [ ] "You've connected with [Agent]!"
  - [ ] Agent photo + bio
  - [ ] "What happens next" explanation
  - [ ] "Start chatting" button
  - File: `src/app/components/modals/MatchConfirmation.tsx` (new file)

### Match Logic

- [ ] **8.5 Create Match API**
  - [ ] POST /api/match/create
  - [ ] Create AgentMatch record
  - [ ] Set status: "pending"
  - [ ] Notify agent (email + in-app)
  - [ ] Return match details
  - File: `src/app/api/match/create/route.ts` (new file)

- [ ] **8.6 Match Response API**
  - [ ] POST /api/match/respond
  - [ ] Agent accepts or declines
  - [ ] If accept:
    - Set agentStatus: "accepted"
    - Update User.agentRelationship
  - [ ] If decline:
    - Set agentStatus: "declined"
    - Optional: handoffToAgentId
  - [ ] Notify client
  - File: `src/app/api/match/respond/route.ts` (new file)

- [ ] **8.7 Get Match Status API**
  - [ ] GET /api/match/status
  - [ ] Return current match
  - [ ] Agent response status
  - [ ] Time remaining (24 hours)
  - File: `src/app/api/match/status/route.ts` (new file)

### Handoff System

- [ ] **8.8 Agent Availability Check**
  - [ ] Agent A messages Agent B via platform
  - [ ] "Can you take a client in [area]?"
  - [ ] Agent B responds yes/no
  - [ ] Track in database
  - File: `src/app/components/agent/AvailabilityCheck.tsx` (new file)

- [ ] **8.9 Handoff API**
  - [ ] POST /api/match/handoff
  - [ ] Agent A declines with handoff to Agent B
  - [ ] Create new AgentMatch (userId → Agent B)
  - [ ] Set handoff fee (5% to Agent A)
  - [ ] Notify client: "Agent A referred you to Agent B"
  - [ ] Agent B must accept (already confirmed availability)
  - File: `src/app/api/match/handoff/route.ts` (new file)

- [ ] **8.10 Handoff UI (Agent Side)**
  - [ ] Decline with handoff option
  - [ ] Search for available agent (filter by area)
  - [ ] Confirm handoff
  - File: `src/app/components/agent/HandoffInterface.tsx` (new file)

- [ ] **8.11 Handoff Notification (Client Side)**
  - [ ] Toast: "Agent A has connected you with Agent B"
  - [ ] Show Agent B's card
  - [ ] "Continue" or "Find different agent"
  - File: `src/app/components/notifications/HandoffNotification.tsx` (new file)

### Response Time Tracking

- [ ] **8.12 Match Timeout Cron Job**
  - [ ] Run every hour
  - [ ] Find matches > 24 hours old with status "pending"
  - [ ] Set agentStatus: "timeout"
  - [ ] Unlock swipe for client
  - [ ] Notify client: "Agent didn't respond, you can match with others"
  - Script: `scripts/check-match-timeouts.ts` (new file)

- [ ] **8.13 Timeout Notification (Client)**
  - [ ] Toast: "Agent didn't respond within 24 hours"
  - [ ] "Find another agent" button
  - [ ] Redirect to swipe page
  - File: `src/app/components/notifications/TimeoutNotification.tsx`

### Agent Notifications

- [ ] **8.14 Match Notification (Email)**
  - [ ] Template: "You have a new client match!"
  - [ ] Client details (name, area, preferences)
  - [ ] "Respond Now" CTA (24 hour deadline)
  - File: `emails/agent-match.html` (new file)

- [ ] **8.15 Match Notification (In-App)**
  - [ ] Bell icon in header
  - [ ] Badge count
  - [ ] Notification list
  - [ ] Click → Match details
  - File: `src/app/components/notifications/AgentNotifications.tsx` (new file)

- [ ] **8.16 Match Dashboard (Agent)**
  - [ ] List pending matches
  - [ ] Time remaining for each
  - [ ] Quick accept/decline buttons
  - [ ] Client preview (name, area, budget)
  - File: `src/app/agent/dashboard/matches/page.tsx` (new file)

---

## 📅 PHASE 1: WEEKS 17-18 - TEAM FEATURES

### Team Blog System

- [ ] **9.1 Team Blog Model Extension**
  - [ ] Extend Article model with teamId field
  - [ ] Or: Create TeamArticle model
  - [ ] Team-specific articles vs shared articles
  - File: `src/models/Article.ts` or `TeamArticle.ts`

- [ ] **9.2 Team Blog API**
  - [ ] GET /api/team/[teamId]/blog
  - [ ] Return team's articles
  - [ ] Filter by category, topic
  - File: `src/app/api/team/[teamId]/blog/route.ts` (new file)

- [ ] **9.3 Team Blog Page**
  - [ ] Route: /team/[slug]/blog
  - [ ] List all team articles
  - [ ] Filter/search
  - [ ] Click → Article detail page
  - File: `src/app/team/[slug]/blog/page.tsx` (new file)

- [ ] **9.4 Team Article Page**
  - [ ] Route: /team/[slug]/blog/[articleSlug]?ref=[agentSlug]
  - [ ] Full article content
  - [ ] Team branding
  - [ ] Author info (team leader or specific team member)
  - [ ] CTA: "See Listings" or "Start Searching"
  - [ ] Track ref parameter in cookie/session
  - File: `src/app/team/[slug]/blog/[articleSlug]/page.tsx` (new file)

### Attribution Tracking

- [ ] **9.5 Attribution Cookie System**
  - [ ] Set cookie on agent site → team blog transition
  - [ ] Cookie: referring_agent={agentId}
  - [ ] 30-day expiration
  - [ ] Read on team site
  - File: `src/lib/attribution.ts` (new file)

- [ ] **9.6 Session Attribution Tracking**
  - [ ] On team blog click from agent site:
    - Create session record in DB
    - Store: sessionId, userId (if logged in), referringAgentId, timestamp
  - [ ] On CTA click from team blog:
    - Read session, find referring agent
    - Redirect to agent's site with ?source=team-blog&article={slug}
  - File: `src/lib/session-tracking.ts` (new file)

- [ ] **9.7 Lead Attribution on Sign-Up**
  - [ ] When user creates account:
    - Check referring_agent cookie
    - Check session attribution
  - [ ] Set User.agentRelationship to referring agent
  - [ ] Clear cookie (relationship now in DB)
  - File: `src/app/api/auth/register/route.ts`

### Agent Site Team Content

- [ ] **9.8 Team Blog Previews (Agent Site)**
  - [ ] Show team blog post cards on agent landing page
  - [ ] Section: "Latest from [Team Name]"
  - [ ] 3-6 recent posts
  - [ ] Click → Redirect to team blog with ?ref={agentSlug}
  - File: `src/app/components/agent-landing/TeamBlogSection.tsx` (new file)

- [ ] **9.9 Team Blog Redirect Handler**
  - [ ] Intercept click on team blog post
  - [ ] Set attribution cookie
  - [ ] Create session record
  - [ ] Redirect to team blog article
  - File: `src/app/components/agent-landing/TeamBlogSection.tsx`

- [ ] **9.10 Return to Agent Site**
  - [ ] CTA on team blog article: "See Listings"
  - [ ] Read attribution (cookie or session)
  - [ ] Redirect to: agentsite.com/?source=team-blog&article={slug}
  - [ ] Agent's chat/map opens
  - File: `src/app/team/[slug]/blog/[articleSlug]/page.tsx`

---

## 📅 PHASE 1: WEEKS 19-20 - TERRITORY & FEE TRACKING

### Territory Detection

- [ ] **10.1 Install Geospatial Libraries**
  - [ ] Install turf.js: `npm install @turf/turf`
  - [ ] For point-in-polygon queries
  - [ ] GeoJSON utilities

- [ ] **10.2 Territory Detection Utility**
  - [ ] Function: getAgentByLocation(lat, lng)
  - [ ] Query agents with GeoJSON coverage containing coordinates
  - [ ] MongoDB geospatial query ($geoIntersects)
  - [ ] Return agent with that territory
  - File: `src/lib/territory-detection.ts` (new file)

- [ ] **10.3 Data Source Detection**
  - [ ] Function: getDataSourceAgent(listingKey)
  - [ ] Read listing.dataSource.agentId
  - [ ] Return agent who contributed that MLS
  - File: `src/lib/territory-detection.ts`

### Territory UI Components

- [ ] **10.4 Territory Banner Component**
  - [ ] Persistent banner at top
  - [ ] "🏠 Browsing [City] • Agent: [Name]"
  - [ ] [Contact] [Back to {Primary Area}] buttons
  - [ ] Show when outside primary agent's territory
  - [ ] Mobile: Compact version
  - File: `src/app/components/territory/TerritoryBanner.tsx` (new file)

- [ ] **10.5 Territory Toast Notification**
  - [ ] Shows once when territory changes
  - [ ] "Now viewing [City] listings from [Agent]"
  - [ ] 5 second duration
  - [ ] Don't show again for same territory (session)
  - File: `src/app/components/territory/TerritoryToast.tsx` (new file)

- [ ] **10.6 Mobile Top Bar Territory Indicator**
  - [ ] Replace/append to existing top bar
  - [ ] Shows: "[City], [State] • [Agent Name]"
  - [ ] Tap → Show agent card
  - File: `src/app/components/mobile/TerritoryTopBar.tsx` (new file)

### Listing Attribution

- [ ] **10.7 Listing Card Agent Attribution**
  - [ ] Show agent when listing is from different agent's data
  - [ ] "👤 Listed by: [Agent Name]"
  - [ ] "Data from: [Agent Name]"
  - [ ] Click → Agent's profile
  - File: `src/app/components/listings/ListingCard.tsx`

- [ ] **10.8 Neighborhood Page Attribution**
  - [ ] Detect subdivision/city
  - [ ] Find agent with coverage
  - [ ] Show banner: "Listings from [Agent Name]"
  - File: `src/app/neighborhood/[slug]/page.tsx`

### Fee Calculation

- [ ] **10.9 Fee Calculator Utility**
  - [ ] Function: calculateCommissionFees(transaction)
  - [ ] Input: Transaction object
  - [ ] Calculate:
    - ChatRealty swipe fee (15% if from swipe)
    - Referral fee (25% if out-of-state)
    - Data fee (5% to data broker)
    - Handoff fee (5% if handed off)
    - Company fee (base %)
  - [ ] Return: Fee breakdown + net to closing agent
  - File: `src/lib/fee-calculator.ts` (new file)

- [ ] **10.10 Fee Validation**
  - [ ] Check that fees stack correctly
  - [ ] Ensure closing agent gets minimum commission
  - [ ] Cap total fees at 35% (configurable)
  - [ ] Log warnings if fees exceed threshold
  - File: `src/lib/fee-calculator.ts`

### Transaction Recording

- [ ] **10.11 Record Transaction API**
  - [ ] POST /api/transaction/record
  - [ ] Admin/agent only
  - [ ] Create Transaction record
  - [ ] Calculate all fees
  - [ ] Set status: "pending"
  - File: `src/app/api/transaction/record/route.ts` (new file)

- [ ] **10.12 Update Transaction API**
  - [ ] PUT /api/transaction/[id]
  - [ ] Update status (closed, cancelled)
  - [ ] Mark fees as collected
  - [ ] Trigger payments to agents
  - File: `src/app/api/transaction/[id]/route.ts` (new file)

- [ ] **10.13 Transaction Dashboard (Agent)**
  - [ ] List all transactions
  - [ ] Filter by status
  - [ ] Show fee breakdown for each
  - [ ] Download statements
  - File: `src/app/agent/dashboard/transactions/page.tsx` (new file)

### Commission Tracking

- [ ] **10.14 Agent Earnings Dashboard**
  - [ ] Total earnings (YTD, MTD, all-time)
  - [ ] Breakdown by source:
    - Direct commissions
    - Data fees
    - Referral fees
    - Handoff fees
  - [ ] Pending vs collected
  - [ ] Payment history
  - File: `src/app/agent/dashboard/earnings/page.tsx` (new file)

- [ ] **10.15 Platform Revenue Dashboard (Admin)**
  - [ ] Total revenue (subscriptions + fees)
  - [ ] Breakdown by agent
  - [ ] Growth charts
  - [ ] Pending payments
  - File: `src/app/admin/revenue/page.tsx` (new file)

---

## 📅 PHASE 1: WEEKS 21-22 - POLISH & TESTING

### Mobile Optimization

- [ ] **11.1 Mobile Layout Review**
  - [ ] Test all pages on mobile (iOS, Android)
  - [ ] Fix layout issues
  - [ ] Optimize touch targets
  - [ ] Improve scrolling performance

- [ ] **11.2 Mobile Agent Dashboard**
  - [ ] Responsive sidebar (hamburger menu)
  - [ ] Swipeable sections
  - [ ] Optimize forms for mobile
  - [ ] Fix keyboard issues

- [ ] **11.3 Mobile Landing Page**
  - [ ] Stack sections vertically
  - [ ] Larger tap targets
  - [ ] Optimize hero image
  - [ ] Test on various screen sizes

- [ ] **11.4 Mobile Territory Indicators**
  - [ ] Top bar integration
  - [ ] Toast positioning
  - [ ] Banner collapsible

### Performance Tuning

- [ ] **11.5 Image Optimization**
  - [ ] Implement next/image for all photos
  - [ ] Lazy load below-fold images
  - [ ] Use proper aspect ratios
  - [ ] WebP/AVIF formats

- [ ] **11.6 Code Splitting**
  - [ ] Dynamic imports for heavy components
  - [ ] Route-based code splitting
  - [ ] Lazy load admin components

- [ ] **11.7 Database Query Optimization**
  - [ ] Add missing indexes
  - [ ] Optimize $geoIntersects queries
  - [ ] Cache frequent queries (Redis future)
  - [ ] Pagination for large result sets

- [ ] **11.8 API Response Optimization**
  - [ ] Compress API responses (gzip)
  - [ ] Reduce payload sizes (select only needed fields)
  - [ ] Implement API rate limiting

- [ ] **11.9 Lighthouse Audits**
  - [ ] Run Lighthouse on all pages
  - [ ] Target: > 90 on all metrics
  - [ ] Fix critical issues

### SEO & Metadata

- [ ] **11.10 Sitemap Generation**
  - [ ] Dynamic sitemap.xml
  - [ ] Include all agent landing pages
  - [ ] Include team blog articles
  - [ ] Update on agent/article creation

- [ ] **11.11 Robots.txt**
  - [ ] Configure crawling rules
  - [ ] Allow: Agent landing pages
  - [ ] Disallow: Dashboard, admin routes
  - File: `public/robots.txt`

- [ ] **11.12 Structured Data (Schema.org)**
  - [ ] RealEstateAgent schema on landing pages
  - [ ] Organization schema for teams
  - [ ] Article schema for blog posts
  - [ ] Review/Rating schema for testimonials
  - File: `src/lib/structured-data.ts` (new file)

- [ ] **11.13 Meta Tags Review**
  - [ ] Verify all pages have unique title/description
  - [ ] OpenGraph tags for social sharing
  - [ ] Twitter card tags
  - [ ] Canonical URLs

### Analytics Integration

- [ ] **11.14 Google Analytics Setup**
  - [ ] Install GA4: `npm install @next/third-parties`
  - [ ] Add GA_MEASUREMENT_ID to .env
  - [ ] Track page views
  - [ ] Custom events:
    - Agent match
    - Subscription upgrade
    - Agreement signed
    - Territory change
  - File: `src/lib/analytics.ts` (new file)

- [ ] **11.15 Agent Analytics Dashboard**
  - [ ] Visitors to agent landing page
  - [ ] Leads generated
  - [ ] Conversion funnel
  - [ ] Territory browsing patterns
  - File: `src/app/agent/dashboard/analytics/page.tsx` (new file)

### Bug Fixes

- [ ] **11.16 Fix Known Issues**
  - [ ] Review GitHub issues
  - [ ] Fix subdivision stats bug (already documented)
  - [ ] Test edge cases
  - [ ] Cross-browser testing

- [ ] **11.17 Error Handling**
  - [ ] Add error boundaries
  - [ ] Graceful degradation
  - [ ] User-friendly error messages
  - [ ] Log errors to monitoring service

### Documentation

- [ ] **11.18 Agent Onboarding Guide**
  - [ ] How to set up profile
  - [ ] How to upload assets
  - [ ] How to manage testimonials
  - [ ] How to respond to matches
  - File: `docs/agent-onboarding.md` (new file)

- [ ] **11.19 API Documentation**
  - [ ] Document all endpoints
  - [ ] Request/response examples
  - [ ] Authentication requirements
  - [ ] Rate limits
  - File: `docs/api/README.md` (new file)

- [ ] **11.20 Admin Documentation**
  - [ ] How to verify agents
  - [ ] How to manage transactions
  - [ ] How to handle disputes
  - [ ] How to run reports
  - File: `docs/admin-guide.md` (new file)

---

## 📅 PHASE 1: WEEKS 23-24 - LAUNCH PREPARATION

### Admin Tools

- [ ] **12.1 Admin Dashboard**
  - [ ] Route: /admin
  - [ ] Protected (admin role only)
  - [ ] Overview stats
  - [ ] Quick actions
  - File: `src/app/admin/page.tsx` (new file)

- [ ] **12.2 Agent Management**
  - [ ] List all agents
  - [ ] Filter by status, MLS, team
  - [ ] Approve/reject agent applications
  - [ ] Verify licenses
  - [ ] Edit agent profiles (override)
  - [ ] Deactivate agents
  - File: `src/app/admin/agents/page.tsx` (new file)

- [ ] **12.3 MLS Data Management**
  - [ ] View all MLS sources
  - [ ] Coverage map (visual)
  - [ ] Data freshness monitoring
  - [ ] Approve new MLS contributions
  - [ ] Resolve territory conflicts
  - File: `src/app/admin/mls/page.tsx` (new file)

- [ ] **12.4 Transaction Management**
  - [ ] List all transactions
  - [ ] Fee breakdown view
  - [ ] Approve/dispute fees
  - [ ] Mark as paid
  - [ ] Generate invoices
  - File: `src/app/admin/transactions/page.tsx` (new file)

- [ ] **12.5 User Management**
  - [ ] List all users
  - [ ] Filter by tier, agent relationship
  - [ ] View usage stats
  - [ ] Override limits (manual upgrade)
  - [ ] Ban/suspend users
  - File: `src/app/admin/users/page.tsx` (new file)

- [ ] **12.6 Content Management**
  - [ ] Approve team blog posts
  - [ ] Manage shared articles
  - [ ] Featured content
  - File: `src/app/admin/content/page.tsx` (new file)

### Agent Onboarding Flow

- [ ] **12.7 Agent Application Form**
  - [ ] Route: /apply (public)
  - [ ] Basic info (name, email, phone)
  - [ ] License info (state, number)
  - [ ] MLS access (which sources)
  - [ ] Coverage area (cities/counties)
  - [ ] Why join ChatRealty
  - [ ] Submit → Creates User with application status
  - File: `src/app/apply/page.tsx` (new file)

- [ ] **12.8 MLS Uniqueness Check**
  - [ ] During application, check if MLS already in network
  - [ ] If duplicate → Suggest joining team
  - [ ] If unique → "You can become a data broker!"
  - File: `src/lib/mls-checker.ts` (new file)

- [ ] **12.9 Application Review Dashboard (Admin)**
  - [ ] List pending applications
  - [ ] View application details
  - [ ] Approve → Send welcome email, activate account
  - [ ] Reject → Send rejection email with reason
  - File: `src/app/admin/applications/page.tsx` (new file)

- [ ] **12.10 Welcome Email (Approved Agent)**
  - [ ] "Welcome to ChatRealty!"
  - [ ] Next steps:
    1. Complete profile
    2. Upload photos
    3. Add testimonials
    4. Enable landing page
  - [ ] Login link
  - File: `emails/agent-welcome.html` (new file)

### Support Documentation

- [ ] **12.11 Help Center**
  - [ ] FAQ for agents
  - [ ] FAQ for clients
  - [ ] Video tutorials
  - [ ] Knowledge base
  - File: `src/app/help/page.tsx` (new file)

- [ ] **12.12 Contact Support**
  - [ ] Contact form
  - [ ] Email support@ chatrealty.io
  - [ ] Live chat (future)
  - File: `src/app/contact/page.tsx` (new file)

### Marketing Materials

- [ ] **12.13 Agent Recruitment Landing Page**
  - [ ] "Join ChatRealty" page
  - [ ] Value proposition for agents
  - [ ] Revenue model explanation
  - [ ] Success stories
  - [ ] Apply CTA
  - File: `src/app/join/page.tsx` (new file)

- [ ] **12.14 Platform Demo Video**
  - [ ] Record demo:
    - Agent landing page
    - AI chat demo
    - Swipe matching
    - Territory transitions
  - [ ] Upload to YouTube
  - [ ] Embed on marketing pages

- [ ] **12.15 Case Study: Joseph Sardella**
  - [ ] Document Joseph's results
  - [ ] Metrics: Leads, conversions, time saved
  - [ ] Testimonial
  - [ ] Use for recruiting Agent #2
  - File: `docs/case-studies/joseph-sardella.md` (new file)

### Beta Testing

- [ ] **12.16 Beta Test with Joseph**
  - [ ] Joseph uses platform for 1-2 weeks
  - [ ] Complete profile setup
  - [ ] Upload all assets
  - [ ] Test all features
  - [ ] Collect feedback
  - [ ] Fix critical issues

- [ ] **12.17 External Beta Testers**
  - [ ] Recruit 5-10 beta users (clients)
  - [ ] Have them use platform end-to-end
  - [ ] Test subscription tiers
  - [ ] Test agent matching
  - [ ] Collect feedback
  - [ ] Fix issues

- [ ] **12.18 Load Testing**
  - [ ] Simulate 100+ concurrent users
  - [ ] Test database performance
  - [ ] Test API response times
  - [ ] Identify bottlenecks
  - [ ] Optimize

### Soft Launch

- [ ] **12.19 Launch Checklist**
  - [ ] All critical features working
  - [ ] No blocking bugs
  - [ ] Performance acceptable
  - [ ] SEO optimized
  - [ ] Analytics tracking
  - [ ] Error monitoring setup
  - [ ] Backups configured

- [ ] **12.20 Launch jpsrealtor.com v2**
  - [ ] Deploy to production
  - [ ] Monitor for issues
  - [ ] Joseph promotes to network
  - [ ] Collect initial feedback

- [ ] **12.21 Prepare for Agent #2**
  - [ ] Identify target market (Phoenix, San Diego, etc.)
  - [ ] Recruit agent with unique MLS
  - [ ] Onboard Agent #2
  - [ ] Validate multi-tenancy works
  - [ ] Test fee structures

---

## 📅 PHASE 2: DOMAIN REBRAND (Post Week 24)

### DNS Changes

- [ ] **13.1 Acquire chatrealty.io Domain**
  - [ ] Purchase domain
  - [ ] Configure DNS

- [ ] **13.2 Rebrand Primary Site**
  - [ ] Point chatrealty.io to current jpsrealtor.com
  - [ ] Update environment variables
  - [ ] Update branding (logo, name)

- [ ] **13.3 Map jpsrealtor.com to Tenant**
  - [ ] Create CNAME: jpsrealtor.com → chatrealty.io
  - [ ] Route to: /agent/joseph-sardella/{license}/landing
  - [ ] SSL certificate for custom domain

- [ ] **13.4 Test Custom Domain Mapping**
  - [ ] Verify jpsrealtor.com loads Joseph's landing page
  - [ ] Verify all features work
  - [ ] No broken links

### ChatRealty.io Main Site

- [ ] **13.5 Build ChatRealty Home Page**
  - [ ] Dual experience:
    - "Find an Agent" (client side)
    - "Are you an Agent?" (agent recruitment)
  - [ ] Platform features
  - [ ] Pricing
  - [ ] Sign up CTAs

- [ ] **13.6 Agent Directory**
  - [ ] /agents route
  - [ ] List all agents
  - [ ] Filter by location, specialty
  - [ ] Search
  - [ ] Click → Agent landing page

---

## 📅 PHASE 3: AGENT #2 RECRUITMENT (Post Rebrand)

### Recruit Agent #2

- [ ] **14.1 Identify Target Market**
  - [ ] Choose underserved market
  - [ ] Verify MLS availability (unique data)
  - [ ] Ideal: Different state (test out-of-state referrals)

- [ ] **14.2 Outreach**
  - [ ] Pitch ChatRealty model
  - [ ] Show Joseph's success
  - [ ] Demo platform
  - [ ] Offer founding agent benefits

- [ ] **14.3 Onboard Agent #2**
  - [ ] Application process
  - [ ] Profile setup
  - [ ] MLS data connection
  - [ ] Landing page launch

- [ ] **14.4 Test Multi-Tenancy**
  - [ ] Agent #2 gets own subdomain
  - [ ] Can map custom domain
  - [ ] Data sharing works
  - [ ] Territory transitions work
  - [ ] Fee attribution accurate

### Validate Business Model

- [ ] **14.5 Generate First Cross-Agent Lead**
  - [ ] Joseph's client searches Agent #2's market
  - [ ] Territory banner shows Agent #2
  - [ ] Client contacts Agent #2
  - [ ] Deal closes
  - [ ] Referral fee (25%) paid to Joseph
  - [ ] Data fee (5%) paid to Agent #2
  - [ ] Validate fee calculation

- [ ] **14.6 Generate First Swipe Match**
  - [ ] Client uses swipe feature
  - [ ] Matches with agent
  - [ ] Agent responds
  - [ ] Agreement signed
  - [ ] Deal closes
  - [ ] ChatRealty fee (15%) collected

- [ ] **14.7 Collect Metrics**
  - [ ] Leads per agent
  - [ ] Conversion rates
  - [ ] Revenue per agent
  - [ ] Platform revenue
  - [ ] User engagement
  - [ ] Use for marketing/recruiting

---

## 📅 ONGOING TASKS

### Maintenance

- [ ] **15.1 Weekly Database Backups**
  - [ ] Automated backups
  - [ ] Test restore process
  - [ ] Store offsite

- [ ] **15.2 Monthly Performance Review**
  - [ ] Lighthouse audits
  - [ ] Database optimization
  - [ ] API response times
  - [ ] Fix regressions

- [ ] **15.3 Security Audits**
  - [ ] Dependency updates
  - [ ] Vulnerability scans
  - [ ] Penetration testing (quarterly)

### Feature Roadmap (Post-Launch)

- [ ] **16.1 Advanced Investor Tools** ($99/mo tier)
  - [ ] Cap rate calculators
  - [ ] Multi-property comparison
  - [ ] Portfolio analytics
  - [ ] Market forecasting

- [ ] **16.2 Mobile App** (React Native)
  - [ ] iOS app
  - [ ] Android app
  - [ ] Push notifications
  - [ ] Offline mode

- [ ] **16.3 CRM Integration**
  - [ ] Sync with agent's existing CRM
  - [ ] Follow-up automation
  - [ ] Lead nurturing

- [ ] **16.4 Live Chat** (Agent-Client)
  - [ ] Real-time messaging
  - [ ] Video calls
  - [ ] Screen sharing (virtual showings)

- [ ] **16.5 IDX Solo Agent Plan** (Phase 2 agents)
  - [ ] Bring own data (no network sharing)
  - [ ] SaaS pricing ($99-199/mo)
  - [ ] Limited features vs data-share agents

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:
- [x] Joseph's landing page live with all assets
- [x] Multi-tenant architecture functional
- [x] Subscription tiers working (can upgrade/downgrade)
- [x] Representation agreements signable
- [x] Agent swipe matching works
- [x] Territory transitions smooth
- [x] Fee calculation accurate
- [x] Mobile optimized
- [x] Performance > 90 Lighthouse
- [x] Zero critical bugs

### Phase 2 Complete When:
- [ ] chatrealty.io domain live
- [ ] jpsrealtor.com mapped to tenant route
- [ ] All features work on new domain
- [ ] ChatRealty home page built

### Phase 3 Complete When:
- [ ] Agent #2 recruited and onboarded
- [ ] First cross-agent referral fee paid
- [ ] First swipe match fee collected
- [ ] Multi-tenancy validated in production

---

## 📊 TRACKING PROGRESS

**Current Status**: Week 0 (Planning)

**Next Milestone**: Complete Weeks 1-2 (Data Layer)

**Update Frequency**: Review TODO weekly, update completed items

**Blockers**: Document any blockers immediately in this file

---

**Last Updated**: March 16, 2026
**Version**: 1.0
