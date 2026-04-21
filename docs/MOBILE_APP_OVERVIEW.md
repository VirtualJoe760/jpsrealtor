# Native Mobile App — High-Level Overview

## Current State

JPSRealtor is a **full-stack Next.js 16 web application** with:

- ~80 pages, 225+ API routes, 50+ database models, 459+ components
- PWA already configured (manifest, service worker, installable)
- Responsive Tailwind CSS throughout
- Heavy integrations: MLS data, Stripe, Claude AI, Twilio, Maps, Google APIs, Socket.io real-time messaging

---

## Recommended Approach: React Native with Shared Backend

Since the backend is already cleanly separated (Next.js API routes + MongoDB), the mobile app would be a **new React Native frontend** that consumes the existing API. The Next.js backend stays as-is.

### Why React Native (not Flutter, not Capacitor/Ionic)

| Option | Verdict |
|---|---|
| **React Native** | Team already knows React/TypeScript. Shared types, utils, and API contracts. Two native apps from one codebase. |
| **Capacitor/Ionic** | Wraps the existing web app — fastest path but worst native feel. Maps, push notifications, and camera would feel sluggish. |
| **Flutter** | Great framework, but requires learning Dart and rewriting everything from scratch. No code sharing. |

---

## What Carries Over (Little or No Work)

| Layer | Details |
|---|---|
| **All API routes** | 225+ endpoints stay exactly as they are |
| **Database & models** | MongoDB, all 50+ schemas, unchanged |
| **Auth flow** | NextAuth sessions → swap to JWT/token-based for mobile |
| **TypeScript types** | Shared interfaces for listings, contacts, campaigns, etc. |
| **Business logic** | CRM, campaign execution, CMA stats, lead scoring — all server-side |
| **Third-party integrations** | Stripe, Twilio, Claude AI, Cloudinary — all called from the API |

---

## What Needs to Be Rebuilt (The Actual Work)

### Tier 1 — Core Consumer App (MVP)
The public-facing experience a home buyer/seller would use.

| Feature | Complexity | Notes |
|---|---|---|
| Property search & filters | Medium | React Native list + map view. Replace Maplibre with react-native-maps. |
| Interactive map | High | Clustering, polygon drawing, POI layers — most complex screen |
| Listing detail pages | Medium | Photo gallery, details, contact agent CTA |
| AI chat | Medium | Already API-driven. Build a native chat UI with Socket.io |
| Neighborhood / subdivision pages | Low-Medium | Data-driven, straightforward |
| Push notifications | Low | Replace web-push with Firebase Cloud Messaging (FCM) |
| Auth (login/signup) | Low | Google/Facebook OAuth + credentials via existing API |
| Favorites & saved searches | Low | API already exists |
| Contact agent / book appointment | Low | Form + API call |

**Estimated effort: 8–12 weeks** (1-2 developers)

### Tier 2 — Agent Dashboard
The CRM/marketing tools Joseph uses day-to-day.

| Feature | Complexity | Notes |
|---|---|---|
| Contact management (CRM) | High | Complex UI with filters, tags, bulk actions |
| Campaign builder & management | High | Multi-step wizards, channel selection |
| Messaging (SMS/email/chat) | Medium-High | Real-time via Socket.io, threaded views |
| Analytics / insights dashboard | Medium | Charts via react-native-chart-kit or Victory Native |
| Content management (CMS) | Medium | Article editor — may want to keep this web-only |
| Voice training / AI tools | Low-Medium | Mostly API calls + audio recording |
| Team management | Low | Admin screens |

**Estimated effort: 10–16 weeks** (1-2 developers)

### Tier 3 — Web-Only
A small set of features that are impractical on a small screen.

- Admin panel (user management, domain config, debug tools)
- CMS long-form article editor (rich text editing)
- Bulk CSV imports/exports (column mapping UI)
- 3D visualizations (three.js)

---

## Key Technical Decisions

### 1. Navigation
Replace Next.js App Router with **React Navigation** (stack + tab navigators). The app would likely have a bottom tab bar: Search, Map, Favorites, Chat, Profile.

### 2. Maps
Replace Maplibre GL with **react-native-maps** (Google Maps on Android, Apple Maps or Google Maps on iOS). The clustering logic (Supercluster) can be reused.

### 3. Real-Time
Socket.io works in React Native out of the box — the existing real-time messaging infrastructure carries over directly.

### 4. Auth
Swap NextAuth's cookie/session model for **JWT tokens** stored in secure storage (react-native-keychain). The API endpoints stay the same, just add a token-based auth option alongside the existing session auth.

### 5. Push Notifications
Replace web-push with **Firebase Cloud Messaging** (FCM). Requires a small API update to handle device token registration instead of web push subscriptions.

### 6. Image Handling
Cloudinary URLs work as-is. Add **react-native-image-picker** for camera/gallery access (profile photos, property photos).

### 7. Payments
Stripe has a React Native SDK — drop-in replacement for @stripe/stripe-js.

---

## Timeline Summary

| Phase | Scope | Duration | Team |
|---|---|---|---|
| **Setup & architecture** | Project scaffolding, navigation, auth, shared types | 2 weeks | 1-2 devs |
| **Tier 1 MVP** | Consumer app (search, map, listings, chat, notifications) | 8–12 weeks | 1-2 devs |
| **Testing & app store prep** | QA, app store assets, TestFlight/Play Console setup | 2 weeks | 1 dev |
| **Tier 2 agent dashboard** | CRM, campaigns, messaging, analytics | 10–16 weeks | 1-2 devs |

### Total: ~22–32 weeks (5–8 months) for the full app

A **consumer-only MVP** (Tier 1) could ship to app stores in **~3 months**.

---

## Cost Considerations

- **React Native developer(s):** The primary cost. A solo senior RN dev or a 2-person team.
- **Apple Developer Program:** $99/year
- **Google Play Developer:** $25 one-time
- **Firebase (push notifications):** Free tier is sufficient
- **No new backend infrastructure** — the existing Next.js server and MongoDB handle everything

---

## Risks & Gotchas

| Risk | Mitigation |
|---|---|
| Map performance with 76k+ listings | Use server-side clustering (already built), paginate tile requests |
| Maintaining two frontends | Share TypeScript types in a common package. API is the contract. |
| App store review delays | Plan 1-2 weeks for initial Apple review. Keep first submission simple. |
| Auth token management | Use refresh token rotation. Secure storage via react-native-keychain. |
| Deep linking (shared URLs) | Configure universal links (iOS) and app links (Android) early |

---

## Agent Conversion Guides

Detailed pre-investigation guides for each conversion agent:

| Agent | Guide | Scope |
|---|---|---|
| 1. Scaffold | [AGENT_1_SCAFFOLD.md](mobile/agent-guides/AGENT_1_SCAFFOLD.md) | RN project setup, navigation, theme, base components, auth |
| 2. Shared Package | [AGENT_2_SHARED_PACKAGE.md](mobile/agent-guides/AGENT_2_SHARED_PACKAGE.md) | Extract types, utils, constants, business logic to shared package |
| 3. Conversion Script | [AGENT_3_CONVERSION_SCRIPT.md](mobile/agent-guides/AGENT_3_CONVERSION_SCRIPT.md) | Automated tag-swap script for bulk component conversion |
| 4. Listings & Search | [AGENT_4_LISTINGS_SEARCH.md](mobile/agent-guides/AGENT_4_LISTINGS_SEARCH.md) | Property search, filters, detail pages, favorites, swipe queue |
| 5. Map | [AGENT_5_MAP.md](mobile/agent-guides/AGENT_5_MAP.md) | Interactive map, clustering, boundaries, POI, geolocation |
| 6. Chat & Messaging | [AGENT_6_CHAT_MESSAGING.md](mobile/agent-guides/AGENT_6_CHAT_MESSAGING.md) | AI chat, SMS, email, push notifications, Socket.io |
| 7. CRM & Contacts | [AGENT_7_CRM_CONTACTS.md](mobile/agent-guides/AGENT_7_CRM_CONTACTS.md) | Contact list, detail, forms, tags, bulk actions, import review |
| 8. Campaigns & Analytics | [AGENT_8_CAMPAIGNS_ANALYTICS.md](mobile/agent-guides/AGENT_8_CAMPAIGNS_ANALYTICS.md) | Campaign wizards, multi-channel execution, charts, insights |

---

## Recommendation

**Start with a Tier 1 consumer MVP.** The property search + map + AI chat experience is the highest-value mobile use case. The agent dashboard works fine on desktop/tablet via the existing web app.

Ship the consumer app to both stores, gather user feedback, then decide if the agent dashboard mobile port is worth the investment.
