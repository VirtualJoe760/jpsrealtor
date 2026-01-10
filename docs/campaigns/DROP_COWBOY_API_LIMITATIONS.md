# Drop Cowboy API Limitations & Discovery

## Date Discovered: 2026-01-07

## Executive Summary

Through comprehensive debugging and logging, we discovered that **Drop Cowboy's `/media` POST endpoint does NOT upload audio files**. Instead, it returns a **list of existing recordings** in the account. This fundamentally impacts our voicemail campaign architecture and requires a workflow redesign.

---

## The Problem

### What We Expected

We expected the Drop Cowboy `/media` endpoint to:
1. Accept a POST request with audio file data (base64 or multipart)
2. Upload the audio to Drop Cowboy's servers
3. Return a new `recording_id` for the uploaded file
4. Allow us to use that `recording_id` in RVM requests

### What Actually Happens

The `/media` endpoint:
1. Accepts a POST request (but ignores the audio data)
2. Returns a **list of ALL existing recordings** in the Drop Cowboy account
3. Does NOT upload anything
4. Our code was incorrectly extracting the first item from this list

---

## Evidence

### Logs from Production Run (2026-01-07)

```json
{
  "message": "Upload payload",
  "payload": {
    "team_id": "dc_team_xxx",
    "secret": "dc_secret...",
    "filename": "67772f96b9e8e03ca07ef826_1736248738296.mp3",
    "audio_data_length": 876543  // ← We sent audio data
  }
}
```

```json
{
  "message": "Upload response data (full)",
  "data": [
    {
      "media_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
      "name": "test",  // ← OLD file in account
      "date_added": "2025-12-15",
      "duration": 30,
      "file_size_kb": 256
    },
    {
      "media_id": "d59abf46-efb1-461a-8689-61c92d6ad4b9",
      "name": "My Recording",  // ← ANOTHER old file
      "date_added": "2025-12-20",
      "duration": 45,
      "file_size_kb": 512
    }
  ]
}
```

```json
{
  "message": "Media object extracted",
  "object": {
    "media_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
    "name": "test"  // ← First item from list (wrong!)
  }
}
```

### What Drop Cowboy Support Said

> "We're receiving the recording_id for the file named 'test' instead of your uploaded audio file."

This makes perfect sense now - we were extracting the first recording from the list, which happened to be named "test".

---

## Drop Cowboy API Documentation

According to [Drop Cowboy RVM Documentation](https://drop-cowboy.gitbook.io/drop-cowboy-docs/api/sending-rvm-ringless-voicemail):

### Audio Options for RVM

#### 1. `recording_id` (Available on All Plans)
```json
{
  "recording_id": "d5203d23-a8ff-4354-8319-0900a11be6ad"
}
```
- Use an existing approved recording from your Drop Cowboy account
- Recordings must be manually uploaded via web portal
- ✅ **This is what we'll use for standard accounts**

#### 2. `audio_url` (BYOC Plans Only)
```json
{
  "audio_url": "https://your-server.com/audio/recording.mp3"
}
```
- Provide a publicly accessible MP3 URL
- Drop Cowboy fetches the file from your URL
- Requires BYOC (Bring Your Own Carrier) account
- ⏳ **This is what we'll use when BYOC is activated**

#### 3. `tts_body` + `voice_id` (All Plans)
```json
{
  "tts_body": "Hello, this is a message from...",
  "voice_id": "Matthew"
}
```
- Use Drop Cowboy's built-in text-to-speech
- Limited voice options
- ❌ **Not suitable - we prefer 11Labs quality**

---

## Why This Matters

### Impact on Architecture

**Current Code Assumption:**
```typescript
// WRONG - This doesn't upload!
const uploadResponse = await fetch('https://api.dropcowboy.com/media', {
  method: 'POST',
  body: JSON.stringify({
    team_id: TEAM_ID,
    secret: SECRET,
    filename: 'recording.mp3',
    audio_data: base64Audio  // ← Ignored!
  })
});

const data = await uploadResponse.json();
const recordingId = data[0].media_id;  // ← Wrong! Returns first existing recording
```

**What Actually Happens:**
1. We send audio data (base64 encoded)
2. Drop Cowboy ignores it completely
3. Returns list of existing recordings
4. We extract first recording (often "test" or "My Recording")
5. RVM is sent with wrong audio

**Why Users Received Wrong Audio:**
- User creates campaign with custom recording
- We attempt to upload it
- Drop Cowboy returns list of old recordings
- We use first old recording ("test")
- User receives old voicemail, not new one

---

## Solutions Explored

### Solution 1: Find Upload Endpoint ❌
**Attempted:** Searched Drop Cowboy API docs for audio upload endpoint
**Result:** No such endpoint exists for standard accounts

### Solution 2: Use audio_url Parameter ❌ (For Now)
**Attempted:** Use Cloudinary URL with `audio_url` parameter
**Result:** Only works with BYOC accounts

### Solution 3: Contact Drop Cowboy Support ⏳
**Attempted:** Ask if there's an undocumented upload API
**Result:** Waiting for response; likely requires BYOC

### Solution 4: Simplified Workflow ✅ (Current Implementation)
**Approach:**
- Users manually upload recordings to Drop Cowboy web portal
- We fetch list of recordings via API
- User selects from existing recordings
- We use selected `recording_id` for RVM

**Status:** This is what we're implementing now

---

## BYOC Account Comparison

### Standard Drop Cowboy Account (Current)

**Features:**
- Ringless voicemail delivery
- Web portal for recording uploads
- Manual recording management
- Pre-approved recordings only

**API Capabilities:**
- ✅ Send RVM with `recording_id`
- ✅ Send RVM with `tts_body`
- ❌ Upload audio via API
- ❌ Use `audio_url` parameter

**Cost:**
- ~$0.10 per voicemail

### BYOC Account (Future)

**Features:**
- Everything in Standard
- Bring Your Own Carrier (lower rates)
- API audio upload via `audio_url`
- Dynamic audio generation

**API Capabilities:**
- ✅ Send RVM with `recording_id`
- ✅ Send RVM with `tts_body`
- ✅ Send RVM with `audio_url` (dynamic)
- ✅ Programmatic workflow

**Cost:**
- ~$0.05-0.08 per voicemail
- Setup fees may apply
- Monthly minimums may apply

---

## Migration Path to BYOC

### When BYOC Account Activates

1. **Enable `audio_url` Parameter**
   - Our existing Cloudinary URLs will work
   - Full pipeline can be activated
   - No code changes needed (already built)

2. **Workflow Choice**
   - Users can choose per campaign:
     - **Simple:** Use existing recording_id (quick)
     - **Full:** Generate custom audio (personalized)

3. **Cost Optimization**
   - General campaigns: Use recording_id (free)
   - Personalized campaigns: Generate custom audio ($0.05-0.10 per contact)

---

## Current Workaround: Manual Upload Process

### For Users

1. **Record Audio**
   - Use professional recording
   - Or generate with 11Labs
   - Download MP3 file

2. **Upload to Drop Cowboy**
   - Go to https://app.dropcowboy.com/media
   - Upload MP3 file
   - Name it descriptively
   - Wait for approval (if required)

3. **Create Campaign**
   - In our app, create voicemail campaign
   - Select contacts
   - Choose recording from list
   - Send campaign

### For Developers

1. **Fetch Recordings List**
   ```typescript
   GET/POST https://api.dropcowboy.com/media
   // Returns array of existing recordings
   ```

2. **Display to User**
   - Show recording names
   - Show durations
   - Allow selection

3. **Use Selected recording_id**
   ```typescript
   POST https://api.dropcowboy.com/api
   {
     "command": "message.send_rvm",
     "recording_id": selectedRecordingId,
     // ... other params
   }
   ```

---

## Lessons Learned

### 1. Always Verify API Behavior
- Don't assume endpoint behavior matches expectations
- Test with comprehensive logging
- Verify response structure

### 2. Document API Limitations Early
- Check for account tier limitations
- Understand BYOC vs standard differences
- Plan architecture around constraints

### 3. Have Fallback Plans
- Simple workflow for MVP
- Complex workflow for future
- Don't over-engineer before validation

### 4. User Communication
- Be transparent about limitations
- Provide clear workarounds
- Set expectations for future features

---

## Action Items

- [x] Document Drop Cowboy API limitation
- [x] Create simplified workflow plan
- [ ] Implement recordings list endpoint
- [ ] Build recording selector UI
- [ ] Create simplified send route
- [ ] Test end-to-end flow
- [ ] Document user process
- [ ] Contact Drop Cowboy about BYOC upgrade path

---

## Related Documents

- [Simplified Workflow Action Plan](./VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md)
- [Campaign Architecture](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)
- [Drop Cowboy Documentation](https://drop-cowboy.gitbook.io/drop-cowboy-docs/)

---

**Document Version:** 1.0
**Created:** 2026-01-07
**Author:** AI Development Team
**Status:** Confirmed via testing and support feedback
