# CMS Landing Pages — Roadmap

**Created**: April 1, 2026
**Status**: Planning
**Depends on**: CMS System, Domain Mapping

---

## Overview

The CMS is evolving beyond blog posts to support **landing pages** — standalone, domain-pointable pages designed for targeted marketing campaigns. Landing pages are NOT blog posts and do NOT appear in the insights feed.

### Blog Posts vs Landing Pages

| | Blog Post (Insight) | Landing Page (Campaign) |
|---|---|---|
| **Purpose** | Educate, inform, SEO content | Convert, capture leads, campaign |
| **URL** | `/insights/[category]/[slug]` | `/campaign/[slug]` |
| **Shows in feed** | Yes (insights home page) | No |
| **Has domain** | No | Optional (e.g., `cvveteranhomebuyers.com`) |
| **Content** | Long-form markdown/MDX | Structured sections (hero, video, CTA, form) |
| **Created by** | Agent via CMS | Agent via CMS landing page builder |
| **Template** | Article layout | Configurable sections |

---

## Landing Page Use Cases

### 1. Niche Market Campaigns
- `cvveteranhomebuyers.com` → VA loan education for Coachella Valley veterans
- `palmspringsseniorliving.com` → 55+ communities in Palm Springs
- `desertvacationrentals.com` → Short-term rental investment opportunities

### 2. Event-Based Campaigns
- `coachellamusicfestivalrentals.com` → Festival season rental properties
- `bnpparibashomes.com` → Homes near BNP Paribas Open (Indian Wells tennis)

### 3. Cobranded Partnerships
- Agent + lender → VA loan landing page
- Agent + builder → New construction community page
- Agent + property manager → Rental investment page

### 4. Listing-Specific Pages
- `77085tetonlane.com` → Single property marketing page
- Agent can create a landing page for a high-value listing

### 5. Internal Campaigns (No Domain)
- `jpsrealtor.com/campaign/spring-market-report` → Seasonal content
- `jpsrealtor.com/campaign/first-time-buyers-guide` → Evergreen lead gen

---

## Landing Page Schema

Landing pages use a structured section-based schema (not free-form MDX):

```typescript
interface LandingPage {
  // Identity
  slug: string;           // "va-loan-coachella-valley"
  title: string;          // Page title
  status: "draft" | "published";

  // Agent
  agentId: ObjectId;
  agentEmail: string;

  // Domain (optional)
  customDomain?: string;  // "cvveteranhomebuyers.com" (linked via DomainMapping)

  // Sections (ordered array)
  sections: LandingPageSection[];

  // SEO
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  keywords: string[];

  // Analytics
  views: number;
  conversions: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
}

interface LandingPageSection {
  type: "hero" | "video" | "text" | "cta" | "form" | "listings" | "testimonial" | "stats" | "faq";
  order: number;
  content: Record<string, any>; // Type-specific content
}
```

### Section Types

| Type | Content Fields | Description |
|---|---|---|
| `hero` | heading, subheading, backgroundImage, ctaText, ctaLink | Full-width hero banner |
| `video` | youtubeUrl, caption | Embedded YouTube video |
| `text` | heading, body (markdown) | Rich text content block |
| `cta` | heading, description, buttonText, buttonLink, style | Call-to-action button |
| `form` | heading, fields[], submitText, webhookUrl | Lead capture form |
| `listings` | query (subdivision, priceRange, etc.) | Dynamic MLS listings grid |
| `testimonial` | quotes[], authorName, authorTitle | Customer testimonials |
| `stats` | items[] (label, value) | Key statistics display |
| `faq` | items[] (question, answer) | Accordion FAQ section |

---

## CMS Builder UI

The landing page builder will live at `/admin/cms/landing/new` (or `/admin/cms/landing/edit/[slug]`).

### Builder Experience
1. Agent selects "New Landing Page" (separate from "New Article")
2. Drag-and-drop section ordering
3. Each section has its own editor panel
4. Live preview in split-screen
5. Optional: assign a custom domain
6. Publish to `/campaign/[slug]`

---

## Implementation Phases

### Phase 1 — Foundation
- [ ] LandingPage model in MongoDB
- [ ] `/campaign/[slug]` route that renders landing pages
- [ ] Basic section renderer components
- [ ] CMS "New Landing Page" option (separate from articles)

### Phase 2 — Builder UI
- [ ] Section-based editor with add/remove/reorder
- [ ] Per-section content editors (hero, video, text, CTA, form)
- [ ] Live preview
- [ ] Publish/draft controls

### Phase 3 — Domain Integration
- [ ] Link landing page to DomainMapping
- [ ] Domain picker in landing page editor
- [ ] Update proxy to handle landing page domains

### Phase 4 — Advanced Sections
- [ ] Dynamic listings section (pull from MLS based on filters)
- [ ] Form submissions → agent email + CRM
- [ ] Analytics (views, conversions, form submissions per page)
- [ ] A/B testing support

---

## Relationship to Domain Mapping

Landing pages connect to the domain mapping system:

```
Agent creates landing page → /campaign/va-loan-coachella-valley
Agent requests domain → cvveteranhomebuyers.com
Admin approves → Vercel registers domain
Agent sets DNS → domain goes live
User visits cvveteranhomebuyers.com → sees the landing page
```

The DomainMapping `targetPath` would be `/campaign/va-loan-coachella-valley`.
