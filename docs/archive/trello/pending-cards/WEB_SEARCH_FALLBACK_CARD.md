# Trello Card: Web Search Fallback for Article Queries

**Created:** December 19, 2025
**Status:** Pending Creation

---

## Card Details

**Title:** 🟡 AI Knowledge Enhancement - Web Search Fallback

**Priority:** Medium

**List:** To Do (or appropriate AI/Chat improvements list)

**Labels:**
- 🟡 Medium
- 🤖 AI
- 🚀 Feature

---

## Description

Add web search capability as a fallback when local article database returns insufficient results. Provides users with broader, up-to-date real estate information when our articles don't cover their specific questions (e.g., utility costs, energy expenses in specific areas).

**Impact:** Better user experience for knowledge queries, reduces "no results" scenarios, positions AI as more knowledgeable without requiring exhaustive article creation.

---

## Tasks Checklist

- [ ] Sign up for Tavily API (free tier: 500 searches/month)
- [ ] Add TAVILY_API_KEY to .env.local and Cloudflare environment
- [ ] Create /api/web-search/route.ts endpoint
- [ ] Update executeSearchArticles() in tool-executor.ts for hybrid search
- [ ] Add web result formatting for AI consumption
- [ ] Update AI system prompt to handle web sources in [SOURCES] block
- [ ] Test with queries: "utility costs in Coachella Valley", "energy expenses Palm Desert"
- [ ] Add caching for web search results (10-minute TTL)
- [ ] Update chat documentation with web search architecture
- [ ] Monitor Tavily API usage and costs

---

## Technical Implementation Notes

### Architecture

**Hybrid Search Flow:**
1. Search local articles first (`/api/articles/search`)
2. If results < 2, call Tavily web search (`/api/web-search`)
3. Return combined results with source attribution
4. AI formats response with proper [SOURCES] citations

### Why Tavily?
- Optimized for AI/LLM applications
- Clean, summarized results (not raw HTML)
- 500 free searches/month (enough for testing)
- $0.001 per search after free tier
- Faster than Google Custom Search
- Better result quality for real estate topics

### Fallback Logic

```typescript
// Priority:
// 1. Local articles (authoritative, SEO-friendly)
// 2. Web search (supplemental, when local articles insufficient)

async function executeSearchArticles(args) {
  const articles = await fetchLocalArticles(args.query);

  if (articles.results.length < 2) {
    const webResults = await fetchTavilySearch(args.query);
    return {
      results: articles.results,
      webResults: webResults.results,
      source: 'hybrid'
    };
  }

  return { ...articles, source: 'articles' };
}
```

### Cost Estimation

**Expected Usage:**
- ~50 knowledge queries/day
- ~40% trigger web search fallback (20 searches/day)
- ~600 searches/month (within free tier)

**Actual Cost:** $0/month (free tier covers it)

---

## Related Files

**New Files:**
- `src/app/api/web-search/route.ts` - Tavily API integration

**Modified Files:**
- `src/lib/chat/tool-executor.ts` - Hybrid search logic (line 160)
- `src/lib/chat/prompts/sources.ts` - Add "web" source type
- `src/lib/chat/system-prompt.ts` - Update source citation instructions
- `.env.local` - Add TAVILY_API_KEY

**Documentation:**
- `docs/chat/TOOLS.md` - Update searchArticles documentation
- `docs/integrations/TAVILY.md` - New integration guide

---

## Testing Checklist

**Test Queries:**
- ✅ "What part of the desert has the best utility costs" (triggered this feature)
- ✅ "Energy costs in Coachella Valley"
- ✅ "Water expenses Palm Springs vs La Quinta"
- ✅ "Property tax rates Riverside County"
- ✅ "Best internet providers in Indian Wells"
- ✅ "Solar panel costs for desert homes"

**Expected Results:**
- Local articles returned when available (priority)
- Web results supplement when local insufficient
- Proper [SOURCES] attribution for both
- No duplicate content between sources

---

## Success Metrics

- **User Experience:** Reduced "no results" scenarios by 80%
- **Cost:** Stay within free tier ($0/month)
- **Quality:** User feedback positive on web result relevance
- **SEO:** Local articles still prioritized and cited

---

## Dependencies

**External:**
- Tavily API account (https://tavily.com/)
- API key stored in environment variables

**Internal:**
- None (feature is additive, doesn't break existing functionality)

---

## Rollout Plan

1. **Development:** Implement and test locally
2. **Staging:** Deploy to staging with test API key
3. **Production:**
   - Add production TAVILY_API_KEY to Cloudflare
   - Monitor usage for 1 week
   - Collect user feedback

---

## Automation Script

```bash
#!/bin/bash
source .env.local

BOARD_ID="wfo1DQly"
LIST_ID="<your-to-do-list-id>"

create_card_with_checklist() {
  local name="$1"
  local desc="$2"
  local priority="$3"
  shift 3
  local checklist_items=("$@")

  # Create card
  CARD_RESPONSE=$(curl -s -X POST "https://api.trello.com/1/cards" \
    -d "key=${TRELLO_API_KEY}" \
    -d "token=${TRELLO_TOKEN}" \
    -d "idList=${LIST_ID}" \
    -d "name=${name}" \
    -d "desc=**Priority:** ${priority}

${desc}")

  CARD_ID=$(echo "$CARD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  # Create checklist
  CHECKLIST_RESPONSE=$(curl -s -X POST "https://api.trello.com/1/checklists" \
    -d "key=${TRELLO_API_KEY}" \
    -d "token=${TRELLO_TOKEN}" \
    -d "idCard=${CARD_ID}" \
    -d "name=Tasks")

  CHECKLIST_ID=$(echo "$CHECKLIST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  # Add checklist items
  for item in "${checklist_items[@]}"; do
    curl -s -X POST "https://api.trello.com/1/checklists/${CHECKLIST_ID}/checkItems" \
      -d "key=${TRELLO_API_KEY}" \
      -d "token=${TRELLO_TOKEN}" \
      -d "name=${item}" > /dev/null
  done

  echo "✅ Created: $name"
}

# Create the card
create_card_with_checklist \
  "🟡 AI Knowledge Enhancement - Web Search Fallback" \
  "Add web search capability as a fallback when local article database returns insufficient results. Provides users with broader, up-to-date real estate information when our articles don't cover their specific questions (e.g., utility costs, energy expenses in specific areas).

**Impact:** Better user experience for knowledge queries, reduces \"no results\" scenarios, positions AI as more knowledgeable without requiring exhaustive article creation." \
  "Medium" \
  "Sign up for Tavily API (free tier: 500 searches/month)" \
  "Add TAVILY_API_KEY to .env.local and Cloudflare environment" \
  "Create /api/web-search/route.ts endpoint" \
  "Update executeSearchArticles() in tool-executor.ts for hybrid search" \
  "Add web result formatting for AI consumption" \
  "Update AI system prompt to handle web sources in [SOURCES] block" \
  "Test with queries: utility costs, energy expenses, etc." \
  "Add caching for web search results (10-minute TTL)" \
  "Update chat documentation with web search architecture" \
  "Monitor Tavily API usage and costs"
```

---

## Notes

- This is an **enhancement**, not a critical fix - can be scheduled flexibly
- Maintains current behavior (local articles prioritized)
- Easy to disable if needed (just skip Tavily call)
- Aligns with "Essential 4" guidelines: consolidates web search + improved intent classification into one medium-priority card
