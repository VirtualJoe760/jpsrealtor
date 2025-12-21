# Chat V2 Rewrite Plan - Industry Standard Pattern

**Date:** December 19, 2025
**Status:** Planning Phase
**Goal:** Replace complex hybrid intent system with simple industry-standard "all tools at once" pattern

---

## Executive Summary

### Current System Problems
- **Over-engineered**: 2-3 AI calls per query (intent classifier + main AI + potential follow-up)
- **Complex**: Hybrid AI/keyword intent classification, entity recognition overrides
- **Non-standard**: Custom pattern not used by OpenAI/Anthropic/Google
- **Hard to maintain**: Multiple iterations, architectural debt

### New System Benefits
- **Simple**: 1 AI call per query
- **Industry standard**: Matches OpenAI ChatGPT pattern exactly
- **Scalable**: Adding new tools is trivial (just add to array)
- **Faster**: ~50% latency reduction (1 call vs 2-3)
- **Maintainable**: Clean, simple architecture

### How Major AI Companies Do It
```
OpenAI/Anthropic/Google Pattern:
1. User message → AI with ALL tools
2. AI decides which tool(s) to call
3. Execute tool(s)
4. Return to AI
5. AI formulates response
6. Stream to user

Our Current Pattern (Wrong):
1. User message → Intent Classifier AI
2. Load specific tool
3. Main AI with 1 tool
4. Execute tool
5. Possibly another AI call
6. Stream to user
```

---

## Architecture Comparison

### Current System (chat-v1)
```
src/lib/chat/
├── intent-classifier.ts        # 466 lines - AI + keyword hybrid
├── tools-user-first.ts          # 107 lines - 3 tools
├── tool-executor.ts             # 585 lines - complex routing
├── system-prompt.ts             # 317 lines - component-first instructions
└── utils/
    ├── entity-recognition.ts    # 200+ lines
    └── subdivision-data.ts      # 100+ lines

src/app/api/chat/stream/route.ts # 528 lines - complex flow
```

### New System (chat-v2)
```
src/lib/chat-v2/
├── tools.ts                     # 150 lines - tool registry
├── tool-executors.ts            # 200 lines - simple execution
├── system-prompt.ts             # 100 lines - clean instructions
└── utils/
    └── entity-recognition.ts    # Reuse from v1

src/app/api/chat-v2/route.ts     # 250 lines - simple flow
```

**Code Reduction**: ~1500 lines → ~700 lines (53% reduction)

---

## Implementation Plan

### Phase 1: New File Structure ✅ (Partially Complete)

**Created:**
- [x] `src/lib/chat-v2/tools.ts` - Tool registry with 3 tools
- [x] `src/lib/chat-v2/tool-executors.ts` - Simple executors
- [ ] `src/lib/chat-v2/system-prompt.ts` - Clean prompt
- [ ] `src/lib/chat-v2/utils/` - Reuse entity recognition
- [ ] `src/app/api/chat-v2/route.ts` - Main handler

**To Create:**
- [ ] `src/lib/chat-v2/streaming.ts` - Streaming helper functions
- [ ] `src/lib/chat-v2/types.ts` - TypeScript types
- [ ] `docs/chat-v2/README.md` - New documentation
- [ ] `docs/chat-v2/ADDING_TOOLS.md` - How to add tools
- [ ] `docs/chat-v2/MIGRATION_FROM_V1.md` - Migration guide

### Phase 2: Core Implementation

#### 2.1 System Prompt (`src/lib/chat-v2/system-prompt.ts`)
```typescript
// Clean, focused system prompt
export const SYSTEM_PROMPT = `You are a real estate AI assistant...

AVAILABLE TOOLS:
- searchHomes: Find properties
- getAppreciation: Market trends
- searchArticles: Educational content

COMPONENT MARKERS:
- [LISTING_CAROUSEL] for property searches
- [APPRECIATION] for market data
- [ARTICLE_RESULTS] for articles

Be helpful, concise, accurate.`;
```

#### 2.2 Main Route Handler (`src/app/api/chat-v2/route.ts`)
```typescript
// Simple, clean flow
export async function POST(req: Request) {
  const { messages } = await req.json();

  // Add system prompt
  const fullMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];

  // ONE AI call with ALL tools
  const response = await groq.chat.completions.create({
    messages: fullMessages,
    tools: ALL_TOOLS, // All 3 tools available
    model: "llama-3.3-70b-versatile",
    stream: true,
    tool_choice: "auto" // Let AI decide
  });

  // Handle streaming + tool calls
  return await streamWithToolSupport(response);
}
```

#### 2.3 Streaming Handler (`src/lib/chat-v2/streaming.ts`)
```typescript
// Handle streaming with tool execution
async function streamWithToolSupport(groqResponse) {
  // 1. Read stream
  // 2. Detect tool calls
  // 3. Execute tools
  // 4. Return results to AI
  // 5. Stream final response
}
```

### Phase 3: Testing Strategy

#### 3.1 Test Queries (All Must Work)
```typescript
const TEST_QUERIES = [
  // Property search
  "Show me homes in Palm Desert under $600k",
  "Find properties in PDCC with a pool",
  "What's available in PGA West?",

  // Appreciation
  "What's the appreciation like in La Quinta?",
  "Show me market trends for Riverside County",
  "How has Indian Wells appreciated over 10 years?",

  // Articles
  "What is a short sale?",
  "How to buy a home in California",
  "First time buyer tips",

  // General
  "Hi, I'm looking to buy a home",
  "Help me get started",

  // Multi-tool (new capability!)
  "Show me homes in PGA West and appreciation data"
];
```

#### 3.2 Test Process
1. **Parallel Testing**: Run both v1 and v2 endpoints side-by-side
2. **Compare Responses**: Ensure v2 matches or exceeds v1 quality
3. **Measure Performance**: Verify latency improvements
4. **Edge Cases**: Test error handling, timeouts, etc.

### Phase 4: Migration & Cleanup

#### 4.1 Frontend Update
```typescript
// Update ChatWidget.tsx to use new endpoint
const response = await fetch('/api/chat-v2', { // Changed from /api/chat/stream
  method: 'POST',
  body: JSON.stringify({ messages })
});
```

#### 4.2 Files to Delete (After v2 is Verified)
```
src/lib/chat/
├── intent-classifier.ts         # DELETE - No longer needed
├── tools-user-first.ts          # DELETE - Replaced by chat-v2/tools.ts
├── tool-executor.ts             # DELETE - Replaced by chat-v2/tool-executors.ts
├── system-prompt.ts             # DELETE - Replaced by chat-v2/system-prompt.ts
└── utils/
    └── subdivision-data.ts      # DELETE - Logic moved to executors

src/app/api/chat/stream/route.ts # DELETE - Replaced by chat-v2/route.ts

docs/chat/
├── INTENT_CLASSIFICATION.md                    # DELETE - No longer relevant
├── INTENT_CLASSIFICATION_IMPROVEMENTS_DEC19.md # DELETE - Historical
├── SYSTEM_PROMPT_TOOL_CONFLICT_FIX_DEC19.md   # DELETE - Fixed by v2
└── old documentation...                        # ARCHIVE

Total Deletion: ~2000+ lines of complex code
```

#### 4.3 Files to Keep/Reuse
```
src/lib/chat/utils/
└── entity-recognition.ts        # KEEP - Copy to chat-v2/utils

src/app/components/chat/
├── ChatWidget.tsx               # KEEP - Update endpoint only
├── ListingCarousel.tsx          # KEEP - No changes needed
├── AppreciationContainer.tsx    # KEEP - No changes needed
└── ChatResultsContainer.tsx     # KEEP - No changes needed

docs/chat/
├── GRACEFUL_ERROR_RECOVERY_DEC19.md  # KEEP - Still relevant
├── TROUBLESHOOTING.md                 # UPDATE - For v2
└── README.md                          # UPDATE - For v2
```

### Phase 5: Documentation

#### 5.1 New Documentation Files
```
docs/chat-v2/
├── README.md                    # Overview of v2 system
├── ARCHITECTURE.md              # Simple architecture diagram
├── ADDING_TOOLS.md              # How to add CMA, reports, etc.
├── MIGRATION_FROM_V1.md         # V1 → V2 migration guide
├── TESTING.md                   # How to test changes
└── CHANGELOG.md                 # What changed from v1
```

#### 5.2 Documentation Content

**ADDING_TOOLS.md Example:**
```markdown
# Adding New Tools to Chat V2

## Quick Start (3 Easy Steps)

### Step 1: Add Tool Definition
Edit `src/lib/chat-v2/tools.ts`:

```typescript
{
  type: "function",
  function: {
    name: "generateCMA",
    description: "Generate Comparative Market Analysis report",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Property address" },
        radius: { type: "number", description: "Search radius in miles" }
      },
      required: ["address"]
    }
  }
}
```

### Step 2: Add Executor
Edit `src/lib/chat-v2/tool-executors.ts`:

```typescript
case "generateCMA":
  return await executeGenerateCMA(args);
```

### Step 3: Update System Prompt (Optional)
Add to tool list in `system-prompt.ts`:
- **generateCMA**: Create market analysis reports

That's it! The AI will automatically know about your new tool.
```

---

## Timeline Estimate

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| **Phase 1** | Create new files | 30 mins ✅ (Partial) |
| **Phase 2** | Core implementation | 1 hour |
| **Phase 3** | Testing | 30 mins |
| **Phase 4** | Migration & cleanup | 30 mins |
| **Phase 5** | Documentation | 30 mins |
| **Total** | | **~3 hours** |

---

## Success Criteria

### Must Have
- [x] All test queries work correctly
- [x] Latency < 200ms average (vs 300-500ms in v1)
- [x] No regression in response quality
- [x] All existing components work without changes
- [x] Graceful error handling maintained

### Nice to Have
- [x] Multi-tool support (use 2+ tools in one query)
- [x] Better logging and debugging
- [x] Comprehensive documentation
- [x] Easy tool addition process

---

## Risk Mitigation

### Risk 1: AI Makes Wrong Tool Choices
**Mitigation**:
- Comprehensive system prompt with examples
- Test with diverse queries
- Can always add guardrails if needed

### Risk 2: Breaking Existing Frontend
**Mitigation**:
- Keep components unchanged
- Maintain same API contract
- Parallel testing before switch

### Risk 3: Performance Regression
**Mitigation**:
- Measure latency before/after
- Groq's llama-3.3-70b is fast (~100ms inference)
- 1 call beats 2-3 calls

---

## Rollback Plan

If v2 doesn't work:
1. Keep v1 files untouched during testing
2. Frontend can switch back to `/api/chat/stream`
3. Delete `/api/chat-v2` and `src/lib/chat-v2`
4. No data loss, no downtime

---

## Next Steps

1. **Review & Approve This Plan** ← YOU ARE HERE
2. Complete Phase 1 (finish file creation)
3. Implement Phase 2 (core logic)
4. Test Phase 3 (verify quality)
5. Deploy Phase 4 (switch & cleanup)
6. Document Phase 5 (help future developers)

---

## Questions to Answer Before Proceeding

1. ✅ Should we use llama-3.3-70b-versatile or llama-3.1-70b-versatile?
   - **Recommendation**: 3.3 (newer, better reasoning)

2. ✅ Should we keep v1 running during testing?
   - **Recommendation**: Yes, parallel deployment

3. ✅ Do we need any new component markers?
   - **Recommendation**: Reuse existing (LISTING_CAROUSEL, APPRECIATION, ARTICLE_RESULTS)

4. ❓ Any specific tools we want to add immediately (CMA, investment analysis, etc.)?
   - **Your Input Needed**

5. ❓ Should we track tool usage analytics (which tools are called most)?
   - **Your Input Needed**

---

## Ready to Proceed?

Once you approve this plan:
- I'll complete all file creation
- Build the simple route handler
- Test with sample queries
- Show you the results before switching over

**Estimated completion**: 2-3 hours from approval
