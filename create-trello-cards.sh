#!/bin/bash
cd "$(dirname "$0")"
source .env.local

BOARD_ID="wfo1DQly"

echo "Fetching lists from chatRealty board..."
curl -s "https://api.trello.com/1/boards/${BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,id" > /tmp/lists.json

# Find "developer task" list (case insensitive)
LIST_ID=$(cat /tmp/lists.json | grep -i '"name".*developer.*task' -A 1 | grep '"id"' | cut -d'"' -f4 | head -1)

if [ -z "$LIST_ID" ]; then
  echo "❌ Could not find 'developer task' list"
  echo "Available lists:"
  cat /tmp/lists.json | grep '"name"' | cut -d'"' -f4
  exit 1
fi

echo "✅ Found list: $LIST_ID"
echo ""
echo "Creating 18 cards..."
echo ""

# Card 1: Chat Error Handling
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🔴 Chat Error Handling" \
  -d "desc=**Priority:** Critical

**Description:** Chat doesn't handle errors gracefully when AI receives questions it's not prepared to answer.

**Tasks:**
- [ ] Add try-catch blocks in src/lib/chat/tool-executor.ts
- [ ] Wrap streaming in error boundaries in src/app/api/chat/stream/route.ts
- [ ] Display user-friendly error messages in ChatWidget.tsx
- [ ] Log errors to monitoring system
- [ ] Test with edge case questions

**Files:**
- src/lib/chat/tool-executor.ts
- src/app/api/chat/stream/route.ts
- src/app/components/chat/ChatWidget.tsx" > /dev/null && echo "✅ Card 1: Chat Error Handling"

# Card 2: Mobile Scroll
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🔴 Mobile Chat Scroll Direction" \
  -d "desc=**Priority:** Critical

**Description:** AI responses push messages UP instead of DOWN on mobile, forcing user messages out of viewport.

**Tasks:**
- [ ] Fix message container flexDirection (should be column, not column-reverse)
- [ ] Implement auto-scroll to latest message
- [ ] Test on iPhone SE, Pro Max, Android devices
- [ ] Verify long responses don't break layout

**Files:**
- src/app/components/chat/ChatWidget.tsx" > /dev/null && echo "✅ Card 2: Mobile Scroll"

# Card 3: Swipe Queue
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🔴 Listing Swipe Queue Refactor" \
  -d "desc=**Priority:** Critical

**Description:** Bottom panel swipe queue not functioning correctly.

**Tasks:**
- [ ] Create ListingQueueManager class with prefetch logic
- [ ] Implement sliding window (20 listings in memory)
- [ ] Prefetch next batch when user reaches listing #8
- [ ] Handle edge cases (first/last listing)
- [ ] Test with various query filters

**Files:**
- Create: src/lib/utils/listing-queue-manager.ts
- Update: src/app/components/chat/ChatWidget.tsx" > /dev/null && echo "✅ Card 3: Swipe Queue"

# Card 4: Map & AI Sync
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Map & AI Event Sync" \
  -d "desc=**Priority:** High

**Description:** Map should auto-update to searched area while AI is generating results.

**Tasks:**
- [ ] Create event emitter system in src/lib/events/map-sync.ts
- [ ] Emit location events from AI tool executor
- [ ] Listen to events in MapView component
- [ ] Implement geocoding for city → lat/lng
- [ ] Test with city, subdivision, address queries" > /dev/null && echo "✅ Card 4: Map & AI Sync"

# Card 5: Neighborhoods Expansion
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhoods Directory Expansion" \
  -d "desc=**Priority:** High

**Description:** Update neighborhoods directory with expanded dataset and metadata.

**Tasks:**
- [ ] Audit current neighborhoods in database
- [ ] Source comprehensive neighborhood/subdivision data
- [ ] Create migration script for new neighborhoods
- [ ] Add metadata (schools, amenities, demographics)
- [ ] Generate SEO-friendly neighborhood pages" > /dev/null && echo "✅ Card 5: Neighborhoods"

# Card 6: Neighborhood Chat
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhood Chat Integration" \
  -d "desc=**Priority:** High

**Description:** Add neighborhood query functionality to AI chat.

**Tasks:**
- [ ] Create queryNeighborhood AI tool
- [ ] Fetch neighborhood stats and metadata
- [ ] Display neighborhood info card in chat
- [ ] Show active listings in neighborhood
- [ ] Link to full neighborhood page" > /dev/null && echo "✅ Card 6: Neighborhood Chat"

# Card 7: Neighborhood Panels
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhood Info Panels" \
  -d "desc=**Priority:** High

**Description:** Show neighborhood context in listing detail panels.

**Tasks:**
- [ ] Add neighborhood section to ListingBottomPanel
- [ ] Fetch neighborhood data based on listing subdivision
- [ ] Display key stats (median price, schools, amenities)
- [ ] Add View Neighborhood button" > /dev/null && echo "✅ Card 7: Neighborhood Panels"

# Card 8: Neighborhood Favorites
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhood Favorites" \
  -d "desc=**Priority:** High

**Description:** Allow users to favorite neighborhoods and get alerts.

**Tasks:**
- [ ] Add favoriteNeighborhoods array to User model
- [ ] Create Favorite Neighborhood button
- [ ] Display favorite neighborhoods in dashboard
- [ ] Show listing count + recent activity
- [ ] Send notifications for new listings" > /dev/null && echo "✅ Card 8: Neighborhood Favorites"

# Card 9: AI Stress Testing
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 AI Stress Testing" \
  -d "desc=**Priority:** High

**Description:** Stress test AI with series of messages.

**Tasks:**
- [ ] Create automated test suite with 50 consecutive messages
- [ ] Test context retention across 20+ messages
- [ ] Verify response times don't degrade
- [ ] Monitor memory usage
- [ ] Test concurrent users (10+)" > /dev/null && echo "✅ Card 9: AI Stress Testing"

# Card 10: Drag to Select
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 Drag to Select Properties" \
  -d "desc=**Priority:** Medium

**Description:** Implement drag-to-select on map.

**Tasks:**
- [ ] Integrate Mapbox Draw plugin
- [ ] Implement rectangle selection mode
- [ ] Detect listings within selection bounds
- [ ] Add bulk actions (favorites, compare)
- [ ] Support mobile (long-press + drag)" > /dev/null && echo "✅ Card 10: Drag to Select"

# Card 11: Selected Properties
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 Update Selected Properties (Favorites)" \
  -d "desc=**Priority:** Medium

**Description:** Improve multi-select UI in favorites panel.

**Tasks:**
- [ ] Add checkbox selection mode
- [ ] Select all / deselect all
- [ ] Bulk delete selected
- [ ] Move selected to folders
- [ ] Export selected to PDF/CSV
- [ ] Compare properties side-by-side" > /dev/null && echo "✅ Card 11: Selected Properties"

# Card 12: AI Auto-CMA
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 AI Auto-CMA" \
  -d "desc=**Priority:** Medium

**Description:** AI auto-generates CMA when viewing listings.

**Tasks:**
- [ ] Create generateCMA AI tool
- [ ] Query unified_closed_listings for sold comps
- [ ] Match by location (1 mile), sqft (±20%), beds/baths
- [ ] Calculate price per sqft analysis
- [ ] Display CMA card in chat
- [ ] Save CMA to dashboard" > /dev/null && echo "✅ Card 12: AI Auto-CMA"

# Card 13: User-Selected CMA
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 User-Selected CMA" \
  -d "desc=**Priority:** Medium

**Description:** Manual comp selection for custom CMAs.

**Tasks:**
- [ ] Add Add to CMA button on closed listings
- [ ] Create CMA builder interface
- [ ] Drag and drop comps to reorder
- [ ] Generate PDF report
- [ ] Share CMA via link" > /dev/null && echo "✅ Card 13: User-Selected CMA"

# Card 14: Voicemail Drops
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 Voicemail Drops (Post-Launch)" \
  -d "desc=**Priority:** Low

**Description:** Automated voicemail drop system.

**Tasks:**
- [ ] Research Slybroadcast
- [ ] Set up API integration
- [ ] Create voicemail templates
- [ ] Trigger from CRM workflows" > /dev/null && echo "✅ Card 14: Voicemail Drops"

# Card 15: Twilio SMS
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 Twilio SMS (Post-Launch)" \
  -d "desc=**Priority:** Low

**Description:** Two-way SMS messaging via Twilio.

**Tasks:**
- [ ] Set up Twilio account
- [ ] Create send/receive API endpoints
- [ ] Build SMS conversation UI
- [ ] Create SMS templates" > /dev/null && echo "✅ Card 15: Twilio SMS"

# Card 16: AI Twilio Webhook
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 AI Twilio Webhook (Post-Launch)" \
  -d "desc=**Priority:** Low

**Description:** AI-powered SMS auto-responses.

**Tasks:**
- [ ] Create Twilio webhook endpoint
- [ ] Integrate AI with conversation context
- [ ] Generate contextual responses
- [ ] Add optional human review queue" > /dev/null && echo "✅ Card 16: AI Twilio Webhook"

# Card 17: AI Results Pages
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 AI-Generated Results Pages (Post-Launch)" \
  -d "desc=**Priority:** Low

**Description:** Dynamic custom listing results pages.

**Tasks:**
- [ ] Create dynamic results page generator
- [ ] Generate shareable URLs
- [ ] Track page views
- [ ] Add lead capture forms" > /dev/null && echo "✅ Card 17: AI Results Pages"

# Card 18: Contact Cleanup
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${TRELLO_API_KEY}" \
  -d "token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 Contact Cleanup Swipe (Post-Launch)" \
  -d "desc=**Priority:** Low

**Description:** Tinder-style swipe interface for CRM contacts.

**Tasks:**
- [ ] Build swipe card interface
- [ ] Swipe right: Keep
- [ ] Swipe left: Archive/delete
- [ ] Swipe up: Merge duplicate
- [ ] Export cleanup summary" > /dev/null && echo "✅ Card 18: Contact Cleanup"

echo ""
echo "================================================"
echo "✅ Successfully created 18 cards!"
echo "================================================"
echo ""
echo "View at: https://trello.com/b/wfo1DQly/chatrealty"
