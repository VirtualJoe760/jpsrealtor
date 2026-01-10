# Voicemail Campaign - Simplified Workflow Action Plan

## Executive Summary

Due to Drop Cowboy API limitations discovered on 2026-01-07, we cannot programmatically upload audio files without a BYOC (Bring Your Own Carrier) account. This document outlines the **simplified voicemail campaign workflow** that allows users to select from pre-uploaded Drop Cowboy recordings.

**Key Discovery:** Drop Cowboy's `/media` POST endpoint returns a **list of existing recordings** rather than uploading new audio. Audio files must be manually uploaded via Drop Cowboy's web portal.

**Solution:** Create a simplified 3-step workflow: **Contacts → Audio Selection → Send**

---

## Drop Cowboy API Limitation

### What We Discovered

Our comprehensive logging revealed that the Drop Cowboy `/media` endpoint:
- Does NOT upload audio files programmatically
- Returns a list of existing recordings in the account
- Our code was incorrectly using the first item from this list

**Evidence from logs:**
```json
{
  "Upload response data (full)": [
    {
      "media_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
      "name": "test",  // ← Old file in account
      ...
    },
    {
      "media_id": "d59abf46-efb1-461a-8689-61c92d6ad4b9",
      "name": "My Recording",  // ← Another old file
      ...
    }
  ]
}
```

### Available Drop Cowboy RVM Options

According to [Drop Cowboy Documentation](https://drop-cowboy.gitbook.io/drop-cowboy-docs/api/sending-rvm-ringless-voicemail):

1. **`recording_id`** (Current Account Only)
   - Use pre-existing approved recordings
   - Must be manually uploaded via Drop Cowboy web portal
   - ✅ **Available now - this is what we'll use**

2. **`audio_url`** (BYOC Plans Only)
   - Provide MP3 URL for Drop Cowboy to fetch
   - Requires BYOC (Bring Your Own Carrier) account
   - ⏳ **Future enhancement when BYOC activated**

3. **`tts_body` + `voice_id`** (AI Text-to-Speech)
   - Drop Cowboy's built-in TTS
   - Limited voice options
   - ❌ **Not suitable for our use case (we prefer 11Labs)**

---

## Current Complex Pipeline vs Simplified Pipeline

### Current Complex Pipeline (Preserved for Future BYOC)

**Route:** `/api/campaigns/[id]/send`

**Workflow:**
```
1. Contacts → 2. Scripts → 3. Audio → 4. Preview → 5. Send
```

**Features:**
- AI script generation per contact
- 11Labs audio generation
- Audio upload to Cloudinary
- ❌ Attempted Drop Cowboy audio upload (doesn't work)
- Preview before sending

**Status:**
- ✅ Fully functional except Drop Cowboy upload
- 🔒 **PRESERVED** for future BYOC account activation
- 📁 Keep all code intact in current route

### New Simplified Pipeline (Current Implementation)

**Route:** `/api/campaigns/[id]/send-simple` (NEW)

**Workflow:**
```
1. Contacts → 2. Audio Selection → 3. Send
```

**Features:**
- Fetch list of Drop Cowboy recordings via API
- User selects from existing recording_id's
- Direct RVM submission to Drop Cowboy
- No script generation needed
- No audio generation needed
- No preview needed (user uploaded audio manually)

**Advantages:**
- ✅ Works with current Drop Cowboy account
- ✅ Simpler user flow
- ✅ Faster deployment
- ✅ No AI costs (Groq/11Labs)
- ✅ User has full control over audio

---

## Architecture: Dual-Route System

### Strategy

We will maintain **TWO parallel systems**:

1. **Simple Route** (Active Now)
   - For current Drop Cowboy standard account
   - Used until BYOC account is activated
   - Minimal complexity

2. **Complex Route** (Preserved for Future)
   - Full pipeline with AI script generation
   - 11Labs audio generation
   - Cloudinary storage
   - Activated when BYOC account is available

### Route Structure

```
/api/campaigns/[id]/
  ├── send              (Complex - BYOC required)
  ├── send-simple       (Simple - Active now) ← NEW
  ├── scripts/          (Complex route only)
  ├── audio/            (Complex route only)
  └── recordings/       (Simple route) ← NEW
      └── list          (Fetch Drop Cowboy recordings)
```

---

## Action Plan

### Phase 1: API Development (2-3 hours)

#### Task 1.1: Create Drop Cowboy Recordings List Endpoint
**File:** `src/app/api/campaigns/[id]/recordings/list/route.ts` (NEW)

**Purpose:** Fetch list of available recordings from Drop Cowboy account

**Implementation:**
```typescript
/**
 * GET /api/campaigns/[id]/recordings/list
 * Fetch available Drop Cowboy recordings for user to select
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authenticate user
  // 2. Call Drop Cowboy /media endpoint (GET or POST)
  // 3. Parse response array
  // 4. Return formatted list with: media_id, name, duration, date_added
}
```

**Expected Response:**
```json
{
  "success": true,
  "recordings": [
    {
      "media_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
      "name": "New Listing Announcement",
      "duration": 45,
      "date_added": "2026-01-05",
      "file_size_kb": 512
    },
    {
      "media_id": "d59abf46-efb1-461a-8689-61c92d6ad4b9",
      "name": "Expired Listing Follow-up",
      "duration": 38,
      "date_added": "2026-01-03",
      "file_size_kb": 432
    }
  ]
}
```

**Estimated Time:** 1 hour

---

#### Task 1.2: Create Simplified Send Route
**File:** `src/app/api/campaigns/[id]/send-simple/route.ts` (NEW)

**Purpose:** Send RVM using pre-selected recording_id from Drop Cowboy

**Implementation:**
```typescript
/**
 * POST /api/campaigns/[id]/send-simple
 * Send voicemail campaign using existing Drop Cowboy recording
 *
 * Request Body:
 * {
 *   "recording_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
 *   "contact_ids": ["60a1b2c3...", "70b2c3d4..."]  // Optional: specific contacts
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const { recording_id, contact_ids } = await request.json();

  // 1. Authenticate user
  // 2. Get campaign and validate ownership
  // 3. Get contacts (all or specific subset)
  // 4. For each contact:
  //    a. Submit RVM to Drop Cowboy with recording_id
  //    b. Track submission
  //    c. Update campaign stats
  // 5. Return success with submission summary
}
```

**Key Differences from Complex Route:**
- No script generation
- No audio generation
- No Cloudinary upload
- Direct recording_id usage
- Simplified payload to Drop Cowboy

**RVM Payload:**
```typescript
{
  team_id: DROP_COWBOY_TEAM_ID,
  secret: DROP_COWBOY_SECRET,
  brand_id: DROP_COWBOY_BRAND_ID,
  number_pool_id: DROP_COWBOY_NUMBER_POOL_ID,
  phone_number: contact.phone,
  forwarding_number: userForwardingNumber,
  recording_id: recording_id,  // ← User-selected
  foreign_id: `${campaignName}-${contactId}`,
}
```

**Estimated Time:** 2 hours

---

### Phase 2: Frontend UI Development (4-5 hours)

#### Task 2.1: Create Audio Selection Component
**File:** `src/app/campaigns/[id]/components/PipelineAudioSimpleStep.tsx` (NEW)

**Purpose:** Allow user to select from Drop Cowboy recordings

**Features:**
1. Fetch recordings from `/api/campaigns/[id]/recordings/list`
2. Display recordings as selectable cards
3. Show recording details (name, duration, date)
4. Play preview (if Drop Cowboy provides playback URL)
5. Select one recording
6. Validate selection before proceeding

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│  SELECT AUDIO RECORDING                                 │
├─────────────────────────────────────────────────────────┤
│  Choose a recording you've uploaded to Drop Cowboy:     │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ ○  New Listing Announcement                  │       │
│  │    Duration: 45 seconds • Added Jan 5, 2026  │       │
│  │    [▶ Play Preview]                          │       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ ●  Expired Listing Follow-up          ✓      │       │
│  │    Duration: 38 seconds • Added Jan 3, 2026  │       │
│  │    [▶ Play Preview]                          │       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
│  ℹ️  Need to add a new recording?                      │
│  Upload it at: https://app.dropcowboy.com/media        │
│  Then refresh this page.                                │
│                                                          │
│  [← Back]                          [Continue →]         │
└─────────────────────────────────────────────────────────┘
```

**Component Structure:**
```typescript
export default function PipelineAudioSimpleStep({ campaign }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    const response = await fetch(`/api/campaigns/${campaign._id}/recordings/list`);
    const data = await response.json();
    setRecordings(data.recordings);
    setLoading(false);
  };

  const handleContinue = () => {
    if (!selectedRecordingId) {
      toast.error('Please select a recording');
      return;
    }
    onComplete({ recording_id: selectedRecordingId });
  };

  return (
    <div className="space-y-4">
      <h2>Select Audio Recording</h2>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {recordings.map(recording => (
            <RecordingCard
              key={recording.media_id}
              recording={recording}
              selected={selectedRecordingId === recording.media_id}
              onSelect={() => setSelectedRecordingId(recording.media_id)}
            />
          ))}
        </div>
      )}
      <InfoBox>
        Need to add a new recording?
        <a href="https://app.dropcowboy.com/media" target="_blank">
          Upload it to Drop Cowboy
        </a> then refresh this page.
      </InfoBox>
      <div className="flex justify-between">
        <Button onClick={onBack}>← Back</Button>
        <Button onClick={handleContinue} disabled={!selectedRecordingId}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
```

**Estimated Time:** 3 hours

---

#### Task 2.2: Update Pipeline Component for Simplified Flow
**File:** `src/app/campaigns/[id]/components/CampaignPipeline.tsx` (MODIFY)

**Changes:**
1. Add mode toggle: "Simple" vs "Full" (or show based on account type)
2. For Simple mode:
   - Show 3 steps: Contacts → Audio → Send
   - Hide Scripts and Preview steps
   - Use `PipelineAudioSimpleStep` instead of `PipelineAudioStep`
   - Call `/api/campaigns/[id]/send-simple` instead of `/send`

**Conditional Rendering:**
```typescript
const isSimpleMode = true; // TODO: Check account type or user preference

const steps = isSimpleMode
  ? [
      { id: 'contacts', label: 'Contacts', component: PipelineContactsStep },
      { id: 'audio', label: 'Audio', component: PipelineAudioSimpleStep },
      { id: 'send', label: 'Send', component: PipelineSendSimpleStep },
    ]
  : [
      { id: 'contacts', label: 'Contacts', component: PipelineContactsStep },
      { id: 'scripts', label: 'Scripts', component: PipelineScriptsStep },
      { id: 'audio', label: 'Audio', component: PipelineAudioStep },
      { id: 'preview', label: 'Preview', component: PipelinePreviewStep },
      { id: 'send', label: 'Send', component: PipelineSendStep },
    ];
```

**Estimated Time:** 1 hour

---

#### Task 2.3: Create Simple Send Step Component
**File:** `src/app/campaigns/[id]/components/PipelineSendSimpleStep.tsx` (NEW)

**Purpose:** Final confirmation and send for simple workflow

**Features:**
1. Show campaign summary (contacts, selected recording)
2. Confirm send button
3. Call `/api/campaigns/[id]/send-simple`
4. Show progress/status
5. Display results

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│  READY TO SEND                                          │
├─────────────────────────────────────────────────────────┤
│  Campaign: PDCC Expired Listings - Q1 2026             │
│  Contacts: 150 phone numbers                            │
│  Recording: "Expired Listing Follow-up" (38 sec)       │
│                                                          │
│  ✓ All contacts have valid phone numbers               │
│  ✓ Recording is ready                                  │
│                                                          │
│  Estimated cost: $15.00 (150 contacts × $0.10)         │
│                                                          │
│  [← Back]                    [Send Campaign →]          │
└─────────────────────────────────────────────────────────┘
```

**Estimated Time:** 1 hour

---

### Phase 3: Database Updates (1 hour)

#### Task 3.1: Add Simple Mode Flag to Campaign Model
**File:** `src/models/Campaign.ts` (MODIFY)

**Add Field:**
```typescript
interface Campaign {
  // ... existing fields

  // Voicemail mode
  voicemailMode?: 'simple' | 'full';  // 'simple' = recording_id, 'full' = BYOC audio_url

  // For simple mode
  selectedRecordingId?: string;  // Drop Cowboy recording_id
  selectedRecordingName?: string;
}
```

**Estimated Time:** 30 minutes

---

#### Task 3.2: Update VoicemailScript Model (Optional)
**File:** `src/models/VoicemailScript.ts` (MODIFY)

**Add Field for Recording ID:**
```typescript
interface VoicemailScript {
  // ... existing fields

  // For simple mode
  dropCowboyRecordingId?: string;  // Direct recording_id instead of generated audio
}
```

**Note:** This is optional - we might not even create VoicemailScript documents in simple mode since there's no script generation.

**Estimated Time:** 30 minutes

---

### Phase 4: Documentation & Instructions (1 hour)

#### Task 4.1: Create User Guide
**File:** `docs/campaigns/VOICEMAIL_SIMPLE_WORKFLOW_USER_GUIDE.md` (NEW)

**Contents:**
1. How to upload recordings to Drop Cowboy
2. How to create a voicemail campaign (simple mode)
3. How to select recordings
4. Best practices for recording names
5. Troubleshooting

**Estimated Time:** 30 minutes

---

#### Task 4.2: Update Campaign Documentation
**File:** `docs/campaigns/CAMPAIGN_STRATEGY_ARCHITECTURE.md` (UPDATE)

**Add Section:**
- Drop Cowboy API Limitations
- Dual-route strategy explanation
- When to use Simple vs Full mode
- Future BYOC migration plan

**Estimated Time:** 30 minutes

---

## Implementation Timeline

### Total Estimated Time: 8-10 hours

**Day 1 (4-5 hours):**
- ✅ Task 1.1: Recordings list endpoint (1 hour)
- ✅ Task 1.2: Simplified send route (2 hours)
- ✅ Task 2.1: Audio selection component (partial - 2 hours)

**Day 2 (4-5 hours):**
- ✅ Task 2.1: Audio selection component (complete - 1 hour)
- ✅ Task 2.2: Pipeline updates (1 hour)
- ✅ Task 2.3: Send step component (1 hour)
- ✅ Task 3.1-3.2: Database updates (1 hour)
- ✅ Task 4.1-4.2: Documentation (1 hour)

---

## Testing Plan

### Manual Testing Checklist

#### 1. Recordings List Endpoint
- [ ] Endpoint returns 200 status
- [ ] Returns array of recordings
- [ ] Handles empty recordings list
- [ ] Handles Drop Cowboy API errors
- [ ] Requires authentication

#### 2. Audio Selection Component
- [ ] Loads recordings on mount
- [ ] Shows loading state
- [ ] Displays recording cards correctly
- [ ] Allows selection of one recording
- [ ] Validates selection before continue
- [ ] Refresh button works
- [ ] External link to Drop Cowboy works

#### 3. Send Simple Route
- [ ] Validates recording_id
- [ ] Gets correct contacts for campaign
- [ ] Submits RVM to Drop Cowboy successfully
- [ ] Handles Drop Cowboy errors gracefully
- [ ] Updates campaign stats
- [ ] Returns success response
- [ ] Creates proper audit trail

#### 4. End-to-End Flow
- [ ] Create campaign
- [ ] Add contacts
- [ ] Select recording from Drop Cowboy
- [ ] Send campaign
- [ ] Verify voicemails delivered
- [ ] Check campaign stats updated
- [ ] Verify history populated

---

## Migration Plan: When BYOC Account Activates

### Steps to Switch to Full Pipeline

1. **Update Account Configuration**
   ```typescript
   // In .env.local or database
   DROP_COWBOY_ACCOUNT_TYPE=byoc
   ```

2. **UI Toggle**
   - Change `isSimpleMode = false` in CampaignPipeline
   - Or add user preference setting

3. **Route Selection**
   - Campaigns will use `/api/campaigns/[id]/send` (full route)
   - audio_url parameter will work with BYOC

4. **Data Migration**
   - No migration needed
   - New campaigns use full pipeline
   - Old simple campaigns remain as-is

5. **Preserve Simple Mode (Optional)**
   - Keep simple mode available as an option
   - Some users might prefer manual audio upload
   - Useful for pre-approved recordings

---

## Files Changed Summary

### New Files Created (7 files)

**API Routes:**
1. `src/app/api/campaigns/[id]/recordings/list/route.ts`
2. `src/app/api/campaigns/[id]/send-simple/route.ts`

**Components:**
3. `src/app/campaigns/[id]/components/PipelineAudioSimpleStep.tsx`
4. `src/app/campaigns/[id]/components/PipelineSendSimpleStep.tsx`

**Documentation:**
5. `docs/campaigns/VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md` (this file)
6. `docs/campaigns/VOICEMAIL_SIMPLE_WORKFLOW_USER_GUIDE.md`
7. `docs/campaigns/DROP_COWBOY_API_LIMITATIONS.md`

### Modified Files (3 files)

**Database Models:**
1. `src/models/Campaign.ts` - Add voicemailMode, selectedRecordingId fields

**Components:**
2. `src/app/campaigns/[id]/components/CampaignPipeline.tsx` - Add simple mode support

**Documentation:**
3. `docs/campaigns/CAMPAIGN_STRATEGY_ARCHITECTURE.md` - Add dual-route section

### Preserved Files (No Changes)

**Keep Intact for Future BYOC:**
- ✅ `src/app/api/campaigns/[id]/send/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/[scriptId]/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/[scriptId]/upload-audio/route.ts`
- ✅ `src/lib/services/script-generation.service.ts`
- ✅ `src/app/campaigns/[id]/components/PipelineScriptsStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelineAudioStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelinePreviewStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelineSendStep.tsx`

---

## Cost Comparison

### Simple Mode (Current)
- **Cost per voicemail:** ~$0.10 (Drop Cowboy charge)
- **Additional costs:** $0 (no AI services)
- **Total for 150 contacts:** $15.00

### Full Mode (Future BYOC)
- **Cost per voicemail:** ~$0.05-0.08 (BYOC carrier rates)
- **Additional costs:**
  - Groq script generation: ~$0.001 per contact
  - 11Labs audio generation: ~$0.05 per minute (one-time per campaign)
  - Cloudinary storage: Minimal
- **Total for 150 contacts:** ~$7.50 - $12.00 + $0.15 (Groq) + ~$2.50 (11Labs) = ~$10-15

**Analysis:** Full mode potentially cheaper at scale, but requires BYOC account setup.

---

## Risk Mitigation

### Risk 1: Drop Cowboy /media Endpoint Changes
**Mitigation:**
- Cache recordings list locally (refresh button)
- Add error handling for API changes
- Document expected response format

### Risk 2: User Confusion (Two Workflows)
**Mitigation:**
- Clear UI indication of which mode is active
- Tooltips and help text
- User guide documentation
- In-app messaging about BYOC upgrade

### Risk 3: Missing Recordings
**Mitigation:**
- Clear instructions on how to upload to Drop Cowboy
- Link directly to Drop Cowboy media page
- Handle empty recordings list gracefully
- Show helpful error messages

---

## Success Metrics

### MVP Success Criteria

1. **Functionality:**
   - ✅ Fetch Drop Cowboy recordings successfully
   - ✅ User can select recording
   - ✅ Campaign sends with selected recording_id
   - ✅ Voicemails delivered to phones
   - ✅ Campaign stats update correctly

2. **Performance:**
   - Recordings list loads in <2 seconds
   - Campaign send initiates in <3 seconds
   - 100% success rate for valid recording_id's

3. **User Experience:**
   - Simple 3-step workflow completed in <5 minutes
   - Clear error messages
   - No user confusion

---

## Future Enhancements (Post-BYOC)

1. **Recording Library Management**
   - Tag and categorize recordings
   - Search recordings by name
   - Preview playback in UI
   - Upload recordings via API (BYOC)

2. **Hybrid Mode**
   - Allow users to choose per-campaign
   - Some campaigns use recording_id (quick)
   - Some campaigns use full pipeline (personalized)

3. **Recording Analytics**
   - Track which recordings perform best
   - Listen rate by recording
   - Response rate by recording
   - Recommend top-performing recordings

4. **A/B Testing**
   - Test multiple recordings
   - Split contacts across recordings
   - Compare performance

---

## Questions for Stakeholder

1. **Account Timeline:** When do we expect BYOC account to be activated?
2. **User Preference:** Should we offer both modes even after BYOC?
3. **Recording Limits:** What's the max number of recordings in Drop Cowboy account?
4. **Naming Convention:** Should we enforce recording naming standards?
5. **Approval Process:** Do recordings need approval before use?

---

## Next Steps

1. ✅ Review and approve this action plan
2. ✅ Allocate developer time (8-10 hours)
3. ✅ Begin Phase 1: API Development
4. ✅ Test recordings list endpoint with Drop Cowboy
5. ✅ Implement frontend components
6. ✅ End-to-end testing
7. ✅ Deploy to production
8. ✅ User documentation and training

---

**Document Version:** 1.0
**Created:** 2026-01-07
**Author:** AI Development Team
**Status:** Ready for Implementation
**Priority:** High - Unblocks voicemail campaigns
**Estimated Completion:** 2 days
