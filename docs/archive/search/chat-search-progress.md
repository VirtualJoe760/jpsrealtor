# Chat Search & Listing Detail — Progress Report

**Branch:** `chatlistings`
**Date:** 2026-05-02
**Status:** In progress — waiting on backend search index build

---

## What Was Built

### Chat Tools (5 new tools added to chat-v2)

| Tool | Purpose | Status |
|------|---------|--------|
| `getListingDetails` | Look up a specific listing by address | Working |
| `generateCMA` | Generate CMA report for a property | Working |
| `askClarification` | Ask user a clarifying question with clickable buttons | Working |
| `searchHomes` | (existing) Area/neighborhood search | Was being called incorrectly for street queries — fixed |
| `getAppreciation` | (existing) Market trends | Unchanged |
| `searchArticles` | (existing) Educational content | Unchanged |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| `ListingDetailCard` | `src/app/components/chat/ListingDetailCard.tsx` | Photo carousel + stat grid + action buttons, renders above AI message |
| `ListingOptionsCard` | `src/app/components/chat/ListingOptionsCard.tsx` | Multi-match listing picker with thumbnails, renders below AI message |
| `ClarificationCard` | `src/app/components/chat/ClarificationCard.tsx` | Interactive button UI for AI clarifying questions |
| `ChatInput` autocomplete | `src/app/components/chat/ChatInput.tsx` | Search-as-you-type dropdown using `/api/listings/quick-search` |

### API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/listings/quick-search?q=...` | Fast autocomplete for chat input (temporary — will be replaced by search_index) |

### Key Architecture Decisions

- **Component-first pattern**: Tools return identifiers, frontend components fetch their own data
- **Multi-match flow**: When address matches multiple listings, shows option cards instead of picking one
- **ListingDetailCard above message**: Photo carousel + stats render before the AI's text
- **CMA in chat**: Uses existing `CMAReport` component via dynamic import
- **Pre-routing**: Chat API route detects street patterns and forces `getListingDetails` tool (bypasses AI's tool selection for speed)
- **Second AI call skip**: For `listingOptions` and `clarification` results, sends canned text instead of waiting for Groq

---

## What's Working

1. **Listing detail in chat** — "Tell me about 77095 Desi Drive" shows photo carousel, stat grid, key features, community links, Generate CMA button
2. **Multi-match** — "desi drive indian wells" finds 3 listings and shows clickable option cards
3. **CMA generation** — "Generate a CMA for 77095 Desi Drive" renders full CMAReport inline in chat
4. **Clarification** — AI can ask multiple-choice questions with clickable buttons
5. **Autocomplete** — Typing in chat input shows matching listings/cities/subdivisions

---

## What Needs Work

### Blocking: Search Index (backend task)

The autocomplete is currently slow (~500ms-5s) because it queries `unified_listings` with regex. The fix is a pre-built `search_index` MongoDB collection with a text index.

**Full spec:** `docs/search/SEARCH_INDEX_BUILDER.md`

**Backend needs to:**
1. Build `src/scripts/mls/backend/build_search_index.py`
2. Run it to populate `search_index` collection
3. Add to VPS cron pipeline (after photos step)

**Frontend needs to (after backend is done):**
1. Update `/api/listings/quick-search/route.ts` to use `$text` search on `search_index`
2. Update `SearchResult` interface in `ChatInput.tsx` to match new schema
3. Expected result: <50ms autocomplete for any query

### Non-blocking improvements (future)

- **Listing photos in autocomplete** — `primaryPhotoUrl` is often null on listings. The search index should include a computed photo URL from the media array
- **Smarter debounce** — Currently 250ms; could increase to 350ms to reduce API calls while typing
- **Autocomplete on map variant** — Currently only works on landing + conversation chat input variants
- **"Show similar homes" flow** — When viewing a listing detail, AI offers to show similar homes but doesn't yet call searchHomes automatically with the right subdivision filter

---

## Files Modified (from main)

### New files
- `src/app/components/chat/ListingDetailCard.tsx`
- `src/app/components/chat/ListingOptionsCard.tsx`
- `src/app/components/chat/ClarificationCard.tsx`
- `src/app/api/listings/quick-search/route.ts`
- `docs/search/SEARCH_INDEX_BUILDER.md`
- `docs/search/chat-search-progress.md`

### Modified files
- `src/lib/chat-v2/tools.ts` — Added 3 new tool definitions
- `src/lib/chat-v2/tool-executors.ts` — Added executors + shared `findListingByAddress` helper
- `src/lib/chat-v2/streaming.ts` — Component mapping + skip second AI call logic
- `src/lib/chat-v2/system-prompt.ts` — Tool routing, response formats, CMA/clarification instructions
- `src/app/api/chat-v2/route.ts` — Pre-routing regex for street address detection
- `src/app/components/chat/ChatProvider.tsx` — ComponentData: listingDetail, listingOptions, clarification, cmaReport
- `src/app/components/chat/ChatWidget.tsx` — Marker stripping, ListingDetailCard/Options/Clarification rendering
- `src/app/components/chat/ChatInput.tsx` — Autocomplete search-as-you-type
- `src/app/components/chat/ChatResultsContainer.tsx` — CMAReport rendering

---

## Commits on Branch (13)

```
6b93f03a docs: search index builder prompt for backend + frontend Claude
24caf9d1 fix: autocomplete matches slug segment boundaries, not substrings
d79cc79f perf: fast autocomplete endpoint for chat input
9f46ae7e feat: autocomplete search in chat input
c156bb19 perf: prefix-anchored regex for slug lookups (uses index)
aa5e00c8 perf: skip second AI call for multi-match + clarification responses
ab6ea918 fix: listing options thumbnails + xxl padding
8b55037d fix: render listing options below message text, not above
5a73be06 fix: force getListingDetails for street address queries at route level
36419ea7 feat: askClarification tool with interactive button UI
7aa35756 perf: optimize getListingDetails with timing logs and sort
1aa4b79f fix: route street address queries to getListingDetails, not searchHomes
345754de feat: chat listing detail tool, CMA tool, multi-match options
```

---

## Resume Instructions

When coming back:
1. Check if backend Claude has built `build_search_index.py` and populated the collection
2. If yes → update `quick-search/route.ts` to use `$text` search (code in SEARCH_INDEX_BUILDER.md)
3. Test autocomplete speed — should be <50ms
4. Merge `chatlistings` to `main` when ready
