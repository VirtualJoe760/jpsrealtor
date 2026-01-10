# Voicemail Campaign Documentation - Simplified Workflow

## Overview

This directory contains comprehensive documentation for the **simplified voicemail campaign workflow**, created in response to Drop Cowboy API limitations discovered on 2026-01-07.

**Key Finding:** Drop Cowboy's `/media` POST endpoint does NOT upload audio files—it only returns a list of existing recordings.

**Solution:** Dual-route architecture that preserves the full pipeline for future BYOC activation while implementing a simplified workflow for immediate use.

---

## Quick Start

**If you're new, start here:**

1. Read [Drop Cowboy API Limitations](./DROP_COWBOY_API_LIMITATIONS.md) - Understand the problem
2. Read [Simplified Action Plan](./VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md) - See the solution
3. Read [Recording Selector Spec](./RECORDING_SELECTOR_COMPONENT_SPEC.md) - Implementation details

---

## Document Index

### 📋 Action Plan & Strategy

**[VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md](./VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md)**
- Comprehensive action plan for simplified workflow
- 3-step flow: Contacts → Audio Selection → Send
- Implementation timeline: 8-10 hours
- Files to create, API routes, components
- Testing checklist
- Migration plan for BYOC activation

**Key Sections:**
- Drop Cowboy API Limitation explanation
- Simplified vs Complex pipeline comparison
- Phase-by-phase implementation plan
- Cost analysis
- Risk mitigation

---

### 🔍 Problem Discovery

**[DROP_COWBOY_API_LIMITATIONS.md](./DROP_COWBOY_API_LIMITATIONS.md)**
- Detailed documentation of Drop Cowboy API discovery
- Evidence from production logs
- What we expected vs what actually happens
- Standard vs BYOC account comparison
- Migration path to BYOC

**Key Sections:**
- The problem explained
- Production logs showing the issue
- Drop Cowboy API documentation
- Impact on architecture
- Solutions explored
- Lessons learned

---

### 💾 Preserved Full Pipeline

**[VOICEMAIL_FULL_PIPELINE_PRESERVED.md](./VOICEMAIL_FULL_PIPELINE_PRESERVED.md)**
- Complete documentation of the full voicemail pipeline
- All files that must be preserved (DO NOT DELETE)
- Activation checklist for when BYOC is available
- Integration details (11Labs, Cloudinary, Drop Cowboy)
- Cost analysis and comparison

**Key Sections:**
- Full pipeline workflow (5 steps)
- All preserved API routes
- Service layer documentation
- Frontend components documentation
- Database models
- BYOC activation instructions

---

### 🎨 Component Specification

**[RECORDING_SELECTOR_COMPONENT_SPEC.md](./RECORDING_SELECTOR_COMPONENT_SPEC.md)**
- Technical specification for `PipelineAudioSimpleStep` component
- Complete component implementation code
- API integration details
- Error handling strategies
- Accessibility requirements
- Testing checklist

**Key Sections:**
- Component architecture
- Props and state interfaces
- Full implementation code
- API endpoint specification
- Error scenarios
- Future enhancements

---

### 🏗️ Architecture Reference

**[CAMPAIGN_STRATEGY_ARCHITECTURE.md](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)** (Updated)
- Main campaign architecture document
- **NEW SECTION:** Voicemail Dual-Route Implementation (lines 1006-1104)
- Campaign-Strategy system overview
- Multi-channel strategy coordination

**Recent Updates (v1.1 - 2026-01-07):**
- Added voicemail dual-route strategy section
- Simple Mode (active now) vs Full Mode (BYOC)
- Implementation status tracking
- Migration plan
- Files preserved list

---

## Implementation Summary

### What Was Discovered

On **2026-01-07**, through comprehensive logging and debugging, we discovered:

```json
// We sent this:
POST /media
{
  "team_id": "...",
  "secret": "...",
  "filename": "recording_12345.mp3",
  "audio_data": "base64encodeddata..."  // ← We sent audio!
}

// Drop Cowboy returned this:
[
  {
    "media_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
    "name": "test",  // ← OLD file in account!
    ...
  },
  {
    "media_id": "d59abf46-efb1-461a-8689-61c92d6ad4b9",
    "name": "My Recording",  // ← ANOTHER old file
    ...
  }
]
```

**Problem:** Drop Cowboy returned a **list of existing recordings** instead of uploading our file!

**Result:** We were using the first recording from the list ("test"), which is why users received wrong audio.

---

### The Solution: Dual-Route Architecture

We maintain **two parallel voicemail campaign systems**:

#### Route 1: Simple Mode (Active Now) ✅

**Path:** `/api/campaigns/[id]/send-simple`

**Workflow:**
```
Contacts → Audio Selection → Send
```

**How it works:**
1. User manually uploads audio to Drop Cowboy web portal
2. We fetch list of recordings via `/media` endpoint
3. User selects recording from list
4. We send RVM with selected `recording_id`

**Status:** Ready to implement

---

#### Route 2: Full Mode (Preserved for BYOC) ⏳

**Path:** `/api/campaigns/[id]/send`

**Workflow:**
```
Contacts → Scripts → Audio → Preview → Send
```

**How it works:**
1. AI generates scripts (Groq/Claude)
2. 11Labs generates audio
3. Audio uploaded to Cloudinary
4. RVM sent with `audio_url` parameter (BYOC only!)

**Status:** Fully built but requires BYOC account

---

## Files to Create

### API Routes (2 files)

1. **`src/app/api/campaigns/[id]/recordings/list/route.ts`** (NEW)
   - Fetch Drop Cowboy recordings list
   - Return formatted array
   - Handle errors

2. **`src/app/api/campaigns/[id]/send-simple/route.ts`** (NEW)
   - Simplified send route
   - Accept recording_id
   - Submit RVM to Drop Cowboy

### Components (2 files)

3. **`src/app/campaigns/[id]/components/PipelineAudioSimpleStep.tsx`** (NEW)
   - Recording selector component
   - Fetch and display recordings
   - Handle selection

4. **`src/app/campaigns/[id]/components/PipelineSendSimpleStep.tsx`** (NEW)
   - Simple send confirmation
   - Campaign summary
   - Send button

### Models (1 file - MODIFY)

5. **`src/models/Campaign.ts`** (MODIFY)
   - Add `voicemailMode?: 'simple' | 'full'`
   - Add `selectedRecordingId?: string`
   - Add `selectedRecordingName?: string`

---

## Files to Preserve (DO NOT DELETE!)

### ⚠️ CRITICAL: Keep for BYOC Activation

**API Routes:**
- ✅ `src/app/api/campaigns/[id]/send/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/[scriptId]/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/[scriptId]/upload-audio/route.ts`

**Services:**
- ✅ `src/lib/services/script-generation.service.ts`

**Components:**
- ✅ `src/app/campaigns/[id]/components/PipelineScriptsStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelineAudioStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelinePreviewStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelineSendStep.tsx`

**Models:**
- ✅ `src/models/VoicemailScript.ts`

**Why preserve?** These will be reactivated when BYOC account is available.

---

## Implementation Timeline

### Estimated Time: 8-10 hours

**Phase 1: API Development (2-3 hours)**
- Create recordings list endpoint
- Create simplified send route

**Phase 2: Frontend UI (4-5 hours)**
- Create audio selection component
- Create send step component
- Update pipeline for simple mode

**Phase 3: Database Updates (1 hour)**
- Add fields to Campaign model
- Update schemas

**Phase 4: Documentation (1 hour)**
- User guide
- Update docs

---

## Cost Comparison

### Simple Mode (Current)
- **Per campaign (150 contacts):** $15.00
  - Drop Cowboy RVM: 150 × $0.10 = $15.00
  - No AI costs
  - Manual recording upload

### Full Mode (BYOC)
- **Per campaign (150 contacts):** ~$9.17
  - Drop Cowboy RVM: 150 × $0.06 = $9.00
  - Groq scripts: 150 × $0.001 = $0.15
  - 11Labs audio: 1 recording × $0.015 = $0.02
  - Cloudinary: Negligible

**Savings with BYOC:** ~$5.83 per campaign

---

## Next Steps

### Immediate (This Week)

1. ✅ **Review documentation** (you are here!)
2. **Implement simplified route**
   - Start with recordings list endpoint
   - Build recording selector component
   - Create simplified send route
3. **Test end-to-end**
   - Create campaign
   - Select recording
   - Send voicemails
   - Verify delivery

### Short-term (Next 2 Weeks)

4. **Deploy to production**
5. **Create user guide**
6. **Monitor performance**
7. **Contact Drop Cowboy about BYOC**

### Long-term (When BYOC Available)

8. **Activate full pipeline**
   - Update configuration
   - Enable `audio_url` parameter
   - Test full workflow
9. **Optional: Keep both modes**
   - Simple for quick campaigns
   - Full for personalized campaigns

---

## Questions?

### For Drop Cowboy Support

1. When can we upgrade to BYOC account?
2. What are BYOC pricing and setup costs?
3. Does BYOC support `audio_url` parameter?
4. Any upload size limits for audio files?

### For Development Team

1. Should we auto-select recording if only one exists?
2. How to handle recordings with no name?
3. Should we cache recordings list?
4. What's the max campaign size we support?

---

## Related Resources

**Drop Cowboy Documentation:**
- [RVM API Docs](https://drop-cowboy.gitbook.io/drop-cowboy-docs/api/sending-rvm-ringless-voicemail)
- [Drop Cowboy Web Portal](https://app.dropcowboy.com/media)

**Internal Documentation:**
- [Campaign Architecture](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)
- [Campaign Action Plan](./CAMPAIGN_STRATEGY_ACTION_PLAN.md)
- [Campaign UI README](./CAMPAIGNS_UI_README.md)

**Code Locations:**
- API Routes: `src/app/api/campaigns/`
- Components: `src/app/campaigns/[id]/components/`
- Models: `src/models/`
- Services: `src/lib/services/`

---

## Document Changelog

- **2026-01-07:** Initial documentation created
  - Discovered Drop Cowboy API limitation
  - Designed dual-route architecture
  - Created 4 comprehensive documents
  - Updated campaign architecture doc
  - Ready for implementation

---

**Created:** 2026-01-07
**Author:** AI Development Team
**Status:** Ready for Implementation
**Priority:** High - Unblocks voicemail campaigns

---

## Summary

We discovered a Drop Cowboy API limitation that prevents programmatic audio upload. Instead of abandoning our work, we designed a **dual-route architecture** that:

1. **Solves the immediate problem** with a simplified workflow (ready to implement)
2. **Preserves our valuable work** for future BYOC activation (all code intact)
3. **Provides a clear path forward** with detailed documentation and action plans

All documentation is complete and ready. Time to implement! 🚀
