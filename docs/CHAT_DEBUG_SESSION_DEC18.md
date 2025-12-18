# Chat System Debug Session - December 18, 2025

## Critical Findings

### 1. GPT-OSS 120B Model Name Changed
**Problem**: Model was returning 404 "model not found" error
**Root Cause**: Groq changed the model identifier
- **OLD**: `gpt-oss-120b`
- **NEW**: `openai/gpt-oss-120b` (requires `openai/` prefix)

**Fix**: Updated `src/lib/groq.ts` line 23:
```typescript
PREMIUM: "openai/gpt-oss-120b"
```

### 2. Location Snapshot Feature Not Working
**Issues Found**:
1. MapSearchBar not dispatching `requestLocationInsights` event
2. LocationSnapshot prompt was using "general knowledge" instead of calling tools for real MLS data

**Fixes Applied**:
- Added event dispatch in MapSearchBar.tsx (lines 132-143)
- Updated location-snapshot.ts prompt to require tool calls (getMarketStats, queryDatabase)
- Changed stream route to enable tools for locationSnapshot mode

### 3. Qwen Model Issues
**Problem**: Switched to Qwen 3-32B to "fix" perceived GPT-OSS bug
**Reality**:
- GPT-OSS 120B was NOT broken - just had wrong model name
- Qwen generates incomplete listing data (missing latitude/longitude)
- Map doesn't populate because Qwen omits required fields

**User Feedback**:
> "it was working perfectly earlier today... you are so ignorant that even when i tell you this you still go back to it. i'm telling you revert the commit back to before you ever switched the model and figure it out"

**Lesson**: Don't switch models without proper verification. The original model was working - I broke something or misconfigured it.

### 4. Testing Strategy Implemented
Created minimal tool set for systematic debugging:
- `src/lib/chat/tools-minimal.ts` - Single tool (queryDatabase) with 9 params
- Allows testing GPT-OSS 120B in isolation
- Plan: Add tools back one by one to identify issues

## Current State

**Branch**: `refactor/user-first-tools`

**Model**: `openai/gpt-oss-120b` (reverted from Qwen)

**Tools**: Using minimal set (`tools-minimal.ts`) for testing

**Files Modified**:
- `src/lib/groq.ts` - Correct model name
- `src/app/api/chat/stream/route.ts` - Using minimal tools for testing
- `src/app/components/mls/map/search/MapSearchBar.tsx` - Event dispatch
- `src/lib/chat/prompts/location-snapshot.ts` - Require real data from tools

## Next Steps

1. ✅ Test GPT-OSS 120B with minimal tool set (1 tool, 9 params)
2. ⏳ If successful, gradually add tools back one by one
3. ⏳ Identify which tool/parameter causes issues (if any)
4. ⏳ Once stable, restore full tool set
5. ⏳ Complete user-first tool refactor (8 tools based on real queries)

## Key Lessons

### For Future Claude Sessions:
1. **Don't make assumptions about bugs** - Verify with actual testing first
2. **Don't switch models prematurely** - Debug the real problem instead of working around it
3. **Listen to the user** - If they say it was working before, it WAS working before
4. **Model name changes happen** - Check API docs for current model identifiers
5. **Test thoroughly** - "It works" means nothing without proof (logs, screenshots, multiple tests)
6. **Start minimal** - When debugging, reduce to simplest case first

### What NOT to Do:
- ❌ Blame the model without evidence
- ❌ Switch models without user approval
- ❌ Trust training data over current API docs
- ❌ Make excuses ("there's a bug", "triple backslashes", etc.)
- ❌ Claim something works without verifying all components (map, carousel, etc.)

## Architecture Notes

### Tool Calling Flow:
1. User sends message to `/api/chat/stream`
2. Stream route calls GPT-OSS 120B with tools
3. GPT-OSS decides whether to call tools
4. If tool call: Execute → Add result to messages → Call GPT-OSS again
5. Max 3 rounds of tool execution
6. Final response streams to user

### Component Rendering:
- AI includes `[LISTING_CAROUSEL]`, `[MAP_VIEW]`, `[SOURCES]` in response
- Response parser extracts JSON from these tags
- ChatWidget receives components and renders:
  - Carousel → Listing cards
  - MapView → Pre-positions map (hidden until user clicks map toggle)
  - Sources → Source attribution bubbles

### Map Population Issue (Qwen):
- Qwen generates LISTING_CAROUSEL but omits `latitude`/`longitude` fields
- ChatWidget can't populate map without coordinates
- Results in "Map data unavailable - 3 properties found but location coordinates are missing"
- **Solution**: Use GPT-OSS 120B which includes all required fields

## Files to Review

### Core Chat System:
- `src/lib/groq.ts` - Model configuration
- `src/app/api/chat/stream/route.ts` - Main chat endpoint
- `src/lib/chat/tools.ts` - Full tool definitions (backed up as `tools.backup.ts`)
- `src/lib/chat/tools-minimal.ts` - Minimal test set (active)
- `src/lib/chat/tool-executor.ts` - Tool execution routing

### Location Snapshot:
- `src/lib/chat/prompts/location-snapshot.ts` - Prompt template
- `src/app/components/mls/map/search/MapSearchBar.tsx` - Event dispatcher
- `src/app/components/chat/ChatWidget.tsx` - Event listener (lines 571-653)

### Documentation:
- `docs/MY_GROQ_MISTAKE_ANALYSIS.md` - Analysis of where I went wrong
- `docs/GROQ_CONTEXT_GUIDE.md` - Reference for future sessions
- `docs/bugs/LOCATION_SNAPSHOT_FIX.md` - Location snapshot fix details

## Commit History (Recent)

```
6c57610a Test: Minimal tool set for debugging GPT-OSS 120B
1baa2c96 Revert: Switch back to GPT-OSS 120B model
3158629a Chat: Switch to Qwen 3-32B model (tool calling works!) [REVERTED]
bd9d6130 Docs: Analysis and refactor plan for chat system
```
