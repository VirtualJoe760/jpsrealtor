# Reference Implementation: Horror Video Pipeline

**Last Updated:** January 2, 2026
**Status:** ✅ Production Ready (Separate Project)
**Project Location:** `X:\_code\_cc\` (Pre-production) + `X:\_ai\comfy\ComfyUI\output\horror\batch_short\` (Production)

> **Note:** This is a **reference implementation** - a separate horror video content pipeline built independently to test automation concepts. The learnings from this system inform the **real estate content creation vision** documented in [CONTENT_VISION.md](./CONTENT_VISION.md).
>
> **Key Differences:**
> - This pipeline: Reddit stories → Ollama → Kokoro TTS → ComfyUI → FFmpeg → YouTube
> - Real estate pipeline: MLS data → Groq → 11Labs → HeyGen → FFmpeg → YouTube
>
> This document serves as a technical reference for understanding workflow automation, batch processing, and integration patterns.

---

## Overview

Fully automated content creation pipeline that transforms Reddit horror stories into cinematic YouTube short videos with AI-generated visuals, professional narration, and dynamic subtitles.

**Complete Workflow:**
```
Reddit API → AI Curation → TTS Narration → Location Extraction →
Image Generation → Video Morphing → Assembly & Captions →
Metadata Generation → YouTube Upload
```

**Technology Stack:**
- **Reddit Fetching:** PRAW (Python Reddit API Wrapper)
- **AI Curation:** Ollama with LLaMA 3.1 (8B/70B models)
- **Text-to-Speech:** Kokoro TTS (af_heart voice)
- **Image Generation:** ComfyUI API with Stable Diffusion
- **Video Processing:** IPIV (Image-to-Video Interpolation), FFmpeg
- **Subtitles:** OpenAI Whisper (word-level timing) + ASS format
- **Upload:** YouTube Data API v3 with OAuth

---

## Architecture

### Two-Phase System

#### Phase 1: Pre-Production (`X:\_code\_cc\`)
Scripts that gather, curate, and prepare content for video generation.

#### Phase 2: Production (`X:\_ai\comfy\ComfyUI\output\horror\batch_short\`)
Scripts that generate images, create videos, and upload to YouTube.

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRE-PRODUCTION PHASE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. horror_reddit.py                                            │
│     └─> Fetches from 8 horror subreddits                        │
│         └─> Filters 200-800 word stories                        │
│             └─> Saves to _inbox/horror-YYYY-MM-DD.json          │
│                                                                  │
│  2. curate.py                                                   │
│     └─> Reads _inbox/*.json                                     │
│         └─> Ollama LLaMA 3.1 rewrites as narration              │
│             └─> Intelligent part-splitting (~650 words)         │
│                 └─> Saves to _scripts/{title}/                  │
│                                                                  │
│  3. utils/narrate.py                                            │
│     └─> Processes _scripts/*/*.md                               │
│         └─> Kokoro TTS generates voiceovers                     │
│             └─> Audio cleanup (trim silence + normalize)        │
│                 └─> Saves to _scripts/{title}/audio/            │
│                                                                  │
│  4. utils/preproduction.py                                      │
│     └─> Extracts 15 cinematic locations via Ollama              │
│         └─> Creates video folder structure                      │
│             └─> Copies scripts + audio                          │
│                 └─> Output: X:\_ai\comfy\...\{video_id}/        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PRODUCTION PHASE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  5. generate.py                                                 │
│     └─> Submits prompts to ComfyUI API                          │
│         └─> Generates 4 shots per sequence                      │
│             └─> Resume capability with session tracking         │
│                 └─> Saves to {video_id}/shot_{n}/output/        │
│                                                                  │
│  6. morph.py                                                    │
│     └─> IPIV image-to-video interpolation                       │
│         └─> Creates 4 output types:                             │
│             - previews (fast preview)                           │
│             - upscaled (2x resolution)                          │
│             - upscaled_model (best quality)                     │
│             - interpolated (final morph)                        │
│         └─> Position-based frame pairing                        │
│                                                                  │
│  7. cut.py                                                      │
│     └─> Concatenates interpolated clips                         │
│         └─> Mixes narration + background music                  │
│             └─> Whisper generates word-level captions           │
│                 └─> Burns ASS subtitles (2D vibration)          │
│                     └─> Final output: {video_id}_final.mp4      │
│                                                                  │
│  8. metadata.py                                                 │
│     └─> Ollama generates YouTube metadata                       │
│         └─> Title, description, tags optimized for SEO          │
│             └─> Saves as metadata.json + metadata.md            │
│                                                                  │
│  9. upload.py                                                   │
│     └─> YouTube Data API v3 OAuth                               │
│         └─> Scheduled publishing (7:30 PM PT)                   │
│             └─> Auto-increments publish dates                   │
│                 └─> Moves to /uploads/ on success               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pre-Production Phase

### 1. Reddit Story Fetching

**File:** `X:\_code\_cc\horror_reddit.py`

**Purpose:** Fetches horror stories from Reddit using PRAW API.

**Target Subreddits:**
```python
[
    'nosleep', 'shortscarystories', 'creepypasta',
    'letsnotmeet', 'Thetruthishere', 'Glitch_in_the_Matrix',
    'Paranormal', 'TwoSentenceHorror'
]
```

**Filtering Criteria:**
- Word count: 200-800 words
- Must have body text (not just title)
- Excludes removed/deleted posts
- Time range: Last 24 hours (default)

**Output Format:**
```json
{
  "title": "Story Title",
  "author": "u/username",
  "subreddit": "nosleep",
  "url": "https://reddit.com/...",
  "score": 1234,
  "created_utc": 1234567890,
  "text": "Full story text...",
  "word_count": 456
}
```

**Saved to:** `_inbox/horror-YYYY-MM-DD.json`

**Environment Variables:**
```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=your_user_agent
```

---

### 2. AI Story Curation

**File:** `X:\_code\_cc\curate.py`

**Purpose:** Uses Ollama/LLaMA 3.1 to rewrite Reddit stories as professional narration scripts.

**AI Model:** `llama3.1:8b` or `llama3.1:70b`

**Core Features:**

1. **Story Rewriting**
   - Converts first-person Reddit posts to cinematic narration
   - Removes Reddit-specific references
   - Enhances storytelling flow
   - Maintains horror atmosphere

2. **Intelligent Part-Splitting**
   - Target: ~650 words per part
   - Smart sentence boundary detection
   - Creates multi-part series from long stories
   - Ensures cliffhangers between parts

3. **Deduplication**
   - Content hashing to prevent duplicates
   - Cross-checks against `_scripts/` directory
   - Skips already processed stories

**AI Prompt Structure:**
```
SYSTEM: You are a master horror storyteller...

USER: Rewrite this Reddit horror story as a cinematic narration script.
Keep it engaging and suspenseful. Target length: ~650 words.

Story: [STORY_TEXT]
```

**Output:**
- Creates `_scripts/{sanitized_title}/part_1.md`, `part_2.md`, etc.
- Metadata saved in `info.json`

**Usage:**
```bash
python curate.py                    # Process all _inbox files
python curate.py --file horror-2024-01-02.json
python curate.py --model llama3.1:70b
```

---

### 3. Text-to-Speech Narration

**File:** `X:\_code\_cc\utils\narrate.py`

**Purpose:** Generates professional voiceovers using Kokoro TTS.

**TTS Engine:** Kokoro (af_heart voice)

**Processing Modes:**
- **Single:** Generate for 1 script only
- **Batch:** Process 3, 8, 12, or all scripts
- **Resume:** Regenerate last N narrations (useful for tweaks)

**Audio Processing Pipeline:**
```
1. Text → Kokoro TTS (af_heart voice)
2. Silence trimming (removes leading/trailing silence)
3. Audio normalization (consistent volume)
4. Save as MP3 in _scripts/{title}/audio/
```

**Silence Detection:**
- Threshold: -40 dB
- Min silence duration: 0.5 seconds
- Detects start/end silence for trimming

**Output Structure:**
```
_scripts/
  └── story-title/
      ├── part_1.md
      ├── part_2.md
      └── audio/
          ├── part_1.mp3
          └── part_2.mp3
```

**Usage:**
```bash
python -m utils.narrate              # Interactive mode
python -m utils.narrate --batch 8    # Process 8 scripts
python -m utils.narrate --resume 3   # Redo last 3
```

---

### 4. Script Sanitization

**File:** `X:\_code\_cc\utils\clean_scripts.py`

**Purpose:** Removes AI prefaces, markdown artifacts, and flags sensitive content.

**Cleaning Operations:**

1. **Remove AI Commentary**
   - "Here is the rewritten story..."
   - "This chilling tale..."
   - Markdown headers (##, ###)
   - Bullet points and formatting

2. **Content Safety Checks**
   - Flags violence keywords (graphic, brutal, etc.)
   - Detects self-harm references
   - Identifies explicit content
   - Creates review log for flagged scripts

3. **Deep Refinement Mode**
   - Optional Ollama pass for additional polish
   - Ensures natural narration flow
   - Fixes awkward phrasing

**Output:** Updated `.md` files + `flagged_scripts.log`

---

### 5. Video Folder Preparation

**File:** `X:\_code\_cc\utils\preproduction.py`

**Purpose:** Prepares video project folders with AI-generated location prompts.

**Core Workflow:**

1. **Location Extraction**
   - Uses Ollama to analyze script
   - Generates 15 cinematic location descriptions
   - Optimized for Stable Diffusion image generation
   - Examples: "abandoned asylum hallway", "foggy graveyard at dusk"

2. **Folder Structure Creation**
   ```
   X:\_ai\comfy\...\batch_short\
     └── video-{timestamp}/
         ├── script.md
         ├── audio.mp3
         ├── locations.json
         ├── shot_1/
         ├── shot_2/
         ├── shot_3/
         └── shot_4/
   ```

3. **Data Migration**
   - Copies script from `_scripts/`
   - Copies audio from `_scripts/{title}/audio/`
   - Creates `locations.json` with 15 prompts

**Location Prompt Format:**
```json
{
  "locations": [
    "Cinematic establishing shot of abandoned Victorian mansion at twilight, overgrown ivy, broken windows, ominous clouds",
    "Dark forest path, twisted trees, fog rolling through, single flickering lantern",
    ...
  ]
}
```

**Usage:**
```bash
python -m utils.preproduction
# Interactive: Select script → Generate locations → Create folders
```

---

## Production Phase

### 6. ComfyUI Image Generation

**File:** `X:\_ai\comfy\ComfyUI\output\horror\batch_short\generate.py`

**Purpose:** Generates cinematic images using ComfyUI API and Stable Diffusion.

**ComfyUI Configuration:**
- **API Endpoint:** `http://127.0.0.1:8188`
- **Model:** Stable Diffusion (configurable in workflow)
- **Workflow File:** `generate-workflow.json`
- **Shots per Sequence:** 4 images (for morph transitions)

**Key Features:**

1. **Prompt Selection**
   - Randomly selects 4 locations from `locations.json` (15 available)
   - Ensures variety across shots
   - Prompts optimized for cinematic horror aesthetic

2. **Sequential Generation**
   - Generates 4 shots per video (shot_1 through shot_4)
   - Each shot gets 1 image
   - Waits for ComfyUI to complete before next prompt

3. **Resume Capability**
   - Tracks progress in `generate_session.json`
   - Can resume if interrupted
   - Skips already-generated shots

4. **Progress Tracking**
   - Real-time ETA calculation
   - Completion percentage
   - Error logging

**ComfyUI API Communication:**
```python
# Submit prompt
prompt_id = submit_prompt(workflow, prompt_text)

# Poll for completion
while True:
    history = get_history(prompt_id)
    if prompt_id in history:
        break
    time.sleep(1)

# Download generated image
image_data = get_image(filename, subfolder, folder_type)
```

**Output:** `{video_id}/shot_{n}/output/image_00001.png`

**Usage:**
```bash
python generate.py
# Interactive: Select video project → Generate 4 shots
```

---

### 7. Image-to-Video Morphing

**File:** `X:\_ai\comfy\ComfyUI\output\horror\batch_short\morph.py`

**Purpose:** Transforms static images into smooth morph videos using IPIV.

**IPIV Workflow:** Image-to-Video Interpolation via ComfyUI

**Four Output Types:**

1. **Previews** (Fast preview, lower quality)
   - Quick generation for review
   - Lower resolution

2. **Upscaled** (2x resolution)
   - Standard upscaling
   - Better quality

3. **Upscaled_model** (AI-enhanced upscaling)
   - Best visual quality
   - Uses AI upscaling model

4. **Interpolated** (Final morph video)
   - Smooth frame interpolation
   - Creates seamless transitions
   - Used in final cut

**Morph Logic:**
```python
# Position-based frame pairing
Frame 1 (start) + Frame 2 (end) = Morph Video 1
Frame 2 (start) + Frame 3 (end) = Morph Video 2
Frame 3 (start) + Frame 4 (end) = Morph Video 3
```

**Output Structure:**
```
shot_1/
  ├── output/
  │   └── image_00001.png
  ├── previews/
  │   └── morph_00001.mp4
  ├── upscaled/
  ├── upscaled_model/
  └── interpolated/
      └── morph_00001.mp4  ← Used in final cut
```

**Audio Feedback:**
- Plays Mario coin sound on success
- Plays Zelda secret sound on completion
- Makes batch processing more enjoyable

**Usage:**
```bash
python morph.py
# Interactive: Select video project → Morph all shots
```

---

### 8. Final Video Assembly

**File:** `X:\_ai\comfy\ComfyUI\output\horror\batch_short\cut.py`

**Purpose:** Assembles final video with audio mixing, subtitles, and effects.

**Assembly Pipeline:**

#### Step 1: Video Concatenation
```bash
ffmpeg -f concat -i filelist.txt -c copy temp_video.mp4
```
- Concatenates all interpolated morph videos
- Creates seamless visual sequence

#### Step 2: Audio Mixing
```bash
ffmpeg -i temp_video.mp4 -i narration.mp3 -i music.mp3 \
  -filter_complex "[1:a]volume=1.0[voice];[2:a]volume=0.3[music];[voice][music]amix=inputs=2" \
  -c:v copy video_with_audio.mp4
```
- Mixes narration (100% volume) + background music (30% volume)
- Syncs audio to video duration

#### Step 3: Subtitle Generation (Whisper)
```python
# Word-level timestamp extraction
result = whisper_model.transcribe(
    audio_path,
    word_timestamps=True
)

# Creates word-by-word timing data
for segment in result['segments']:
    for word in segment['words']:
        start = word['start']
        end = word['end']
        text = word['word']
```

#### Step 4: ASS Subtitle Creation
**Advanced SubStation Alpha (ASS) format with 2D vibration effect:**

```ass
[Script Info]
Title: Horror Short
ScriptType: v4.00+

[V4+ Styles]
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,5,10,10,10,1

[Events]
Dialogue: 0,0:00:00.50,0:00:01.20,Default,,0,0,0,,{\pos(960,980)\t(0,100,\3c&H00FF00&)\fad(200,200)}Hello
```

**Subtitle Effects:**
- **2D Vibration:** Simulates screen shake for horror effect
- **Fade in/out:** Smooth text transitions
- **Color shifts:** Dynamic text coloring
- **Positioning:** Bottom-center, reads like captions

#### Step 5: Burn Subtitles
```bash
ffmpeg -i video_with_audio.mp4 -vf "ass=subtitles.ass" {video_id}_final.mp4
```

**Final Output:** `{video_id}_final.mp4` ready for upload

**Usage:**
```bash
python cut.py
# Interactive: Select video project → Assemble final video
```

---

### 9. YouTube Metadata Generation

**File:** `X:\_ai\comfy\ComfyUI\output\horror\batch_short\metadata.py`

**Purpose:** Generates SEO-optimized YouTube metadata using Ollama.

**AI Model:** LLaMA 3.1

**Generated Fields:**

1. **Title** (Max 100 characters)
   - Hook-driven, clickable
   - Keywords in first 60 chars
   - Examples:
     - "I Found My Childhood Diary... The Last Entry Was Written Tomorrow"
     - "The House Always Watched Me Sleep | True Horror Story"

2. **Description** (Max 5000 characters)
   - Story summary (no spoilers)
   - Call-to-action (subscribe, like)
   - Related hashtags
   - Timestamp chapters (if applicable)

3. **Tags** (Max 500 characters)
   - Extracted from script keywords
   - Genre tags (horror, scary, creepy)
   - Format tags (short, story, narration)
   - Max 15 tags

**AI Prompt:**
```python
f"""
Based on this horror story script, generate YouTube metadata:

SCRIPT:
{script_content}

Generate:
1. TITLE (max 100 chars, compelling and clickable)
2. DESCRIPTION (engaging summary, no spoilers, include CTA)
3. TAGS (15 relevant tags, comma-separated)

Format response as:
TITLE: [title]
DESCRIPTION: [description]
TAGS: [tag1, tag2, tag3...]
"""
```

**Output Files:**
- `metadata.json` (structured data for upload.py)
- `metadata.md` (human-readable reference)

**Usage:**
```bash
python metadata.py
# Interactive: Select video project → Generate metadata
```

---

### 10. YouTube Upload & Scheduling

**File:** `X:\_ai\comfy\ComfyUI\output\horror\batch_short\upload.py`

**Purpose:** Uploads videos to YouTube with scheduled publishing.

**YouTube API:** Data API v3 with OAuth 2.0

**Authentication Flow:**
1. First run: Opens browser for OAuth consent
2. Saves `token.json` for future runs
3. Auto-refreshes expired tokens

**Upload Configuration:**

**Privacy Status:** `private` (scheduled)

**Publishing Schedule:**
- **Time:** 7:30 PM Pacific Time
- **Auto-increment:** Each video publishes 1 day after previous
- **Timezone Handling:** Converts PT to UTC for API

**Metadata Insertion:**
```python
body = {
    'snippet': {
        'title': metadata['title'],
        'description': metadata['description'],
        'tags': metadata['tags'],
        'categoryId': '24'  # Entertainment
    },
    'status': {
        'privacyStatus': 'private',
        'publishAt': publish_datetime_utc,
        'selfDeclaredMadeForKids': False
    }
}
```

**Upload Process:**
1. Read `metadata.json`
2. Calculate next publish date
3. Create resumable upload request
4. Upload video file (chunked for large files)
5. Set thumbnail (if available)
6. Move project to `/uploads/` folder

**Post-Upload Actions:**
- Logs video ID and publish time
- Archives project folder
- Cleans up temp files

**Usage:**
```bash
python upload.py
# Interactive: Select video project → Upload to YouTube
```

**Environment Variables:**
```env
YOUTUBE_CLIENT_SECRETS_FILE=client_secrets.json
YOUTUBE_API_SERVICE_NAME=youtube
YOUTUBE_API_VERSION=v3
```

---

## Configuration & Environment

### Pre-Production Environment Variables

**File:** `X:\_code\_cc\.env`

```env
# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_secret
REDDIT_USER_AGENT=HorrorContentBot/1.0

# Ollama Configuration (runs locally)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Kokoro TTS (local installation)
KOKORO_VOICE=af_heart
```

### Production Environment Variables

**File:** `X:\_ai\comfy\ComfyUI\output\horror\batch_short\.env`

```env
# ComfyUI API
COMFYUI_HOST=http://127.0.0.1:8188
COMFYUI_WORKFLOW=generate-workflow.json

# YouTube API
YOUTUBE_CLIENT_SECRETS=client_secrets.json
YOUTUBE_UPLOAD_TIME=19:30  # 7:30 PM PT

# Cloudinary (for future integration)
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### Required Dependencies

**Pre-Production:**
```bash
pip install praw ollama pydub numpy soundfile
```

**Production:**
```bash
pip install requests pillow opencv-python whisper
pip install google-api-python-client google-auth google-auth-oauthlib
```

**System Requirements:**
- **Ollama:** Installed locally for LLaMA 3.1
- **Kokoro TTS:** Installed locally
- **ComfyUI:** Running on `http://127.0.0.1:8188`
- **FFmpeg:** System-wide installation
- **Whisper:** OpenAI model (base, small, or medium)

---

## File Structure

### Pre-Production Directory

```
X:\_code\_cc\
├── horror_reddit.py           # Reddit story fetcher
├── curate.py                  # AI curation with LLaMA
├── build_content.py           # Markdown formatter (optional)
├── .env                       # Environment variables
├── requirements.txt           # Python dependencies
├── _inbox/                    # Raw Reddit fetches
│   ├── horror-2024-01-01.json
│   └── horror-2024-01-02.json
├── _scripts/                  # Curated scripts
│   ├── the-thing-in-my-closet/
│   │   ├── part_1.md
│   │   ├── part_2.md
│   │   ├── info.json
│   │   └── audio/
│   │       ├── part_1.mp3
│   │       └── part_2.mp3
│   └── midnight-visitor/
│       └── ...
└── utils/
    ├── narrate.py             # TTS generation
    ├── clean_scripts.py       # Script sanitization
    └── preproduction.py       # Video folder setup
```

### Production Directory

```
X:\_ai\comfy\ComfyUI\output\horror\batch_short\
├── generate.py                # ComfyUI image generation
├── morph.py                   # IPIV video morphing
├── cut.py                     # Final video assembly
├── metadata.py                # YouTube SEO generation
├── upload.py                  # YouTube API upload
├── generate-workflow.json     # ComfyUI workflow config
├── .env                       # Environment variables
├── requirements.txt           # Python dependencies
├── video-1704153600/          # Example project
│   ├── script.md
│   ├── audio.mp3
│   ├── locations.json
│   ├── shot_1/
│   │   ├── output/
│   │   │   └── image_00001.png
│   │   └── interpolated/
│   │       └── morph_00001.mp4
│   ├── shot_2/
│   ├── shot_3/
│   ├── shot_4/
│   ├── metadata.json
│   ├── metadata.md
│   └── video-1704153600_final.mp4
└── uploads/                   # Archived uploaded projects
    └── video-1704153600/
```

---

## Performance & Optimization

### Processing Times (Approximate)

| Stage | Duration | Bottleneck |
|-------|----------|------------|
| Reddit Fetch | 1-2 min | API rate limits |
| AI Curation (per story) | 30-60 sec | Ollama inference |
| TTS Narration (per script) | 10-20 sec | Kokoro processing |
| Location Extraction | 20-30 sec | Ollama inference |
| Image Generation (4 shots) | 2-5 min | ComfyUI + GPU |
| Video Morphing (4 shots) | 5-10 min | IPIV processing |
| Final Assembly | 1-2 min | FFmpeg encoding |
| Metadata Generation | 15-30 sec | Ollama inference |
| YouTube Upload | 2-5 min | Upload bandwidth |
| **TOTAL** | **15-30 min** | **per video** |

### Optimization Strategies

1. **Parallel Processing**
   - Current: Sequential (one video at a time)
   - Future: Multi-video batching with job queue

2. **GPU Utilization**
   - ComfyUI: Uses GPU for image generation
   - Whisper: Can use GPU for faster transcription
   - Future: Cloud GPU (RunPod, Vast.ai)

3. **Caching**
   - Ollama responses cached locally
   - ComfyUI model weights stay loaded
   - Audio normalization profiles saved

4. **Resume Capability**
   - All production scripts support resume
   - Session tracking prevents wasted work
   - Error recovery without full restart

---

## Integration Roadmap

### Phase 1: Cloud Migration (In Progress)

**Goal:** Move ComfyUI to cloud VPS for scalability

**Technology:**
- **VPS Provider:** RunPod, Vast.ai, or AWS EC2 (GPU instances)
- **API Access:** Expose ComfyUI via ngrok or Cloudflare tunnel
- **Benefits:**
  - No local GPU required
  - 24/7 processing
  - Parallel video generation

**Required Changes:**
- Update `COMFYUI_HOST` in `.env` to cloud URL
- Add authentication to ComfyUI API
- Implement job queue (Celery/Redis)

---

### Phase 2: HeyGen Integration

**Goal:** Replace Kokoro TTS with HeyGen's AI avatars

**Benefits:**
- Photorealistic AI presenters
- Lip-sync video generation
- Multiple avatar options

**Implementation:**
```python
# Replace narrate.py with HeyGen API
heygen_response = heygen.generate_video(
    script=script_text,
    avatar='josh_lite',  # Or custom avatar
    voice='en-US-Neural-Female'
)
```

**Output:** Direct video file instead of audio MP3

**Impact on Pipeline:**
- Skip TTS generation step
- Use HeyGen video as primary footage
- ComfyUI generates B-roll instead of primary visuals

---

### Phase 3: CMS Video Creation

**Goal:** Integrate video pipeline into real estate CMS

**Use Case:** Auto-generate property showcase videos

**Data Source:** MLS data (listings, photos, descriptions)

**Workflow:**
```
MLS Listing Data → AI Script Generation →
Property Photos → Video Assembly →
Voiceover (11Labs or HeyGen) → YouTube Upload
```

**CMS Integration Points:**

1. **Script Generation** (similar to voicemail scripts)
   ```typescript
   // src/lib/services/video-script-generation.service.ts
   export class VideoScriptService {
     static async generatePropertyScript(listingId: ObjectId) {
       const listing = await Listing.findById(listingId);
       const script = await GroqAPI.generateScript({
         address: listing.address,
         features: listing.features,
         price: listing.price,
         // ... MLS data
       });
       return cleanScriptOutput(script);
     }
   }
   ```

2. **Image Processing**
   - Use MLS listing photos instead of Stable Diffusion
   - Apply cinematic filters via ComfyUI
   - Create slideshow or morph transitions

3. **Voiceover Generation**
   - Reuse 11Labs integration from voicemail system
   - Same voice ID for brand consistency
   - Store in Cloudinary like voicemail audio

4. **Video Assembly**
   - Adapt `cut.py` logic to TypeScript/Node.js
   - Use Fluent-FFmpeg library
   - Generate captions with listing details

**CMS UI Additions:**
```
/admin/cms/videos/new
  ├── Select Listing
  ├── Generate Script (Groq)
  ├── Review/Edit Script
  ├── Generate Voiceover (11Labs)
  ├── Select Music Track
  ├── Configure Transitions
  └── Generate Video → Upload to YouTube
```

**Database Models:**
```typescript
// src/models/PropertyVideo.ts
{
  listingId: ObjectId,
  userId: ObjectId,
  script: string,
  audioUrl: string,
  videoUrl: string,
  youtubeId: string,
  metadata: {
    title: string,
    description: string,
    tags: string[]
  },
  status: 'draft' | 'generating' | 'completed' | 'published'
}
```

---

### Phase 4: Voicemail Script Fine-Tuning

**Goal:** Use content creation learnings to enhance voicemail scripts

**Insights from Content Pipeline:**

1. **AI Output Cleaning** (Already Implemented ✅)
   - Learned from horror script cleaning
   - Applied to voicemail scripts in `cleanScriptOutput()`
   - Removes markdown and commentary

2. **Narration Quality**
   - Kokoro TTS produces natural-sounding voices
   - Consider switching from 11Labs to Kokoro for cost savings
   - Or fine-tune 11Labs settings based on Kokoro results

3. **Script Structure**
   - Content scripts use hook → story → CTA structure
   - Apply to voicemail: hook → value prop → CTA
   - Example:
     ```
     HOOK: "Hi [Name], this is Joseph with eXp Realty..."
     VALUE: "I noticed your home has gained $50K in equity..."
     CTA: "I'd love to discuss your options. Call me at..."
     ```

4. **Batch Processing**
   - Content pipeline processes batches efficiently
   - Apply resume capability to voicemail generation
   - Add progress tracking like `generate.py`

5. **Template System**
   - Content uses location templates (15 cinematic prompts)
   - Voicemail uses message templates (6 pre-made options)
   - Both benefit from variety and randomization

**Implementation:**
```typescript
// src/lib/services/script-generation.service.ts

// Add resume capability
private static sessionFile = 'script_generation_session.json';

static async generateScriptsWithResume(
  campaignId: ObjectId,
  userId: ObjectId
) {
  const session = this.loadSession();
  const contacts = await this.getContacts(campaignId);

  for (let i = session.lastIndex; i < contacts.length; i++) {
    await this.generateScript(contacts[i]);
    this.saveSession({ lastIndex: i });
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. ComfyUI Connection Failed
**Symptoms:** `generate.py` can't connect to `http://127.0.0.1:8188`

**Solutions:**
- Verify ComfyUI is running: Open browser to `http://127.0.0.1:8188`
- Check firewall settings
- Ensure workflow file exists: `generate-workflow.json`

---

#### 2. Ollama Model Not Found
**Symptoms:** `curate.py` fails with "model not found" error

**Solutions:**
```bash
# List installed models
ollama list

# Install LLaMA 3.1
ollama pull llama3.1:8b
ollama pull llama3.1:70b
```

---

#### 3. Kokoro TTS Errors
**Symptoms:** `narrate.py` fails during audio generation

**Solutions:**
- Verify Kokoro installation
- Check voice name: `af_heart` is correct
- Ensure audio output directory exists

---

#### 4. YouTube Upload Fails
**Symptoms:** `upload.py` fails with authentication error

**Solutions:**
1. Delete `token.json` to force re-authentication
2. Verify `client_secrets.json` is valid
3. Check YouTube API quota (10,000 units/day)
4. Ensure OAuth consent screen is configured

---

#### 5. Whisper Transcription Slow
**Symptoms:** `cut.py` takes 5+ minutes on subtitle generation

**Solutions:**
```python
# Use smaller Whisper model
model = whisper.load_model("base")  # Instead of "medium" or "large"

# Or use GPU
model = whisper.load_model("base", device="cuda")
```

---

#### 6. FFmpeg Encoding Errors
**Symptoms:** `cut.py` fails during video assembly

**Solutions:**
- Verify FFmpeg installation: `ffmpeg -version`
- Check input files exist (all interpolated videos)
- Ensure enough disk space
- Try re-encoding with different codec:
  ```bash
  ffmpeg -i input.mp4 -c:v libx264 -preset fast output.mp4
  ```

---

#### 7. Memory Issues (Ollama/ComfyUI)
**Symptoms:** System freezes during generation

**Solutions:**
- **Ollama:** Use smaller model (`llama3.1:8b` instead of `70b`)
- **ComfyUI:** Lower batch size in workflow
- **Whisper:** Use `base` model instead of `large`
- Close unnecessary applications

---

## Future Enhancements

### Short-Term (Next 3 Months)

- [ ] **Job Queue System** (Celery + Redis)
  - Parallel video generation
  - Better error recovery
  - Progress tracking dashboard

- [ ] **Web Dashboard**
  - Monitor pipeline status
  - View generated videos
  - Manage upload schedule
  - Analytics (views, engagement)

- [ ] **Cloud VPS Migration**
  - Deploy ComfyUI to RunPod
  - API authentication
  - Remote workflow management

- [ ] **Automated Testing**
  - Unit tests for each script
  - Integration tests for full pipeline
  - CI/CD with GitHub Actions

### Medium-Term (3-6 Months)

- [ ] **HeyGen Integration**
  - Replace Kokoro with AI avatars
  - Lip-sync video generation
  - Custom avatar training

- [ ] **Multi-Platform Upload**
  - TikTok API integration
  - Instagram Reels API
  - Facebook auto-posting

- [ ] **Advanced Analytics**
  - Track performance by topic
  - A/B test thumbnails
  - Optimize publish times

- [ ] **Content Variation**
  - Multiple narration voices
  - Different music tracks
  - Visual style presets

### Long-Term (6+ Months)

- [ ] **CMS Video Integration**
  - Property showcase videos
  - MLS data automation
  - Real estate market reports

- [ ] **Fine-Tuned Models**
  - Custom LLaMA fine-tune for narration
  - Stable Diffusion LoRA for consistent style
  - Voice cloning for personalized narration

- [ ] **Enterprise Features**
  - Multi-user support
  - Team collaboration
  - White-label platform

- [ ] **AI Agents**
  - Autonomous content discovery
  - Self-optimizing metadata
  - Adaptive publishing schedule

---

## Relationship to Voicemail System

### Shared Patterns

Both systems follow similar architectural patterns:

| Aspect | Content Pipeline | Voicemail System |
|--------|------------------|------------------|
| **AI Provider** | Ollama (LLaMA 3.1) | Groq (GPT-OSS 120B) |
| **Output Cleaning** | `clean_scripts.py` | `cleanScriptOutput()` |
| **TTS Engine** | Kokoro (local) | 11Labs (cloud) |
| **Storage** | Local filesystem | Cloudinary |
| **Batch Processing** | Sequential with resume | Sequential (needs resume) |
| **Template System** | 15 location prompts | 6 message templates |
| **API Integration** | YouTube Data API | Dropcowboy API |

### Technology Synergies

1. **AI Script Generation**
   - Both use LLM for content creation
   - Both require output cleaning
   - Both use template-based prompts

2. **Audio Generation**
   - Content: Kokoro TTS (free, local)
   - Voicemail: 11Labs (paid, cloud)
   - **Opportunity:** Test Kokoro for voicemails to reduce costs

3. **Batch Processing**
   - Content: Robust resume capability
   - Voicemail: Basic sequential processing
   - **Opportunity:** Add resume to voicemail generation

4. **Storage Management**
   - Content: Local filesystem
   - Voicemail: Cloudinary with cleanup
   - **Opportunity:** Migrate content to Cloudinary for CDN benefits

### Code Reusability

**From Content → Voicemail:**

1. **Session Tracking**
   ```python
   # From generate.py
   session = {
       'video_id': video_id,
       'current_shot': shot_num,
       'completed_shots': []
   }
   ```
   **Apply to voicemail:** Track script generation progress

2. **Ollama Integration**
   ```python
   # From curate.py
   response = ollama.chat(
       model='llama3.1:8b',
       messages=[{'role': 'user', 'content': prompt}]
   )
   ```
   **Apply to voicemail:** Alternative to Groq for cost savings

3. **Audio Processing**
   ```python
   # From narrate.py - silence trimming
   def detect_silence(audio_data, threshold=-40):
       # Trim leading/trailing silence
   ```
   **Apply to voicemail:** Clean 11Labs output

**From Voicemail → Content:**

1. **Cloudinary Integration**
   ```typescript
   // From audio-generation.service.ts
   const result = await cloudinary.uploader.upload_stream({
       resource_type: 'video',
       folder: 'voicemail-campaigns'
   });
   ```
   **Apply to content:** Store videos in cloud instead of local

2. **Next.js API Patterns**
   ```typescript
   // From generate-scripts/route.ts
   export async function POST(request: NextRequest) {
       const session = await getServerSession(authOptions);
       // Background job initiation
   }
   ```
   **Apply to content:** Build web UI for content pipeline

3. **Database Models**
   ```typescript
   // From VoicemailScript.ts
   {
       status: 'pending' | 'generating' | 'completed' | 'failed',
       generatedBy: 'ai' | 'manual',
       reviewStatus: 'pending' | 'approved' | 'rejected'
   }
   ```
   **Apply to content:** Track video generation in MongoDB

---

## Conclusion

This content creation pipeline demonstrates a complete automation workflow from content discovery to publication. The architecture is modular, resumable, and ready for cloud migration.

**Key Takeaways:**

1. **Two-Phase Design:** Pre-production (local) + Production (ComfyUI) ensures clean separation of concerns
2. **AI-Powered:** LLaMA 3.1 for curation, Stable Diffusion for visuals, Whisper for captions
3. **Resumable:** Every production script supports resume for reliability
4. **Scalable:** Ready for cloud VPS and parallel processing
5. **Reusable:** Patterns applicable to voicemail system and CMS video creation

**Integration Potential:**

- **HeyGen:** Next-generation AI avatars
- **Cloud VPS:** 24/7 processing at scale
- **CMS Videos:** Property showcases from MLS data
- **Voicemail Fine-Tuning:** Apply content learnings

This pipeline serves as the foundation for future video automation across multiple products.

---

## Related Documentation

- [Voicemail Script Generation System](./VOICEMAIL_SCRIPT_GENERATION.md)
- [Campaign Strategy Architecture](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)
- [Dropcowboy Voicemail System](../integrations/dropcowboy/VOICEMAIL_SYSTEM.md)
- [CRM Overview](../crm/CRM_OVERVIEW.md)

---

**Questions or Issues?**
Contact: Joseph Sardella | GitHub: @joseph-sardella
