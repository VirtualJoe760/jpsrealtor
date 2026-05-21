# Content Creation Documentation

**Last Updated:** January 2, 2026

## Overview

This directory contains documentation for the **real estate video content creation system** - an automated pipeline for generating property showcase videos, market updates, and agent branding content using MLS data, AI-generated scripts, and video assembly.

---

## Documentation Index

### 1. [CONTENT_VISION.md](./CONTENT_VISION.md)
**Primary documentation for the real estate content creation system.**

**Topics Covered:**
- Three content pillars (Property Showcase, Market Updates, Agent Branding)
- Technology stack (Groq, 11Labs, HeyGen, FFmpeg, Cloudinary)
- Architecture and workflow
- FFmpeg cloud solutions (4 options compared)
- MLS data integration
- Database models (PropertyVideo)
- Phase-by-phase roadmap
- Success metrics and ROI

**Status:** 🎯 Vision & Roadmap (Voicemail system takes priority)

---

### 2. [REFERENCE_IMPLEMENTATION.md](./REFERENCE_IMPLEMENTATION.md)
**Technical reference from a separate horror video automation pipeline.**

**Purpose:**
This documents a **working content pipeline** built independently (Reddit → Horror Videos → YouTube) that serves as a technical reference for implementing the real estate system. It demonstrates proven patterns for:
- Batch processing with resume capability
- AI script generation and cleaning
- TTS integration
- Video assembly with FFmpeg
- YouTube automation

**Key Differences:**
| Aspect | Reference (Horror) | Real Estate Vision |
|--------|-------------------|-------------------|
| **Content Source** | Reddit stories | MLS listings |
| **AI Provider** | Ollama (local) | Groq API (cloud) |
| **TTS** | Kokoro (local) | 11Labs (cloud) |
| **Visuals** | ComfyUI generated | MLS photos + HeyGen |
| **Current Status** | ✅ Production | 🔄 Planned |

**Use This For:**
- Understanding workflow automation patterns
- Seeing FFmpeg implementation examples
- Learning batch processing strategies
- Studying session tracking and resume capability

---

## Quick Start

### Current State (January 2026)

**✅ Production Ready:**
- Voicemail script generation with Groq
- 11Labs text-to-speech
- Cloudinary storage
- Campaign management
- 6 script templates

**🔄 Next Phase:**
- HeyGen video integration
- Property video assembly
- MLS automation

### Technology Stack Summary

| Component | Technology | Status |
|-----------|-----------|--------|
| Script Generation | Groq API (GPT-OSS 120B) | ✅ Production |
| Text-to-Speech | 11Labs | ✅ Production |
| Video Presenters | HeyGen | 🔄 Planned |
| Video Assembly | FFmpeg (Cloud options) | 🔄 Planned |
| Storage | Cloudinary | ✅ Production |
| Data Source | MLS (unified-listings) | ✅ Available |
| Distribution | YouTube API | 🔄 Planned |

---

## Content Pillars

### Pillar 1: Property Showcase Videos
Auto-generate listing videos from MLS data with AI presenter and listing photos.

**Example:**
```
[HeyGen Avatar: Joseph]
"Hi, I'm Joseph Sardella. Let me show you this stunning 4-bedroom home in Indian Wells..."
[Listing photos slideshow]
[Back to Avatar]
"Priced at $1.2M. Call me at (760) 899-6988 to schedule a showing."
```

---

### Pillar 2: Market Update Videos
Weekly/monthly market reports using MLS data, trends, and insights.

**Example:**
```
[HeyGen Avatar: Joseph]
"This week in Indian Wells real estate: 5 new listings, average price up 2%..."
[Charts/graphs]
[Back to Avatar]
"If you're thinking of buying or selling, now is a great time."
```

---

### Pillar 3: Agent Branding Content
Personalized video messages for campaigns (extends voicemail system).

**Example:**
```
[HeyGen Avatar: Joseph]
"Hi Cache, I left you a voicemail about opportunities in your area..."
[Show equity data]
[Back to Avatar]
"Your home has gained $150K in equity. Let's talk."
```

---

## FFmpeg Infrastructure Options

Since video assembly requires FFmpeg, here are the evaluated options:

### Option 1: Cloudinary Video Transformations ⭐ **Recommended for Phase 1**
- Built-in video editing API
- No infrastructure setup
- Pay per transformation (~$0.0025)
- Limited to basic operations

### Option 2: Shotstack API
- Cloud FFmpeg service
- Full video editing power
- $29/month + $0.05-0.15 per video

### Option 3: AWS Lambda + FFmpeg Layer
- Serverless FFmpeg
- 512MB temp storage
- ~$0.0001 per video
- 15-minute timeout

### Option 4: DigitalOcean VPS + Aggressive Cleanup
- Full control
- Must manage storage carefully
- No additional costs

**Recommended Strategy:** Start with Cloudinary (simple), migrate to DO VPS + cleanup (Phase 2), then AWS Lambda or Shotstack (high volume).

---

## Integration with Existing Systems

### Voicemail Script Generation
**Already Built:** `src/lib/services/script-generation.service.ts`

**Reuse For Video:**
- Same Groq API integration
- Same script templates (6 pre-made)
- Same output cleaning (`cleanScriptOutput()`)
- Same batch processing patterns

**Extension:**
```typescript
// Generate property video script (new method)
static async generatePropertyScript(listingId: string) {
  const listing = await Listing.findOne({ ListingId: listingId });

  const prompt = `
    Create a 30-second video script for this property:
    Address: ${listing.UnparsedAddress}
    Price: $${listing.ListPrice.toLocaleString()}
    Beds: ${listing.BedroomsTotal} | Baths: ${listing.BathroomsTotalInteger}
    ...
  `;

  const response = await this.callGroqAPI(prompt);
  return this.cleanScriptOutput(response);
}
```

---

### MLS Data
**Already Available:** `unified-listings-palm-desert`, `unified-listings-indian-wells`, etc.

**Fields Available:**
- Property details (beds, baths, sqft, price)
- Location (address, city, zip)
- Description (`PublicRemarks`)
- Photos (`Media` array with URLs)

**Usage:**
```typescript
const listing = await Listing.findOne({ ListingId: 'ABC123' });
const photos = listing.Media
  .filter(m => m.MediaCategory === 'Photo')
  .sort((a, b) => a.Order - b.Order)
  .slice(0, 5)  // Top 5 photos
  .map(m => m.MediaURL);
```

---

### Cloudinary Storage
**Already Integrated:** `src/lib/services/audio-generation.service.ts`

**Extend for Video:**
```typescript
// Upload video to Cloudinary
const result = await cloudinary.uploader.upload(videoPath, {
  resource_type: 'video',
  folder: 'property-videos',
  tags: [listingId, campaignId, userId]
});
```

---

## Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅ Current
- [x] Voicemail script generation
- [x] 11Labs TTS
- [x] Cloudinary storage
- [x] Campaign management
- [ ] **Documentation complete** ← You are here

### Phase 2: HeyGen Video (Weeks 5-8) 🔄 Next
- [ ] HeyGen API integration
- [ ] PropertyVideo model
- [ ] Generate videos from scripts
- [ ] CMS UI for video preview

### Phase 3: Video Assembly (Weeks 9-12)
- [ ] Cloudinary video transformations
- [ ] Photo slideshow assembly
- [ ] HeyGen + photos combination
- [ ] Background music

### Phase 4: MLS Automation (Weeks 13-16)
- [ ] Auto-generate from new listings
- [ ] Scheduled generation
- [ ] Batch processing
- [ ] Template system

### Phase 5: Distribution (Weeks 17-20)
- [ ] YouTube auto-upload
- [ ] Social media distribution
- [ ] Email/SMS embedding
- [ ] Website integration

### Phase 6: Advanced Features (Weeks 21+)
- [ ] Market update videos
- [ ] ComfyUI graphics
- [ ] A/B testing
- [ ] Analytics dashboard

---

## Cost Analysis

### Per Video Cost Estimate

| Component | Technology | Cost/Video |
|-----------|-----------|-----------|
| Script Generation | Groq API | ~$0.001 |
| Video Presenter | HeyGen | $0.50-2.00 |
| Video Assembly | Cloudinary/FFmpeg | $0.01-0.15 |
| Storage | Cloudinary | $0.05/month |
| Distribution | YouTube API | Free |
| **Total** | | **$0.56-2.20** |

### ROI Calculation

**Time Saved:**
- Manual video creation: 30 minutes
- Automated: 5 minutes
- **Savings:** 25 minutes per video

**Listing Visibility:**
- Traditional: Website only
- With video: Website + YouTube + Social
- **Increase:** 3x reach

**Lead Generation:**
- Video view rate: 50% (vs 10% text)
- **Increase:** 5x engagement

---

## Related Documentation

- [Voicemail Script Generation](../features/VOICEMAIL_SCRIPT_GENERATION.md) - Foundation system
- [Campaign Strategy Architecture](../features/CAMPAIGN_STRATEGY_ARCHITECTURE.md) - Campaign management
- [MLS Integration](../mls/) - Data source documentation
- [Cloudinary Integration](../integrations/cloudinary/) - Storage system

---

## Quick Links

### External APIs
- [HeyGen API Docs](https://docs.heygen.com/)
- [Groq API Docs](https://console.groq.com/docs)
- [11Labs API Docs](https://elevenlabs.io/docs)
- [Cloudinary Video API](https://cloudinary.com/documentation/video_manipulation_and_delivery)
- [Shotstack API](https://shotstack.io/docs/api/)
- [YouTube Data API](https://developers.google.com/youtube/v3)

### Reference Implementations
- Horror video pipeline: `X:\_code\_cc\` (pre-production) + `X:\_ai\comfy\ComfyUI\output\horror\batch_short\` (production)
- Voicemail system: `src/lib/services/script-generation.service.ts` + `src/lib/services/audio-generation.service.ts`

---

**Questions or Contributions?**
Contact: Joseph Sardella | GitHub: @joseph-sardella
