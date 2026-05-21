# HeyGen Video Pipeline - Phase 1 Implementation

**Last Updated:** January 10, 2026
**Status:** 🚀 Ready to Implement
**Author:** Joseph Sardella

---

## Vision

Create an AI-powered video generation pipeline that allows agents to produce professional property videos, market updates, and personalized messages using HeyGen's avatar technology and Groq's AI script generation - without complex video editing or FFmpeg processing.

---

## Core Philosophy

**Keep It Simple:**
- HeyGen handles ALL video production
- Groq handles ALL script generation
- No video editing required
- No FFmpeg complexity (for now)
- Focus on speed and ease of use

**Later Enhancements:**
- MLS data integration
- Custom video composition
- Property tour overlays
- Advanced editing features

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMPLIFIED PIPELINE                       │
└─────────────────────────────────────────────────────────────┘

USER INPUT (CMS)
       ↓
GROQ AI (Script Generation)
       ↓
HEYGEN API (Video Generation)
       ↓
CLOUDINARY (Storage)
       ↓
YOUTUBE (Optional Publishing)
```

| Component | Technology | Status | Purpose |
|-----------|-----------|--------|---------|
| **Script AI** | Groq GPT-OSS 120B | ✅ Existing | Generate video scripts |
| **Video Generation** | HeyGen API | 🔄 New | Avatar video creation |
| **Storage** | Cloudinary | ✅ Existing | Video hosting & CDN |
| **Database** | MongoDB | ✅ Existing | Track videos & metadata |
| **Frontend** | Next.js 15 + React 19 | ✅ Existing | CMS interface |
| **Publishing** | YouTube API v3 | 🔄 Future | Auto-upload videos |

---

## Environment Variables

```env
# HeyGen API Configuration
HEYGEN_API_KEY=your_api_key_here
HEYGEN_AVATAR_GROUP_ID=your_group_id
HEYGEN_AVATAR_ID=your_avatar_id

# Groq AI (Already Configured)
GROQ_API_KEY=existing_key

# Cloudinary (Already Configured)
CLOUDINARY_CLOUD_NAME=existing
CLOUDINARY_API_KEY=existing
CLOUDINARY_API_SECRET=existing
```

---

## User Workflow

### Step 1: Access Video Creation

```
/agent/cms → Click [+] Button → Select "🎥 Video Creation"
```

User lands on: `/agent/cms/videos/new`

### Step 2: Choose Video Type

```
┌────────────────────────────────────────────────────────┐
│  What type of video do you want to create?            │
│                                                        │
│  ┌────────────────┐  ┌────────────────┐              │
│  │ 🏠 Property    │  │ 📊 Market      │              │
│  │    Showcase    │  │    Update      │              │
│  │                │  │                │              │
│  │ "Introduce a   │  │ "Weekly market │              │
│  │  new listing"  │  │  insights"     │              │
│  └────────────────┘  └────────────────┘              │
│                                                        │
│  ┌────────────────┐  ┌────────────────┐              │
│  │ 💬 Personal    │  │ 📝 Custom      │              │
│  │    Message     │  │    Script      │              │
│  │                │  │                │              │
│  │ "Direct client │  │ "Write your    │              │
│  │  communication"│  │  own script"   │              │
│  └────────────────┘  └────────────────┘              │
└────────────────────────────────────────────────────────┘
```

### Step 3: Generate Script with AI

```
┌────────────────────────────────────────────────────────┐
│  Script Generation                                     │
│                                                        │
│  Topic: ___________________________________________    │
│         (e.g., "4-bedroom home in Indian Wells")      │
│                                                        │
│  Key Points (optional):                                │
│  • ____________________________________________       │
│  • ____________________________________________       │
│  • ____________________________________________       │
│                                                        │
│  Target Length: [30 seconds ▼]                        │
│                                                        │
│  [Generate Script with AI]                             │
│                                                        │
│  ─────────── OR ───────────                           │
│                                                        │
│  [Write Custom Script]                                 │
└────────────────────────────────────────────────────────┘
```

**After clicking "Generate Script with AI":**

```
┌────────────────────────────────────────────────────────┐
│  ✨ AI Generated Script                                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Hi, I'm Joseph Sardella with eXp Realty.        │ │
│  │                                                  │ │
│  │ Let me show you this stunning 4-bedroom home    │ │
│  │ in Indian Wells. This property features a       │ │
│  │ gourmet kitchen, resort-style pool, and         │ │
│  │ mountain views.                                  │ │
│  │                                                  │ │
│  │ Priced at $1.2 million, this home won't last    │ │
│  │ long. Call me today at 760-899-6988 to          │ │
│  │ schedule your private showing.                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  📝 125 words | ⏱️ ~30 seconds                        │
│                                                        │
│  [Edit Script] [Regenerate] [Continue to Video →]     │
└────────────────────────────────────────────────────────┘
```

### Step 4: Configure Video Settings

```
┌────────────────────────────────────────────────────────┐
│  Video Settings                                        │
│                                                        │
│  Avatar:                                               │
│  ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │ [✓]    │ │        │ │        │                    │
│  │ Joseph │ │ Josh   │ │ Emily  │                    │
│  │ (Your) │ │ (Free) │ │ (Free) │                    │
│  └────────┘ └────────┘ └────────┘                    │
│                                                        │
│  Voice:                                                │
│  [Professional Male (en-US) ▼]                        │
│                                                        │
│  Background:                                           │
│  ○ Solid Color: [#FFFFFF ▼]                           │
│  ○ Upload Image                                        │
│  ○ Select from Library                                 │
│                                                        │
│  Aspect Ratio:                                         │
│  ○ 16:9 (YouTube, Website)                            │
│  ● 9:16 (Instagram, TikTok)                           │
│  ○ 1:1 (Social Square)                                │
│                                                        │
│  Quality:                                              │
│  ○ Preview (free, with watermark)                     │
│  ● Production (1 credit, no watermark)                │
│                                                        │
│  [← Back] [Generate Video (1 Credit)]                 │
└────────────────────────────────────────────────────────┘
```

### Step 5: Video Generation Progress

```
┌────────────────────────────────────────────────────────┐
│  🎬 Generating Your Video                              │
│                                                        │
│  [████████████████████░░░] 85%                        │
│                                                        │
│  Status: Rendering video... (~15 seconds remaining)   │
│                                                        │
│  ⏱️ Started: 2:30 PM                                  │
│  💳 Credits: 1                                         │
│                                                        │
│  This usually takes 30-60 seconds                     │
└────────────────────────────────────────────────────────┘
```

### Step 6: Preview & Publish

```
┌────────────────────────────────────────────────────────┐
│  ✅ Video Ready!                                       │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ <video controls>                                 │ │
│  │   [Your video plays here]                        │ │
│  │ </video>                                         │ │
│  │                                                  │ │
│  │ Duration: 32 seconds                             │ │
│  │ Size: 8.5 MB                                     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Title: _________________________________________     │
│                                                        │
│  [Save to Library] [Publish to YouTube] [Download]    │
│                                                        │
│  [← Create Another Video]                             │
└────────────────────────────────────────────────────────┘
```

---

## Database Schema

### PropertyVideo Model

```typescript
// src/models/PropertyVideo.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export type VideoType = 'property_listing' | 'market_update' | 'personal_message' | 'custom';
export type VideoStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

export interface IPropertyVideo extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  // Video Configuration
  videoType: VideoType;
  title: string;
  script: string;

  // HeyGen Settings
  heygen: {
    avatarId: string;
    voiceId: string;
    aspectRatio: AspectRatio;
    background: {
      type: 'color' | 'image' | 'video';
      value: string;  // hex color or URL
    };
    quality: 'preview' | 'production';
  };

  // Generation Status
  status: VideoStatus;
  heygenVideoId?: string;

  // Generated Assets
  videoUrl?: string;              // HeyGen URL (temporary)
  cloudinaryVideoId?: string;
  cloudinaryVideoUrl?: string;    // Permanent storage
  thumbnailUrl?: string;
  duration?: number;              // seconds

  // YouTube Integration (Future)
  youtube?: {
    status: 'pending' | 'uploading' | 'published';
    videoId?: string;
    url?: string;
  };

  // Metadata
  creditsUsed: number;
  error?: string;
  generatedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PropertyVideoSchema = new Schema<IPropertyVideo>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  videoType: {
    type: String,
    enum: ['property_listing', 'market_update', 'personal_message', 'custom'],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  script: {
    type: String,
    required: true
  },

  heygen: {
    avatarId: String,
    voiceId: String,
    aspectRatio: {
      type: String,
      enum: ['16:9', '9:16', '1:1', '4:3'],
      default: '16:9'
    },
    background: {
      type: {
        type: String,
        enum: ['color', 'image', 'video'],
        default: 'color'
      },
      value: {
        type: String,
        default: '#FFFFFF'
      }
    },
    quality: {
      type: String,
      enum: ['preview', 'production'],
      default: 'production'
    }
  },

  status: {
    type: String,
    enum: ['draft', 'generating', 'completed', 'failed'],
    default: 'draft',
    index: true
  },

  heygenVideoId: String,
  videoUrl: String,
  cloudinaryVideoId: String,
  cloudinaryVideoUrl: String,
  thumbnailUrl: String,
  duration: Number,

  youtube: {
    status: {
      type: String,
      enum: ['pending', 'uploading', 'published']
    },
    videoId: String,
    url: String
  },

  creditsUsed: {
    type: Number,
    default: 0
  },

  error: String,
  generatedAt: Date
}, {
  timestamps: true
});

// Indexes
PropertyVideoSchema.index({ userId: 1, createdAt: -1 });
PropertyVideoSchema.index({ status: 1 });
PropertyVideoSchema.index({ videoType: 1 });

export default mongoose.models.PropertyVideo ||
  mongoose.model<IPropertyVideo>('PropertyVideo', PropertyVideoSchema);
```

---

## Backend Services

### 1. HeyGen Video Service

```typescript
// src/lib/services/heygen-video.service.ts

export interface VideoConfig {
  script: string;
  avatarId: string;
  voiceId: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  background: {
    type: 'color' | 'image' | 'video';
    value: string;
  };
  quality: 'preview' | 'production';
  title?: string;
}

export interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

export class HeyGenVideoService {

  /**
   * Generate a video using HeyGen API
   */
  static async generateVideo(config: VideoConfig): Promise<{ videoId: string }> {
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: config.avatarId,
            avatar_style: 'normal'
          },
          voice: {
            type: 'text',
            input_text: config.script,
            voice_id: config.voiceId
          },
          background: config.background
        }],
        aspect_ratio: config.aspectRatio,
        test: config.quality === 'preview',
        title: config.title || 'Generated Video'
      })
    });

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 100) {
      throw new Error(data.message || 'Video generation failed');
    }

    return { videoId: data.data.video_id };
  }

  /**
   * Check video generation status
   */
  static async getVideoStatus(videoId: string): Promise<VideoStatus> {
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY!
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get video status: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      status: data.data.status,
      videoUrl: data.data.video_url,
      thumbnailUrl: data.data.thumbnail_url,
      duration: data.data.duration,
      error: data.data.error
    };
  }

  /**
   * Poll video status until completed or failed
   */
  static async pollVideoStatus(
    videoId: string,
    maxAttempts = 60,
    intervalMs = 3000
  ): Promise<VideoStatus> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getVideoStatus(videoId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Video generation timeout');
  }

  /**
   * Save video to Cloudinary
   */
  static async saveToCloudinary(
    videoUrl: string,
    videoId: string
  ): Promise<{ cloudinaryId: string; cloudinaryUrl: string }> {
    // Download video from HeyGen
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();

    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'property-videos',
          public_id: videoId,
          overwrite: true
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              cloudinaryId: result!.public_id,
              cloudinaryUrl: result!.secure_url
            });
          }
        }
      );

      uploadStream.end(Buffer.from(videoBuffer));
    });
  }

  /**
   * List available avatars
   */
  static async listAvatars() {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY!
      }
    });

    const data = await response.json();
    return data.avatars || [];
  }

  /**
   * List available voices
   */
  static async listVoices() {
    const response = await fetch('https://api.heygen.com/v2/voices', {
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY!
      }
    });

    const data = await response.json();
    return data.voices || [];
  }
}
```

### 2. Video Script Service (Extends Existing Groq)

```typescript
// src/lib/services/video-script.service.ts

import { ScriptGenerationService } from './script-generation.service';

export type VideoScriptType = 'property_listing' | 'market_update' | 'personal_message';

export class VideoScriptService {

  /**
   * Generate a video script using Groq AI
   */
  static async generateVideoScript(
    type: VideoScriptType,
    topic: string,
    keyPoints: string[] = [],
    targetLength: number = 30 // seconds
  ): Promise<string> {

    const wordCount = Math.floor(targetLength * 2.5); // ~2.5 words per second

    const prompt = this.buildPrompt(type, topic, keyPoints, wordCount);

    // Use existing Groq integration
    const response = await ScriptGenerationService.callGroqAPI(prompt);

    // Clean output
    return ScriptGenerationService.cleanScriptOutput(response);
  }

  /**
   * Build prompt based on video type
   */
  private static buildPrompt(
    type: VideoScriptType,
    topic: string,
    keyPoints: string[],
    wordCount: number
  ): string {
    const basePrompt = `
You are a professional real estate video scriptwriter.

Create a ${wordCount}-word video script for Joseph Sardella, a real estate agent with eXp Realty in the Coachella Valley.

Topic: ${topic}

${keyPoints.length > 0 ? `Key Points to Include:\n${keyPoints.map(p => `- ${p}`).join('\n')}` : ''}

Requirements:
- Professional yet conversational tone
- Start with a hook in first 3 seconds
- Include clear call-to-action
- Natural speaking rhythm
- Exactly ${wordCount} words (±10 words)
- NO markdown formatting
- NO stage directions
- ONLY the spoken dialogue

${this.getTypeSpecificGuidelines(type)}

OUTPUT ONLY THE RAW SCRIPT TEXT.
    `.trim();

    return basePrompt;
  }

  /**
   * Type-specific guidelines
   */
  private static getTypeSpecificGuidelines(type: VideoScriptType): string {
    switch (type) {
      case 'property_listing':
        return `
Style: Enthusiastic property introduction
Structure:
1. Greeting + Property intro (5 seconds)
2. Key features highlight (15-20 seconds)
3. Call-to-action (5 seconds)
        `.trim();

      case 'market_update':
        return `
Style: Informative market analysis
Structure:
1. Market snapshot intro (5 seconds)
2. Key statistics & trends (15-20 seconds)
3. What it means for buyers/sellers (5 seconds)
        `.trim();

      case 'personal_message':
        return `
Style: Warm, personal communication
Structure:
1. Personal greeting (3 seconds)
2. Main message (20-24 seconds)
3. Next steps / CTA (3 seconds)
        `.trim();

      default:
        return '';
    }
  }

  /**
   * Estimate video duration from script
   */
  static estimateDuration(script: string): number {
    const wordCount = script.split(/\s+/).length;
    const wordsPerSecond = 2.5;
    return Math.ceil(wordCount / wordsPerSecond);
  }

  /**
   * Count words in script
   */
  static countWords(script: string): number {
    return script.split(/\s+/).filter(w => w.length > 0).length;
  }
}
```

---

## API Routes

### POST /api/videos/generate

```typescript
// src/app/api/videos/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PropertyVideo from '@/models/PropertyVideo';
import { HeyGenVideoService } from '@/lib/services/heygen-video.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      videoType,
      title,
      script,
      avatarId,
      voiceId,
      aspectRatio,
      background,
      quality
    } = body;

    // Validate required fields
    if (!script || !avatarId || !voiceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create database record
    const video = await PropertyVideo.create({
      userId: session.user.id,
      videoType: videoType || 'custom',
      title: title || 'Untitled Video',
      script,
      heygen: {
        avatarId,
        voiceId,
        aspectRatio: aspectRatio || '16:9',
        background: background || { type: 'color', value: '#FFFFFF' },
        quality: quality || 'production'
      },
      status: 'generating',
      creditsUsed: quality === 'preview' ? 0 : 1
    });

    // Generate video with HeyGen
    const { videoId } = await HeyGenVideoService.generateVideo({
      script,
      avatarId,
      voiceId,
      aspectRatio: aspectRatio || '16:9',
      background: background || { type: 'color', value: '#FFFFFF' },
      quality: quality || 'production',
      title
    });

    // Update with HeyGen video ID
    video.heygenVideoId = videoId;
    await video.save();

    return NextResponse.json({
      success: true,
      videoId: video._id.toString(),
      heygenVideoId: videoId
    });

  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### GET /api/videos/status/[videoId]

```typescript
// src/app/api/videos/status/[videoId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PropertyVideo from '@/models/PropertyVideo';
import { HeyGenVideoService } from '@/lib/services/heygen-video.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const video = await PropertyVideo.findOne({
      _id: params.videoId,
      userId: session.user.id
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    // If already completed, return cached data
    if (video.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: video.cloudinaryVideoUrl || video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration
      });
    }

    // Check HeyGen status
    if (video.heygenVideoId) {
      const heygenStatus = await HeyGenVideoService.getVideoStatus(
        video.heygenVideoId
      );

      // Update database
      if (heygenStatus.status === 'completed') {
        video.status = 'completed';
        video.videoUrl = heygenStatus.videoUrl;
        video.thumbnailUrl = heygenStatus.thumbnailUrl;
        video.duration = heygenStatus.duration;
        video.generatedAt = new Date();

        // Save to Cloudinary in background
        if (heygenStatus.videoUrl) {
          try {
            const cloudinary = await HeyGenVideoService.saveToCloudinary(
              heygenStatus.videoUrl,
              video.heygenVideoId
            );
            video.cloudinaryVideoId = cloudinary.cloudinaryId;
            video.cloudinaryVideoUrl = cloudinary.cloudinaryUrl;
          } catch (err) {
            console.error('Cloudinary save error:', err);
          }
        }

        await video.save();
      } else if (heygenStatus.status === 'failed') {
        video.status = 'failed';
        video.error = heygenStatus.error || 'Video generation failed';
        await video.save();
      }

      return NextResponse.json({
        success: true,
        status: heygenStatus.status,
        videoUrl: video.cloudinaryVideoUrl || heygenStatus.videoUrl,
        thumbnailUrl: heygenStatus.thumbnailUrl,
        duration: heygenStatus.duration,
        error: heygenStatus.error
      });
    }

    return NextResponse.json({
      success: true,
      status: video.status
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### POST /api/videos/generate-script

```typescript
// src/app/api/videos/generate-script/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { VideoScriptService } from '@/lib/services/video-script.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, topic, keyPoints, targetLength } = body;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Generate script
    const script = await VideoScriptService.generateVideoScript(
      type || 'custom',
      topic,
      keyPoints || [],
      targetLength || 30
    );

    // Calculate metrics
    const wordCount = VideoScriptService.countWords(script);
    const estimatedDuration = VideoScriptService.estimateDuration(script);

    return NextResponse.json({
      success: true,
      script,
      wordCount,
      estimatedDuration
    });

  } catch (error: any) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### GET /api/videos

```typescript
// src/app/api/videos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PropertyVideo from '@/models/PropertyVideo';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const videoType = searchParams.get('videoType');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const query: any = { userId: session.user.id };

    if (status) query.status = status;
    if (videoType) query.videoType = videoType;

    const videos = await PropertyVideo.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await PropertyVideo.countDocuments(query);

    return NextResponse.json({
      success: true,
      videos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('List videos error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Frontend Components

### Video Creation Page Scaffold

```
/agent/cms/videos/new
├── Step 1: Video Type Selection
├── Step 2: Script Generation/Entry
├── Step 3: Video Settings
├── Step 4: Generation Progress
└── Step 5: Preview & Save
```

Full component implementation will be created in Phase 1 development.

---

## Cost Analysis

### HeyGen Pricing (January 2026)

| Plan | Credits | Monthly Cost | Per Video (1 min) |
|------|---------|--------------|-------------------|
| Free | 10 | $0 | $0 (with watermark) |
| Pro | 100 | $99 | $0.99 |
| Scale | 660 | $330 | $0.50 |

### Recommended Plan

**Start with Pro ($99/month):**
- 100 videos per month
- ~3 videos per day
- Perfect for testing and initial adoption
- Upgrade to Scale when volume increases

### Cost per Video

```
Groq Script Generation:    $0.001
HeyGen Video Generation:   $0.50 - $0.99
Cloudinary Storage:        $0.05/month
─────────────────────────────────────
TOTAL:                     $0.55 - $1.00 per video
```

---

## Success Metrics

### Phase 1 Goals

- ✅ Generate first video in < 5 minutes
- ✅ User can create video without training
- ✅ 100% success rate for video generation
- ✅ Average script quality rating > 4/5

### Tracking

```typescript
// Track in PropertyVideo model
{
  analytics: {
    creationTime: number,        // ms from start to video ready
    scriptRegenerations: number, // how many times user regenerated
    userEdited: boolean,         // did user edit AI script
    userRating?: number          // 1-5 stars
  }
}
```

---

## Roadmap

### Phase 1: Core Functionality (Weeks 1-2) 🚀 Current

- [ ] Database models
- [ ] HeyGen service integration
- [ ] Video script service
- [ ] API endpoints
- [ ] Basic UI components
- [ ] Video feed in CMS

### Phase 2: Enhanced Features (Weeks 3-4)

- [ ] MLS data integration
- [ ] Auto-generate from listings
- [ ] Template library
- [ ] Batch video generation
- [ ] Analytics dashboard

### Phase 3: Distribution (Weeks 5-6)

- [ ] YouTube auto-upload
- [ ] Social media integration
- [ ] Email embedding
- [ ] SMS video messages

### Phase 4: Advanced (Weeks 7+)

- [ ] Custom video composition (FFmpeg)
- [ ] Property tour overlays
- [ ] Multi-scene videos
- [ ] A/B testing scripts

---

## Next Steps

1. **Set up HeyGen account** and get API credentials
2. **Create PropertyVideo model** in database
3. **Implement HeyGen service** layer
4. **Build API endpoints** for video generation
5. **Create CMS UI** for video creation
6. **Test with first video** generation

---

## Related Documentation

- [Script Generation Service](../features/VOICEMAIL_SCRIPT_GENERATION.md) - Existing Groq integration
- [Cloudinary Integration](../integrations/cloudinary/) - Storage system
- [Campaign Strategy](../campaigns/CAMPAIGN_STRATEGY_ARCHITECTURE.md) - Future integration

---

**Ready to implement? Let's start with Phase 1!**
