# Voicemail Script Generation System

**Last Updated:** January 2, 2026
**Status:** ✅ Production Ready
**AI Provider:** Groq (GPT-OSS 120B)

## Overview

The voicemail script generation system uses AI to automatically create personalized voicemail scripts for campaign contacts, with integrated 11Labs text-to-speech audio generation.

## Architecture

### AI Model
- **Provider:** Groq API
- **Model:** `openai/gpt-oss-120b` (GPT-OSS 120B)
- **Note:** Claude support exists in codebase but is NOT used
- **Temperature:** 0.7
- **Max Tokens:** 300

### Key Components

1. **Frontend:** `src/app/components/campaigns/CampaignDetailPanel.tsx`
   - Template-based script generation modal
   - 6 pre-made templates + custom prompt option
   - Located in Overview tab → "Generate Scripts" button

2. **Backend API:** `src/app/api/campaigns/[id]/generate-scripts/route.ts`
   - Handles bulk script generation requests
   - Defaults to Groq model if no model specified

3. **Service Layer:** `src/lib/services/script-generation.service.ts`
   - Core business logic for script generation
   - AI prompt construction and output cleaning
   - Batch processing for multiple contacts

4. **Script Review:** `src/app/components/campaigns/VoicemailScriptViewer.tsx`
   - Individual script viewing and editing
   - Audio preview and generation controls
   - Located in Strategies tab

## Workflow

### 1. Script Generation
```
User selects template → Modal opens → AI generates scripts → Scripts saved to DB
```

**Available Templates:**
- Expired Listings
- Buyer in Neighborhood
- Calling to Reconnect
- Market Update
- High Equity Opportunity
- Custom Prompt

### 2. Script Review
```
Strategies tab → Click contact row → Review script → Generate audio
```

### 3. Audio Generation
```
11Labs API → Cloudinary storage → VoicemailScript.audio updated
```

## AI Prompt System

### Prompt Structure
The AI receives:
1. Agent information (name, brokerage, phone)
2. Contact information (name, address, city)
3. Campaign type and context
4. Optional custom prompt/template
5. Strict output formatting rules

### Output Cleaning
To ensure raw dialogue only, the system:

**System Prompt:**
```
Output ONLY the raw spoken dialogue with no introductory text,
markdown formatting, or commentary. Just the script text itself.
```

**Post-Processing** (`cleanScriptOutput()`):
- Removes intro phrases ("Here is a script...", "Below are...")
- Strips markdown headers (##, ###)
- Removes bullet points (-, *, >)
- Eliminates section markers (Note:, Tips:)
- Extracts first dialogue paragraph only
- Cleans extra whitespace

### Example Output
**Input Template:** "Happy New Year voicemail"

**AI Output (cleaned):**
```
Hi Cache, this is Joseph Sardella with eXp Realty. I wanted to wish you
and your family a Happy New Year! As we start 2026, I've been thinking
about homeowners in your area and wanted to reach out. If you've been
considering selling or have any real estate questions, I'd love to chat.
You can reach me at (760) 899-6988. Have a wonderful year!
```

## Database Schema

### VoicemailScript Model
```typescript
{
  contactId: ObjectId,
  campaignId: ObjectId,
  userId: ObjectId,
  script: string,              // The generated dialogue
  scriptVersion: number,
  generatedBy: 'ai' | 'manual',
  aiModel: string,             // 'groq-llama3'
  reviewStatus: 'pending' | 'approved' | 'rejected',
  audio: {
    status: 'pending' | 'generating' | 'completed' | 'failed',
    url: string,               // Cloudinary URL
    voiceId: string,           // 11Labs voice ID
    duration: number,          // seconds
    generatedAt: Date,
    error: string
  }
}
```

## API Endpoints

### Generate Scripts
```
POST /api/campaigns/[id]/generate-scripts
Body: { customPrompt?: string, model?: string }
Response: { success: boolean, contactCount: number, jobId: string }
```

### List Scripts
```
GET /api/campaigns/[id]/scripts
Response: { scripts: ScriptWithContact[], count: number }
```

### Generate Audio (Single)
```
POST /api/campaigns/[id]/scripts/[scriptId]/generate-audio
Body: { voiceId?: string }
Response: { audioUrl: string, duration: number }
```

### Preview Audio
```
POST /api/campaigns/[id]/scripts/[scriptId]/preview-audio
Response: Audio stream (blob)
```

### Delete Audio
```
DELETE /api/campaigns/[id]/scripts/[scriptId]/audio
Response: { success: boolean }
```

## Integration Points

### 11Labs Text-to-Speech
- **Service:** `src/lib/services/audio-generation.service.ts`
- **Model:** `eleven_monolingual_v1`
- **Settings:** stability: 0.5, similarity_boost: 0.75
- **Default Voice:** Joseph's voice (env: `ELEVENLABS_VOICE_ID`)

### Cloudinary Storage
- **Resource Type:** 'video' (audio files stored as video type)
- **Folder:** `voicemail-campaigns`
- **Tagging:** campaignId, contactId, userId

## Performance

### Batch Generation
- Processes contacts sequentially (not parallel to avoid rate limits)
- Updates campaign stats every 10 scripts
- Background processing (should use job queue in production)

### Campaign Status Flow
```
draft → generating_scripts → review → generating_audio → review → active
```

## Environment Variables

```env
# AI Generation
GROQ_API_KEY=your_groq_key

# Audio Generation
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id

# Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Usage Example

### Generate Scripts with Template
1. Open campaign detail panel
2. Click "Overview" tab
3. Click "Generate Scripts" button
4. Select "Expired Listings" template
5. Review/edit the prompt preview
6. Click "Generate Scripts for X Contacts"
7. Wait for batch processing to complete

### Review & Generate Audio
1. Click "Strategies" tab
2. Click on any contact row to expand
3. Review the generated script
4. Click "Preview Audio" to test (optional)
5. Click "Generate Audio" to save
6. Use audio player to listen/download

## Known Limitations

1. **Sequential Processing:** Batch generation is sequential, not parallel
2. **No Job Queue:** Should implement Bull/BullMQ for production
3. **Rate Limits:** No rate limiting implemented for AI/11Labs APIs
4. **Error Recovery:** Failed scripts require manual regeneration
5. **Agent Info:** Hardcoded in service (should come from User model)

## Future Enhancements

- [ ] Implement proper job queue (Bull/BullMQ)
- [ ] Add rate limiting for API calls
- [ ] Pull agent info from User model dynamically
- [ ] Add script editing capabilities
- [ ] Implement bulk audio generation progress tracking
- [ ] Add script templates management UI
- [ ] Support for multiple AI models (user selection)

## Troubleshooting

### Scripts contain markdown/commentary
- **Issue:** AI returns "Below is a script..." or markdown formatting
- **Fix:** Already implemented with `cleanScriptOutput()` function
- **Location:** `src/lib/services/script-generation.service.ts:392-441`

### Audio generation fails
- **Check:** ELEVENLABS_API_KEY is set correctly
- **Check:** Voice ID is valid
- **Check:** Cloudinary credentials are configured
- **Location:** `src/lib/services/audio-generation.service.ts`

### Batch generation stuck
- **Check:** Campaign status in database
- **Check:** Server logs for errors
- **Fix:** Manually update campaign.status to 'review'

## Related Documentation

- [Campaign Strategy Architecture](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)
- [Dropcowboy Voicemail System](../integrations/dropcowboy/VOICEMAIL_SYSTEM.md)
- [CRM Overview](../crm/CRM_OVERVIEW.md)
