# Drop Cowboy Voicemail Drop System

Complete AI-powered ringless voicemail (RVM) drop system using Drop Cowboy and ElevenLabs voice cloning.

## Overview

This system allows you to:
- Generate voicemails using your AI-cloned voice (ElevenLabs)
- Upload custom audio files or use AI-generated voice
- Send mass ringless voicemail drops to your contacts (Drop Cowboy)
- Track campaign performance with detailed results

## Setup

### 1. Install Dependencies

Already installed:
```bash
npm install elevenlabs
```

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Drop Cowboy API Credentials (Required)
DROP_COWBOY_TEAM_ID=your_team_id_here
DROP_COWBOY_SECRET=your_secret_key_here

# ElevenLabs API Credentials (Optional - only if using AI voice)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
```

**Note:** Brand ID is entered per-campaign in the UI and is optional (but recommended for TCPA compliance).

### 3. Get API Credentials

#### Drop Cowboy Setup
1. Sign up at https://dropcowboy.com
2. Navigate to your account settings/API section
3. Copy your **Team ID** and **Secret Key**
4. (Optional but recommended) Create a **Brand ID** for TCPA compliance in the Brand Management section
5. Have a **Forwarding Number** ready to receive voicemail replies (your business phone)

#### ElevenLabs Setup (Optional)
1. Sign up at https://elevenlabs.io
2. Go to https://elevenlabs.io/app/settings
3. Copy your API key
4. Go to https://elevenlabs.io/voice-lab
5. Clone your voice by uploading voice samples (30-60 seconds recommended)
6. Copy your Voice ID

## Features

### 1. CRM Dashboard (`/admin/crm`)

The Drop Cowboy integration is located in the CRM Dashboard under the "Voicemail Campaign" tab.

**Tabs Available:**
- **Voicemail Campaign** - Drop Cowboy RVM drops
- **Email Inbox** - Email management
- **Compose Email** - Email composition

### 2. Voicemail Campaign Creation

**Two Audio Options:**

#### Option A: AI Voice Clone
1. Click "AI Voice Clone" mode
2. Enter your voicemail message text
3. Click "Generate AI Voicemail"
4. Preview the generated audio
5. Audio is created using your ElevenLabs voice clone

#### Option B: Upload Audio
1. Click "Upload Audio" mode
2. Upload your pre-recorded voicemail (MP3, WAV, M4A)
3. File is ready to use immediately

**Campaign Setup:**
- **Campaign Name** - Identify your campaign (e.g., "November Buyer Leads")
- **Brand ID** - (Optional) Your registered Drop Cowboy brand for TCPA compliance
- **Forwarding Number** - Phone number to receive voicemail replies (E.164 format: +1XXXXXXXXXX)
- **Contacts CSV** - Upload contacts with headers: `phone,firstName,lastName,email,postalCode`

### 3. Contact List Format

Create a CSV file with the following headers:

```csv
phone,firstName,lastName,email,postalCode
+17603333676,Joseph,Sardella,joseph@josephsardella.com,92260
+15551234567,John,Smith,john@example.com,90210
```

**Important:**
- Phone numbers are automatically formatted to E.164 format
- 10-digit numbers are assumed US and prefixed with +1
- Only rows with valid phone numbers (≥12 characters after formatting) are processed

### 4. Campaign Results

After sending, view detailed results:
- **Total Contacts** - Number of contacts processed
- **Successful Drops** - Successfully delivered voicemails
- **Failed Drops** - Failed deliveries with error details
- **Drop IDs** - Unique Drop Cowboy tracking IDs for each voicemail
- **Per-Contact Status** - Individual success/failure for each phone number

## API Endpoints

### Generate AI Audio
`POST /api/voicemail/generate-audio`

**Request:**
```json
{
  "text": "Hi, this is Joseph Sardella with eXp Realty...",
  "voiceId": "optional_voice_id_override"
}
```

**Response:**
```json
{
  "success": true,
  "audio": "base64_encoded_mp3_audio",
  "mimeType": "audio/mpeg"
}
```

**Features:**
- Uses ElevenLabs `eleven_multilingual_v2` model
- Supports custom voice ID or uses `ELEVENLABS_VOICE_ID` from environment
- Returns base64-encoded MP3 audio
- Streams audio chunks for efficient processing

### Create Drop Cowboy Campaign
`POST /api/dropcowboy/campaign`

**Request (multipart/form-data):**
```
contacts: File (CSV with phone,firstName,lastName,email,postalCode)
audio: File (MP3/WAV/M4A audio file)
campaignName: string (e.g., "November Expired Listings")
brandId: string (Your Drop Cowboy brand ID - required for TCPA)
forwardingNumber: string (E.164 format: +15555551234)
```

**Response:**
```json
{
  "success": true,
  "campaignName": "November Expired Listings",
  "recordingId": "dropcowboy_recording_id",
  "totalContacts": 10,
  "successCount": 9,
  "failureCount": 1,
  "results": [
    {
      "phone": "+17603333676",
      "status": "success",
      "dropId": "drop_123456789"
    },
    {
      "phone": "+15551234567",
      "status": "failed",
      "error": "Invalid phone number"
    }
  ]
}
```

**Process Flow:**
1. Parses CSV contacts file
2. Uploads audio to Drop Cowboy `/v1/media` endpoint
3. Sends individual RVM to each contact via `/v1/rvm` endpoint
4. Returns aggregated results with per-contact status

## Usage Flow

### Quick Start Guide

1. **Prepare Your Voice Clone (One-time setup - Optional)**
   - Upload 30-60 seconds of clear voice samples to ElevenLabs
   - Obtain your Voice ID from the ElevenLabs Voice Lab
   - Add credentials to `.env.local`

2. **Prepare Your Contact List**
   - Create CSV file with headers: `phone,firstName,lastName,email,postalCode`
   - Add your contacts (ensure TCPA consent is obtained)
   - Save the file

3. **Access CRM Dashboard**
   - Navigate to `/admin/crm`
   - Click "Voicemail Campaign" tab

4. **Create Campaign**
   - Enter **Campaign Name** (e.g., "December Buyer Leads")
   - Enter **Brand ID** (from Drop Cowboy account)
   - Enter **Forwarding Number** (your callback number in E.164 format)
   - Upload **Contacts CSV**

5. **Choose Audio Method**

   **Option A - AI Voice Clone:**
   - Click "AI Voice Clone" button
   - Type or paste your voicemail message
   - Click "Generate AI Voicemail"
   - Preview the generated audio

   **Option B - Upload Audio:**
   - Click "Upload Audio" button
   - Select your pre-recorded MP3/WAV/M4A file

6. **Send Campaign**
   - Review all details
   - Click "Send Campaign"
   - Wait for processing (100ms delay between contacts)

7. **Review Results**
   - View total contacts processed
   - Check success/failure counts
   - Review detailed per-contact results
   - Note Drop IDs for tracking in Drop Cowboy dashboard

## TCPA Compliance

**IMPORTANT**: This system is for business communications only.

**Requirements:**
- Only call contacts who have given prior express consent
- Maintain an internal Do Not Call list
- Include opt-out instructions in your voicemails
- Respect opt-out requests immediately
- Keep records of consent

**Example Compliant Voicemail:**
```
Hi, this is Joseph Sardella with eXp Realty. I'm reaching out regarding
your recent inquiry about homes in Palm Desert. I have some great new
listings that match your criteria. Give me a call back at 760-333-2674.
If you'd prefer not to receive these messages, reply STOP and I'll
remove you immediately. Thanks!
```

## Best Practices

### Voice Clone Quality
- Use high-quality audio recordings (clear, no background noise)
- Record in a quiet environment
- Speak naturally and at your normal pace
- Upload 30-60 seconds of varied speech
- Test the voice clone before mass campaigns

### Message Writing
- Keep messages under 30 seconds
- Be clear and concise
- Include your name and company
- Provide a clear call-to-action
- Include contact information
- Add opt-out instructions

### Campaign Management
- Test with small groups first
- Send during business hours (9 AM - 8 PM local time)
- Avoid weekends unless appropriate for your audience
- Monitor delivery rates
- Track responses

### Contact List Management
- Keep lists up to date
- Remove bounced numbers
- Honor opt-out requests immediately
- Segment lists for targeted messaging
- Clean lists regularly

## Troubleshooting

### Audio Generation Fails
- Check ELEVENLABS_API_KEY is set correctly
- Verify ELEVENLABS_VOICE_ID is valid
- Ensure voice clone is fully processed in ElevenLabs
- Check API usage limits

### Campaign Creation Fails
- Check DROPCOWBOY_TEAM_ID and DROPCOWBOY_SECRET
- Verify audio URL is accessible
- Ensure phone numbers are in E.164 format (+1234567890)
- Check DropCowboy account balance

### No Audio Playback
- Check browser console for errors
- Verify audio file format (should be MP3)
- Try different browser
- Check file upload succeeded

## Technical Architecture

### AI Voice Flow
```
User Input (Text)
    ↓
/api/voicemail/generate-audio
    ↓
ElevenLabs API (eleven_multilingual_v2)
    ↓
Audio Stream → Buffer
    ↓
Base64 Encoded MP3
    ↓
Frontend (Blob URL for preview)
    ↓
File object for campaign submission
```

### Campaign Flow
```
CSV + Audio Files (FormData)
    ↓
/api/dropcowboy/campaign
    ↓
Parse CSV → Validate Contacts
    ↓
Upload Audio → Drop Cowboy /v1/media
    ↓
Get Recording ID
    ↓
For Each Contact:
  └─> POST /v1/rvm
      - team_id, secret
      - brand_id (TCPA)
      - phone_number (E.164)
      - forwarding_number
      - recording_id
      - foreign_id (campaign-phone)
      - postal_code
    ↓
Aggregate Results
    ↓
Return Success/Failure Details
```

### Phone Number Formatting
```javascript
// 10 digits → +1 prefix (US assumed)
"7603333676" → "+17603333676"

// 11 digits starting with 1 → + prefix
"17603333676" → "+17603333676"

// Already E.164 → unchanged
"+17603333676" → "+17603333676"
```

## File Structure

### API Routes
- `/src/app/api/voicemail/generate-audio/route.ts` - ElevenLabs AI voice generation
- `/src/app/api/dropcowboy/campaign/route.ts` - Drop Cowboy RVM campaign orchestration

### Components
- `/src/app/components/crm/DropCowboyCampaign.tsx` - Campaign UI component
- `/src/app/admin/crm/page.tsx` - CRM dashboard with tabs

### Test Files
- `/test-campaign.mjs` - Node.js test script for full campaign flow
- `/test-contacts.csv` - Sample CSV contacts file
- `/test-voicemail.json` - Sample voicemail text
- `/test-voicemail.mp3` - Generated audio file (created by test)

### Documentation
- `/docs/VOICEMAIL_DROP_SYSTEM.md` - This file

## Testing

### Run Test Campaign

The test script generates AI audio and sends a campaign:

```bash
# Ensure dev server is running (npm run dev)
node test-campaign.mjs
```

**Test Flow:**
1. Generates AI voicemail from `test-voicemail.json`
2. Saves audio as `test-voicemail.mp3`
3. Uploads contacts from `test-contacts.csv`
4. Sends campaign via Drop Cowboy API
5. Displays detailed results

**Expected Output:**
```
=== Testing Voicemail Campaign ===

Step 1: Generating AI voicemail...
✅ Audio generated successfully
   Audio size: 358392 bytes (base64)

✅ Saved audio to test-voicemail.mp3

Step 2: Creating campaign with Drop Cowboy...
✅ Campaign created successfully!

=== Campaign Results ===
Campaign Name: Test Campaign - Joseph
Recording ID: dcb_rec_xxxxx
Total Contacts: 1
Successful: 1
Failed: 0

=== Detailed Results ===
1. +17603333676: success
   Drop ID: drop_123456789
```

### Manual Testing via UI

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/admin/crm`
3. Click "Voicemail Campaign" tab
4. Fill in all required fields
5. Upload `test-contacts.csv`
6. Choose AI generation or upload `test-voicemail.mp3`
7. Click "Send Campaign"
8. Verify results display

## Environment Variables Reference

```env
# Drop Cowboy (Required)
DROP_COWBOY_TEAM_ID=team_abc123          # From Drop Cowboy account API settings
DROP_COWBOY_SECRET=secret_xyz789          # From Drop Cowboy account API settings

# ElevenLabs (Optional - only for AI voice)
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxx      # From ElevenLabs settings
ELEVENLABS_VOICE_ID=voice_yyyyyyyyyyy    # From Voice Lab

# Note: Brand ID is entered per-campaign in the UI (optional but recommended)
```

## Drop Cowboy API Reference

### Upload Media
**Endpoint:** `POST https://api.dropcowboy.com/v1/media`

**Headers:**
```
x-team-id: {DROP_COWBOY_TEAM_ID}
x-secret: {DROP_COWBOY_SECRET}
Content-Type: application/json
```

**Body:**
```json
{
  "team_id": "team_abc123",
  "secret": "secret_xyz789",
  "filename": "voicemail.mp3",
  "audio_data": "base64_encoded_audio_data"
}
```

**Response:**
```json
[
  {
    "team_id": "87a9db6f-7283-40c3-a753-31171ecbd88d",
    "media_id": "d59abf46-efb1-461a-8689-61c92d6ad4b9",
    "name": "My Recording",
    "created_at": 1764746496847,
    "url": "https://app-cowboy.s3.amazonaws.com/teams/.../media/...wav"
  }
]
```

**Note:** Response is an array. Extract `media_id` to use as `recording_id`.

### Send RVM (Ringless Voicemail)
**Endpoint:** `POST https://api.dropcowboy.com/v1/rvm`

**Headers:**
```
x-team-id: {DROP_COWBOY_TEAM_ID}
x-secret: {DROP_COWBOY_SECRET}
Content-Type: application/json
```

**Body:**
```json
{
  "team_id": "team_abc123",
  "secret": "secret_xyz789",
  "brand_id": "brand_def456",
  "phone_number": "+17603333676",
  "forwarding_number": "+17603333676",
  "recording_id": "dcb_rec_123456789",
  "foreign_id": "campaign-name-17603333676",
  "postal_code": "92260"
}
```

**Response:**
```json
{
  "status": "queued"
}
```

**Note:** Response may include `drop_id`, `id`, or just `status`. Our code handles all variations.

## Troubleshooting

### Common Issues

#### "Recording ID: undefined" or "Drop ID: undefined" in results
**Fixed!** The code now properly handles Drop Cowboy's response format:
- Upload returns array with `media_id` field (not `recording_id`)
- RVM send may return `drop_id`, `id`, or just `status`
- Code extracts correct IDs from all response variations

#### Audio generation fails
```
Error: ElevenLabs API key not configured
```
**Solution:** Add `ELEVENLABS_API_KEY` to `.env.local`

#### Campaign creation fails
```
Error: Drop Cowboy credentials not configured
```
**Solution:** Add all three Drop Cowboy env vars:
- `DROP_COWBOY_TEAM_ID`
- `DROP_COWBOY_SECRET`
- `DROP_COWBOY_BRAND_ID` (in form submission)

#### Invalid phone number errors
**Solution:** Ensure phones are in proper format in CSV:
- US numbers: `7603333676` or `+17603333676`
- International: Include country code with `+`

#### Brand ID questions
**Q: Do I need a Brand ID?**
- Brand ID is **optional** but **highly recommended** for TCPA compliance
- Campaigns work without it, but it's best practice to register your brand
- Find or create brand IDs in Drop Cowboy dashboard → Brand Management

**Q: Where do I find my Brand ID?**
- Log into Drop Cowboy dashboard
- Navigate to Brand Management section
- Copy the Brand ID for use in campaigns
- If you don't have one, you can create a new brand registration

## Future Enhancements

### Planned Features
1. **Campaign Scheduling**
   - Schedule campaigns for future dates/times
   - Timezone support for optimal delivery times
   - Recurring campaigns (weekly/monthly)

2. **Contact Management**
   - Built-in contact database
   - Deduplicate contacts across campaigns
   - Do Not Call list management
   - Contact segmentation and tagging

3. **Message Templates**
   - Save frequently used messages
   - Variable substitution: `{{firstName}}`, `{{city}}`, etc.
   - Template library with categories

4. **Analytics Dashboard**
   - Campaign performance metrics
   - Delivery rate tracking
   - Response rate monitoring
   - Cost per contact analysis
   - Historical trend charts

5. **A/B Testing**
   - Test different messages
   - Compare delivery rates
   - Optimize campaign performance

6. **Integration Enhancements**
   - CRM sync (sync contacts from existing CRM)
   - Webhook notifications for campaign events
   - Callback tracking and logging

## Support

For issues or questions:
- DropCowboy Support: https://dropcowboy.com/support
- ElevenLabs Docs: https://docs.elevenlabs.io
- Developer: See main README

## License

Same as main project license.
