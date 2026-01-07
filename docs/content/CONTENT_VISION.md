# Real Estate Content Creation Vision

**Last Updated:** January 2, 2026
**Status:** 🎯 Vision & Roadmap
**Current Focus:** Voicemail Drop System (Priority #1)

## Overview

Automated video content creation system for real estate marketing, leveraging existing voicemail script generation infrastructure to create professional property showcase videos, market updates, and agent branding content.

---

## Core Technology Stack

### Current Infrastructure (Production Ready)

| Component | Technology | Status |
|-----------|-----------|--------|
| **AI Script Generation** | Groq API (GPT-OSS 120B) | ✅ Production |
| **Text-to-Speech** | 11Labs API | ✅ Production |
| **Cloud Storage** | Cloudinary | ✅ Production |
| **Database** | MongoDB | ✅ Production |
| **API Framework** | Next.js 15 API Routes | ✅ Production |

### Content Creation Stack (Planned)

| Component | Technology | Status | Priority |
|-----------|-----------|--------|----------|
| **Video Presenters** | HeyGen API | 🔄 Planned | High |
| **Video Assembly** | FFmpeg (Cloud) | 🔄 Planned | High |
| **MLS Data Source** | Existing MLS Integration | ✅ Available | High |
| **Listing Photos** | Cloudinary CDN | ✅ Available | High |
| **AI Image Generation** | ComfyUI + VPS | 🔄 Future | Low |
| **Advanced Effects** | Cloud VPS Processing | 🔄 Future | Low |

---

## Vision: Three Content Pillars

### Pillar 1: Property Showcase Videos
**Goal:** Auto-generate listing videos from MLS data

**Workflow:**
```
MLS Listing Data → Groq Script Generation →
Listing Photos (from MLS) → HeyGen AI Presenter →
FFmpeg Assembly → Cloudinary Storage → YouTube Upload
```

**Use Cases:**
- New listing announcements
- Open house promotions
- Price reduction updates
- Just sold celebrations
- Virtual property tours

**Example Output:**
```
[HeyGen AI Avatar - Joseph]
"Hi, I'm Joseph Sardella with eXp Realty. Let me show you
this stunning 4-bedroom home in Indian Wells..."

[Transition to listing photos]
- Exterior shot
- Living room
- Kitchen
- Master bedroom
- Backyard

[Back to AI Avatar]
"Priced at $1.2M, this home won't last long.
Call me at (760) 899-6988 to schedule a showing."
```

---

### Pillar 2: Market Update Videos
**Goal:** Weekly/monthly market reports for SEO and social media

**Workflow:**
```
MLS Market Data (sales, inventory, price trends) →
Groq Generates Market Insights Script →
HeyGen AI Presenter + Chart Graphics →
FFmpeg Assembly → Multi-Platform Upload
```

**Use Cases:**
- Weekly market snapshots
- Neighborhood deep dives
- Buyer/seller market analysis
- Seasonal trends
- Investment opportunities

**Example Output:**
```
[HeyGen AI Avatar - Joseph]
"This week in Indian Wells real estate:
5 new listings, 3 homes sold, average price up 2%..."

[Show charts/graphs]
- Price trend graph
- Inventory levels
- Days on market

[Back to AI Avatar]
"If you're thinking of buying or selling,
now is a great time. Let's talk."
```

---

### Pillar 3: Agent Branding Content
**Goal:** Personalized voicemail follow-up videos and drip campaigns

**Workflow:**
```
Campaign Contact Data → Groq Script (using existing templates) →
11Labs Voiceover OR HeyGen Video Presenter →
FFmpeg Add Branding → Cloudinary → SMS/Email Delivery
```

**Use Cases:**
- Voicemail follow-up videos (instead of audio-only)
- Happy New Year / Holiday greetings
- Expired listing outreach
- Buyer in neighborhood notifications
- Reconnection campaigns

**Example Output:**
```
[HeyGen AI Avatar - Joseph]
"Hi Cache, this is Joseph Sardella. I left you a voicemail
about market opportunities in your area..."

[Show neighborhood map + equity data]

[Back to AI Avatar]
"Your home has gained $150K in equity. Let's discuss your options.
You can reach me at (760) 899-6988."
```

---

## Architecture: Phase 1 (Current Focus)

### Extend Existing Voicemail Infrastructure

**Already Built:**
- ✅ Groq API integration (`src/lib/services/script-generation.service.ts`)
- ✅ 11Labs TTS integration (`src/lib/services/audio-generation.service.ts`)
- ✅ Cloudinary storage management
- ✅ Campaign contact management
- ✅ 6 pre-made script templates
- ✅ AI output cleaning (`cleanScriptOutput()`)
- ✅ Batch processing with progress tracking

**Add for Video:**
1. **HeyGen Integration Service**
   ```typescript
   // src/lib/services/video-generation.service.ts
   export class VideoGenerationService {
     static async generateHeyGenVideo(
       scriptId: ObjectId,
       userId: ObjectId,
       avatarId: string = 'josh_lite'
     ): Promise<VideoGenerationResult> {
       const script = await VoicemailScript.findById(scriptId);

       // Call HeyGen API
       const heygenResponse = await fetch('https://api.heygen.com/v1/video.generate', {
         method: 'POST',
         headers: {
           'X-Api-Key': process.env.HEYGEN_API_KEY!
         },
         body: JSON.stringify({
           video_inputs: [{
             character: { type: 'avatar', avatar_id: avatarId },
             voice: { type: 'text', input_text: script.script }
           }]
         })
       });

       const { video_id } = await heygenResponse.json();

       // Poll for completion
       const videoUrl = await this.pollHeyGenVideo(video_id);

       // Download and upload to Cloudinary
       const cloudinaryUrl = await this.uploadToCloudinary(videoUrl, scriptId);

       return { success: true, videoUrl: cloudinaryUrl };
     }
   }
   ```

2. **Database Model Extension**
   ```typescript
   // src/models/VoicemailScript.ts - Add video field
   {
     video: {
       status: 'pending' | 'generating' | 'completed' | 'failed',
       url: string,              // Cloudinary URL
       heygenVideoId: string,    // HeyGen video ID
       avatarId: string,         // Avatar used
       duration: number,
       generatedAt: Date,
       error: string
     }
   }
   ```

3. **API Endpoint**
   ```typescript
   // src/app/api/campaigns/[id]/scripts/[scriptId]/generate-video/route.ts
   export async function POST(request: NextRequest) {
     const { avatarId } = await request.json();

     const result = await VideoGenerationService.generateHeyGenVideo(
       scriptId,
       userId,
       avatarId
     );

     return NextResponse.json(result);
   }
   ```

---

## FFmpeg Cloud Solutions

### Challenge
- FFmpeg needs to run somewhere to assemble videos
- DigitalOcean VPS has limited storage
- Downloading listing photos + HeyGen videos = large temp files

### Solution Options

#### Option 1: Cloudinary Video Transformations (Recommended)
**Why:** Already using Cloudinary, has built-in video editing

**Capabilities:**
- Concatenate video clips
- Overlay images/text
- Add audio tracks
- Apply transitions
- Trim/crop/resize

**Example:**
```typescript
// No FFmpeg needed - Cloudinary API handles it
const result = await cloudinary.video('video_id', {
  transformation: [
    { overlay: 'listing_photo_1', duration: 3 },
    { overlay: 'listing_photo_2', duration: 3 },
    { overlay: 'heygen_video', duration: 10 },
    { audio_codec: 'aac', audio_frequency: 44100 }
  ]
});
```

**Pros:**
- No VPS storage needed
- Already integrated
- Scales automatically
- Pay per transformation

**Cons:**
- Limited compared to full FFmpeg
- Cost per video processed

**Pricing:** ~$0.0025 per transformation (very affordable)

---

#### Option 2: Shotstack API (Cloud FFmpeg)
**Why:** Purpose-built cloud video editing API

**Features:**
- Full FFmpeg under the hood
- REST API interface
- Template-based editing
- No server management

**Example:**
```typescript
const edit = {
  timeline: {
    tracks: [
      {
        clips: [
          { asset: { type: 'video', src: heygenVideoUrl }, length: 15 },
          { asset: { type: 'image', src: photo1Url }, length: 3 },
          { asset: { type: 'image', src: photo2Url }, length: 3 }
        ]
      },
      {
        clips: [
          { asset: { type: 'audio', src: musicUrl }, volume: 0.3 }
        ]
      }
    ]
  },
  output: { format: 'mp4', resolution: '1080' }
};

const response = await fetch('https://api.shotstack.io/v1/render', {
  method: 'POST',
  headers: { 'x-api-key': process.env.SHOTSTACK_API_KEY },
  body: JSON.stringify(edit)
});
```

**Pros:**
- Full video editing power
- No infrastructure management
- Template reusability
- Fast rendering (cloud GPU)

**Cons:**
- Additional service ($29/month + render credits)
- Another API to integrate

**Pricing:** $29/month + $0.05-0.15 per video (based on length)

---

#### Option 3: AWS Lambda + FFmpeg Layer
**Why:** Serverless, pay only when processing

**Architecture:**
```
Trigger → Lambda Function (with FFmpeg layer) →
Download assets from Cloudinary →
Process with FFmpeg →
Upload to Cloudinary →
Delete temp files
```

**Implementation:**
```typescript
// Lambda handler
export const handler = async (event) => {
  const { scriptId, assets } = event;

  // Download assets to /tmp (512MB limit)
  const heygenVideo = await downloadToTemp(assets.heygenUrl);
  const photos = await Promise.all(assets.photos.map(downloadToTemp));

  // FFmpeg processing
  const outputPath = `/tmp/${scriptId}_final.mp4`;
  await execAsync(`
    ffmpeg -i ${heygenVideo}
           -i ${photos[0]} -i ${photos[1]} -i ${photos[2]}
           -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1[outv]"
           -map "[outv]" ${outputPath}
  `);

  // Upload to Cloudinary
  const cloudinaryUrl = await uploadToCloudinary(outputPath);

  // Cleanup
  await cleanup([heygenVideo, ...photos, outputPath]);

  return { videoUrl: cloudinaryUrl };
};
```

**Pros:**
- True FFmpeg power
- Serverless (no VPS management)
- 512MB temp storage per invocation
- Very cheap ($0.20 per 1M requests)

**Cons:**
- 15-minute timeout limit
- 512MB temp storage (must manage carefully)
- Cold start latency

**Pricing:** ~$0.0001 per video (extremely cheap)

---

#### Option 4: DigitalOcean VPS + Aggressive Cleanup
**Why:** You already have it, just need smart storage management

**Strategy:**
```typescript
// src/lib/services/ffmpeg-vps.service.ts
export class FFmpegVPSService {
  static async processVideo(scriptId: ObjectId) {
    const workDir = `/tmp/video_${scriptId}`;

    try {
      // 1. Create temp directory
      await fs.mkdir(workDir);

      // 2. Download assets (streaming to disk)
      const heygenPath = await this.streamDownload(heygenUrl, workDir);
      const photoPaths = await this.downloadPhotos(photos, workDir);

      // 3. FFmpeg processing (output to same temp dir)
      const outputPath = `${workDir}/final.mp4`;
      await this.runFFmpeg(heygenPath, photoPaths, outputPath);

      // 4. Upload to Cloudinary (streaming upload)
      const cloudinaryUrl = await this.streamUpload(outputPath);

      return { success: true, videoUrl: cloudinaryUrl };

    } finally {
      // 5. ALWAYS cleanup, even on error
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  static async runFFmpeg(heygenPath: string, photos: string[], output: string) {
    // Build filter_complex for video assembly
    const filterComplex = `
      [1:v]scale=1920:1080,setsar=1,fade=t=in:st=0:d=0.5[photo1];
      [2:v]scale=1920:1080,setsar=1,fade=t=in:st=0:d=0.5[photo2];
      [3:v]scale=1920:1080,setsar=1,fade=t=in:st=0:d=0.5[photo3];
      [0:v][photo1][photo2][photo3]concat=n=4:v=1:a=0[outv]
    `;

    await execAsync(`
      ffmpeg -i ${heygenPath}
             -loop 1 -t 3 -i ${photos[0]}
             -loop 1 -t 3 -i ${photos[1]}
             -loop 1 -t 3 -i ${photos[2]}
             -filter_complex "${filterComplex}"
             -map "[outv]" -c:v libx264 -preset fast -crf 23
             ${output}
    `);
  }
}
```

**Pros:**
- Full FFmpeg control
- No additional costs
- Fast processing (dedicated resources)

**Cons:**
- Must manage storage aggressively
- Single point of failure
- Requires monitoring

**Storage Management:**
- Process one video at a time (sequential)
- Stream downloads (don't load into memory)
- Delete immediately after upload
- Monitor disk usage with alerts

---

### Recommended Approach: Hybrid

**Phase 1 (Immediate):** Cloudinary Video Transformations
- Start with simple property videos (photos → slideshow)
- No HeyGen yet (just photos + music)
- Zero infrastructure setup
- Validate content-market fit

**Phase 2 (Next 3 months):** Add HeyGen + DigitalOcean FFmpeg
- Integrate HeyGen for AI presenter
- Use DO VPS with aggressive cleanup
- Build monitoring for storage usage
- Scale to 10-20 videos/day

**Phase 3 (Future):** Migrate to AWS Lambda or Shotstack
- Once volume increases (50+ videos/day)
- Need parallel processing
- Or complexity increases (need full FFmpeg features)

---

## MLS Data Integration

### Already Available

**MLS Listings Collection:** `unified-listings-palm-desert`, etc.

**Fields Available:**
```typescript
{
  ListingId: string,
  UnparsedAddress: string,
  City: string,
  StateOrProvince: string,
  PostalCode: string,
  ListPrice: number,
  BedroomsTotal: number,
  BathroomsTotalInteger: number,
  LivingArea: number,
  PropertyType: string,
  PropertySubType: string,
  PublicRemarks: string,
  Media: Array<{
    MediaURL: string,
    Order: number,
    MediaCategory: string
  }>
}
```

### Script Generation from MLS Data

**Extend Existing Service:**
```typescript
// src/lib/services/script-generation.service.ts

static async generatePropertyScript(
  listingId: string,
  userId: ObjectId,
  templateType: 'new_listing' | 'open_house' | 'price_reduction'
): Promise<{ script: string }> {

  // Fetch listing from MLS
  const listing = await Listing.findOne({ ListingId: listingId });

  // Build context-rich prompt
  const prompt = `
    Create a compelling video script for this property listing:

    Address: ${listing.UnparsedAddress}
    City: ${listing.City}
    Price: $${listing.ListPrice.toLocaleString()}
    Bedrooms: ${listing.BedroomsTotal}
    Bathrooms: ${listing.BathroomsTotalInteger}
    Square Feet: ${listing.LivingArea}
    Property Type: ${listing.PropertyType}
    Description: ${listing.PublicRemarks}

    Template: ${templateType}

    Create a 30-second video script for agent Joseph Sardella to present this property.
    The script should:
    - Hook viewers in first 3 seconds
    - Highlight key features
    - Create urgency
    - Include clear call-to-action

    OUTPUT ONLY THE RAW SCRIPT DIALOGUE.
  `;

  const response = await this.callGroqAPI(prompt);
  const cleanedScript = this.cleanScriptOutput(response);

  return { script: cleanedScript };
}
```

---

## Database Models

### PropertyVideo Model

```typescript
// src/models/PropertyVideo.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPropertyVideo extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: string;                    // MLS Listing ID
  campaignId?: mongoose.Types.ObjectId; // Optional: link to campaign

  // Script
  script: string;
  scriptVersion: number;
  templateType: 'new_listing' | 'open_house' | 'price_reduction' | 'just_sold' | 'market_update';

  // Assets
  photos: Array<{
    url: string;
    order: number;
    duration: number; // seconds to display
  }>;

  // HeyGen Video
  heygen: {
    status: 'pending' | 'generating' | 'completed' | 'failed';
    videoId?: string;
    url?: string;
    avatarId?: string;
    duration?: number;
    generatedAt?: Date;
    error?: string;
  };

  // Final Video
  video: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    url?: string;                       // Cloudinary URL
    cloudinaryId?: string;
    duration?: number;
    resolution?: string;                // '1080p', '720p'
    fileSize?: number;                  // bytes
    generatedAt?: Date;
    error?: string;
  };

  // YouTube Upload
  youtube: {
    status: 'pending' | 'uploading' | 'published' | 'failed';
    videoId?: string;
    url?: string;
    publishedAt?: Date;
    metadata?: {
      title: string;
      description: string;
      tags: string[];
    };
    error?: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const PropertyVideoSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: String, required: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },

  script: { type: String, required: true },
  scriptVersion: { type: Number, default: 1 },
  templateType: {
    type: String,
    enum: ['new_listing', 'open_house', 'price_reduction', 'just_sold', 'market_update'],
    required: true
  },

  photos: [{
    url: String,
    order: Number,
    duration: Number
  }],

  heygen: {
    status: { type: String, enum: ['pending', 'generating', 'completed', 'failed'], default: 'pending' },
    videoId: String,
    url: String,
    avatarId: String,
    duration: Number,
    generatedAt: Date,
    error: String
  },

  video: {
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    url: String,
    cloudinaryId: String,
    duration: Number,
    resolution: String,
    fileSize: Number,
    generatedAt: Date,
    error: String
  },

  youtube: {
    status: { type: String, enum: ['pending', 'uploading', 'published', 'failed'], default: 'pending' },
    videoId: String,
    url: String,
    publishedAt: Date,
    metadata: {
      title: String,
      description: String,
      tags: [String]
    },
    error: String
  }
}, {
  timestamps: true
});

export default mongoose.models.PropertyVideo || mongoose.model<IPropertyVideo>('PropertyVideo', PropertyVideoSchema);
```

---

## Environment Variables

### Add to `.env`

```env
# HeyGen API
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_DEFAULT_AVATAR=josh_lite

# FFmpeg Processing (choose one)
# Option 1: Cloudinary (already configured)
# Option 2: Shotstack
SHOTSTACK_API_KEY=your_shotstack_key
# Option 3: AWS Lambda
AWS_LAMBDA_FUNCTION_ARN=arn:aws:lambda:...
# Option 4: DigitalOcean VPS
FFMPEG_VPS_URL=https://your-do-vps.com/api/process-video
FFMPEG_VPS_API_KEY=your_vps_api_key

# YouTube API (already configured for voicemail system)
YOUTUBE_CLIENT_SECRETS_FILE=client_secrets.json
```

---

## Roadmap

### Phase 1: Foundation (Current)
**Timeline:** Weeks 1-4
**Status:** ✅ In Progress

- [x] Voicemail script generation (Groq)
- [x] 11Labs TTS integration
- [x] Cloudinary storage
- [x] Campaign management
- [x] 6 script templates
- [ ] Documentation complete

### Phase 2: HeyGen Video Integration
**Timeline:** Weeks 5-8
**Status:** 🔄 Planned

- [ ] HeyGen API service integration
- [ ] PropertyVideo database model
- [ ] Generate HeyGen videos from scripts
- [ ] Cloudinary video storage
- [ ] CMS UI for video preview

### Phase 3: Property Video Assembly
**Timeline:** Weeks 9-12
**Status:** 🔄 Planned

- [ ] Implement Cloudinary video transformations
- [ ] Listing photo → slideshow assembly
- [ ] HeyGen video + photos combination
- [ ] Background music integration
- [ ] Brand overlay (logo, contact info)

### Phase 4: MLS Automation
**Timeline:** Weeks 13-16
**Status:** 🔄 Planned

- [ ] Auto-generate scripts from MLS data
- [ ] Scheduled video generation (new listings)
- [ ] Batch processing for multiple properties
- [ ] Template system (5-10 pre-made templates)
- [ ] Analytics dashboard

### Phase 5: Distribution
**Timeline:** Weeks 17-20
**Status:** 🔄 Future

- [ ] YouTube auto-upload with SEO metadata
- [ ] Social media distribution (Facebook, Instagram)
- [ ] Email embedding
- [ ] SMS video messages
- [ ] Website property page integration

### Phase 6: Advanced Features
**Timeline:** Weeks 21+
**Status:** 🔄 Future

- [ ] Market update videos (weekly automation)
- [ ] Neighborhood deep-dive videos
- [ ] ComfyUI integration for custom graphics
- [ ] A/B testing different scripts/avatars
- [ ] Performance analytics (view rates, engagement)

---

## Success Metrics

### Video Production
- **Goal:** 10 property videos/week by Month 2
- **Goal:** 50 property videos/week by Month 6
- **Goal:** <5 minute generation time per video

### Engagement
- **Goal:** >50% video view rate in emails
- **Goal:** >30% click-through to listing
- **Goal:** 10% reduction in cold outreach needed

### Cost Efficiency
- **HeyGen:** ~$0.50-2.00 per video (based on length)
- **FFmpeg Processing:** ~$0.01-0.15 per video
- **Cloudinary Storage:** ~$0.05 per video/month
- **Total Cost:** <$2.50 per video

### ROI
- **Time Saved:** 30 min/video manual creation → 5 min automated
- **Listing Visibility:** 3x increase (YouTube + social)
- **Lead Generation:** 20% increase from video content

---

## Related Documentation

- [Voicemail Script Generation](../features/VOICEMAIL_SCRIPT_GENERATION.md)
- [Campaign Strategy Architecture](../features/CAMPAIGN_STRATEGY_ARCHITECTURE.md)
- [Content Creation Reference Implementation](./REFERENCE_IMPLEMENTATION.md) (Horror video pipeline learnings)

---

**Questions or Feedback?**
Contact: Joseph Sardella | GitHub: @joseph-sardella
