#!/bin/bash

# Source environment
cd "$(dirname "$0")"
source .env.local

# Get chatRealty board ID
echo "Finding chatRealty board..."
BOARDS=$(curl -s "https://api.trello.com/1/members/me/boards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,id")
BOARD_ID=$(echo "$BOARDS" | grep -i "chatrealty" -A 1 | grep '"id"' | cut -d'"' -f4)

if [ -z "$BOARD_ID" ]; then
  echo "❌ Could not find chatRealty board"
  exit 1
fi

echo "✅ Found board: $BOARD_ID"

# Get Developer Tasks list ID
echo "Finding Developer Tasks list..."
LISTS=$(curl -s "https://api.trello.com/1/boards/${BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,id")
LIST_ID=$(echo "$LISTS" | grep -i "developer" -A 1 | grep '"id"' | cut -d'"' -f4)

if [ -z "$LIST_ID" ]; then
  echo "❌ Could not find Developer Tasks list"
  echo "Available lists:"
  echo "$LISTS"
  exit 1
fi

echo "✅ Found list: $LIST_ID"

# Create cards
echo ""
echo "Creating cards..."

# Card 1: Chat Error Handling
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
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
- src/app/components/chat/ChatWidget.tsx" > /dev/null

echo "✅ Card 1: Chat Error Handling"

# Card 2: Mobile Chat Scroll
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
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
- src/app/components/chat/ChatWidget.tsx (message container CSS)
- src/app/components/chat/ChatProvider.tsx

**Fix Pattern:**
\`\`\`css
.messages-container {
  display: flex;
  flex-direction: column; /* NOT column-reverse */
  overflow-y: auto;
  scroll-behavior: smooth;
}
\`\`\`" > /dev/null

echo "✅ Card 2: Mobile Chat Scroll"

# Card 3: Swipe Queue Refactor
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🔴 Listing Swipe Queue Refactor" \
  -d "desc=**Priority:** Critical

**Description:** Bottom panel swipe queue not functioning correctly - shows wrong next/previous listings.

**Tasks:**
- [ ] Create ListingQueueManager class with prefetch logic
- [ ] Implement sliding window (20 listings in memory)
- [ ] Prefetch next batch when user reaches listing #8
- [ ] Handle edge cases (first/last listing)
- [ ] Test with various query filters

**Files:**
- Create: src/lib/utils/listing-queue-manager.ts
- Update: src/app/components/chat/ChatWidget.tsx
- Update: src/lib/chat/tool-executor.ts" > /dev/null

echo "✅ Card 3: Swipe Queue Refactor"

# Card 4: Map & AI Sync
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Map & AI Event Sync" \
  -d "desc=**Priority:** High

**Description:** Map should auto-update to searched area while AI is generating results, even when map is hidden.

**Tasks:**
- [ ] Create event emitter system in src/lib/events/map-sync.ts
- [ ] Emit location events from AI tool executor
- [ ] Listen to events in MapView component
- [ ] Implement geocoding for city → lat/lng
- [ ] Test with city, subdivision, address queries

**Technical:**
- AI emits centerOnLocation event when user searches location
- Map listens and centers/zooms immediately (even if hidden)
- Works while AI is still generating response

**Files:**
- Create: src/lib/events/map-sync.ts
- Update: src/lib/chat/tool-executor.ts
- Update: src/app/components/mls/map/MapView.tsx
- Create: src/lib/utils/geocode-location.ts" > /dev/null

echo "✅ Card 4: Map & AI Sync"

# Card 5: Neighborhoods Expansion
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhoods Directory Expansion" \
  -d "desc=**Priority:** High

**Description:** Completely update neighborhoods directory with expanded dataset and metadata.

**Tasks:**
- [ ] Audit current neighborhoods in database
- [ ] Source comprehensive neighborhood/subdivision data
- [ ] Create migration script for new neighborhoods
- [ ] Add metadata (schools, amenities, demographics)
- [ ] Generate SEO-friendly neighborhood pages
- [ ] Add neighborhood images and boundary maps

**Data Sources:**
- MLS subdivision data
- County GIS boundaries
- Census tract data

**Files:**
- src/models/neighborhood.ts - Expand schema
- Create: src/scripts/neighborhoods/import-comprehensive-data.ts
- Update: src/app/neighborhoods/[slug]/page.tsx" > /dev/null

echo "✅ Card 5: Neighborhoods Expansion"

# Card 6: Neighborhood Chat
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhood Chat Integration" \
  -d "desc=**Priority:** High

**Description:** Add neighborhood query functionality to AI chat.

**Tasks:**
- [ ] Create queryNeighborhood AI tool
- [ ] Fetch neighborhood stats and metadata
- [ ] Display neighborhood info card in chat
- [ ] Show active listings in neighborhood
- [ ] Link to full neighborhood page
- [ ] Handle misspellings of neighborhood names

**Files:**
- src/lib/chat/tools.ts
- src/lib/chat/tool-executor.ts
- src/lib/chat/system-prompt.ts" > /dev/null

echo "✅ Card 6: Neighborhood Chat"

# Card 7: Neighborhood Info Panels
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhood Info Panels" \
  -d "desc=**Priority:** High

**Description:** Show neighborhood context in listing detail panels.

**Tasks:**
- [ ] Add neighborhood section to ListingBottomPanel
- [ ] Fetch neighborhood data based on listing subdivision
- [ ] Display key stats (median price, schools, amenities)
- [ ] Add View Neighborhood button
- [ ] Handle listings without subdivision data

**Files:**
- src/app/components/mls/map/ListingBottomPanel.tsx
- Create: src/lib/queries/neighborhoods.ts" > /dev/null

echo "✅ Card 7: Neighborhood Info Panels"

# Card 8: Neighborhood Favorites
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 Neighborhood Favorites" \
  -d "desc=**Priority:** High

**Description:** Allow users to favorite entire neighborhoods and get alerts for new listings.

**Tasks:**
- [ ] Add favoriteNeighborhoods array to User model
- [ ] Create Favorite Neighborhood button
- [ ] Display favorite neighborhoods in dashboard
- [ ] Show listing count + recent activity per neighborhood
- [ ] Send notifications for new listings in favorites
- [ ] Allow unfavoriting

**Files:**
- src/models/User.ts
- Create: src/app/components/favorites/NeighborhoodFavorites.tsx
- Create: src/app/api/favorites/neighborhoods/route.ts
- src/app/dashboard/favorites/page.tsx" > /dev/null

echo "✅ Card 8: Neighborhood Favorites"

# Card 9: AI Stress Testing
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟠 AI Stress Testing" \
  -d "desc=**Priority:** High

**Description:** Comprehensive stress test to ensure AI functions correctly after series of messages.

**Tasks:**
- [ ] Create automated test suite with 50 consecutive messages
- [ ] Test context retention across 20+ messages
- [ ] Verify response times don't degrade
- [ ] Monitor memory usage over time
- [ ] Test concurrent users (10+ simultaneous chats)
- [ ] Document failure modes and recovery patterns

**Test Scenarios:**
- Context retention (10 follow-up questions)
- Mixed queries (listings, neighborhoods, CMAs)
- Error recovery (invalid → valid queries)
- Large result sets (100+ listings)
- Complex filters (5+ simultaneous filters)

**Files:**
- Create: tests/stress/ai-chat-stress.test.ts" > /dev/null

echo "✅ Card 9: AI Stress Testing"

# Card 10: Drag to Select
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 Drag to Select Properties" \
  -d "desc=**Priority:** Medium

**Description:** Implement drag-to-select on map for multi-property selection.

**Tasks:**
- [ ] Integrate Mapbox Draw plugin
- [ ] Implement rectangle selection mode
- [ ] Detect listings within selection bounds
- [ ] Highlight selected properties
- [ ] Add Add Selected to Favorites button
- [ ] Add Compare Selected button
- [ ] Support mobile (long-press + drag)

**Files:**
- src/app/components/mls/map/MapView.tsx
- Create: src/lib/utils/geospatial-selection.ts" > /dev/null

echo "✅ Card 10: Drag to Select"

# Card 11: Selected Properties Update
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 Update Selected Properties (Favorites)" \
  -d "desc=**Priority:** Medium

**Description:** Improve multi-select UI in favorites panel with bulk actions.

**Tasks:**
- [ ] Add checkbox selection mode
- [ ] Implement select all / deselect all
- [ ] Bulk delete selected
- [ ] Move selected to folders
- [ ] Export selected to PDF/CSV
- [ ] Compare properties side-by-side
- [ ] Show selection count badge

**Files:**
- src/app/components/favorites/FavoritesList.tsx
- src/app/dashboard/favorites/page.tsx
- Create: src/app/components/favorites/BulkActions.tsx" > /dev/null

echo "✅ Card 11: Selected Properties Update"

# Card 12: AI Auto-CMA
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 AI Auto-CMA" \
  -d "desc=**Priority:** Medium

**Description:** AI automatically generates Comparative Market Analysis when viewing listings.

**Tasks:**
- [ ] Create generateCMA AI tool
- [ ] Query unified_closed_listings for sold comps
- [ ] Match by location (1 mile), sqft (±20%), beds/baths
- [ ] Filter last 6 months of sales
- [ ] Calculate price per sqft analysis
- [ ] Display CMA card in chat
- [ ] Link to full CMA report page
- [ ] Save CMA to dashboard

**Comp Criteria:**
- Within 1 mile radius
- Living area ±20%
- Same beds/baths
- Same property type
- Sold in last 6 months
- Sort by recency

**Files:**
- Create: src/lib/analytics/cma-generator.ts
- Update: src/lib/chat/tools.ts
- Create: src/app/components/chat/CMACard.tsx
- Create: src/app/cma/[id]/page.tsx" > /dev/null

echo "✅ Card 12: AI Auto-CMA"

# Card 13: User-Selected CMA
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟡 User-Selected CMA" \
  -d "desc=**Priority:** Medium

**Description:** Allow users to manually select comps and customize CMA reports.

**Tasks:**
- [ ] Add Add to CMA button on closed listings
- [ ] Create CMA builder interface
- [ ] Drag and drop comps to reorder
- [ ] Remove/replace comps
- [ ] Adjust weights for each comp
- [ ] Generate PDF report
- [ ] Save custom CMA to dashboard
- [ ] Share CMA via shareable link

**User Flow:**
1. Click Create CMA from listing
2. AI suggests comps
3. User adds/removes/reorders comps
4. User adjusts parameters
5. Generate final report

**Files:**
- Create: src/app/cma/builder/page.tsx
- Create: src/app/components/cma/CMABuilder.tsx
- Create: src/app/api/cma/generate-pdf/route.ts" > /dev/null

echo "✅ Card 13: User-Selected CMA"

# Card 14: Voicemail Drops
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 Voicemail Drops Integration (Post-Launch)" \
  -d "desc=**Priority:** Low (Post-Launch)

**Description:** Implement automated voicemail drop system for lead follow-up.

**Tasks:**
- [ ] Research Slybroadcast or similar service
- [ ] Set up API integration
- [ ] Create voicemail templates
- [ ] Trigger from CRM workflows
- [ ] Track delivery and responses
- [ ] Activity logging" > /dev/null

echo "✅ Card 14: Voicemail Drops"

# Card 15: Twilio SMS
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 Twilio SMS Integration (Post-Launch)" \
  -d "desc=**Priority:** Low (Post-Launch)

**Description:** Two-way SMS messaging with leads via Twilio.

**Tasks:**
- [ ] Set up Twilio account and phone number
- [ ] Create send/receive API endpoints
- [ ] Build SMS conversation UI in dashboard
- [ ] Create SMS templates
- [ ] Implement conversation threading
- [ ] Add auto-response rules

**Files:**
- Create: src/app/api/sms/send/route.ts
- Create: src/app/api/sms/webhook/route.ts
- Create: src/app/dashboard/messages/page.tsx" > /dev/null

echo "✅ Card 15: Twilio SMS"

# Card 16: AI Twilio Webhook
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 AI Twilio Webhook (Post-Launch)" \
  -d "desc=**Priority:** Low (Post-Launch)

**Description:** AI-powered SMS auto-responses via Twilio webhook.

**Tasks:**
- [ ] Create Twilio webhook endpoint
- [ ] Integrate AI with conversation context
- [ ] Generate contextual responses
- [ ] Add optional human review queue
- [ ] Implement auto-respond for common questions
- [ ] Track AI response accuracy

**Flow:**
1. SMS arrives → Twilio webhook
2. Webhook triggers AI with context
3. AI generates response
4. (Optional) Human approval
5. Send via Twilio" > /dev/null

echo "✅ Card 16: AI Twilio Webhook"

# Card 17: AI Results Pages
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 AI-Generated Results Pages (Post-Launch)" \
  -d "desc=**Priority:** Low (Post-Launch)

**Description:** Dynamically generate custom listing results pages for leads.

**Tasks:**
- [ ] Create dynamic results page generator
- [ ] AI creates personalized collections
- [ ] Generate shareable URLs
- [ ] Track page views and engagement
- [ ] Add lead capture forms
- [ ] Email notification when lead views page

**Use Case:**
Agent: Send me a results page for 3-bed homes under \$600k in Palm Desert
System: Creates /results/palm-desert-3bed-600k" > /dev/null

echo "✅ Card 17: AI Results Pages"

# Card 18: Contact Cleanup
curl -s -X POST "https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" \
  -d "idList=${LIST_ID}" \
  -d "name=🟢 Contact Cleanup Swipe App (Post-Launch)" \
  -d "desc=**Priority:** Low (Post-Launch)

**Description:** Tinder-style swipe interface for cleaning up CRM contacts.

**Tasks:**
- [ ] Build swipe card interface
- [ ] Swipe right: Keep contact
- [ ] Swipe left: Archive/delete
- [ ] Swipe up: Merge duplicate
- [ ] Swipe down: Flag for review
- [ ] Add bulk cleanup mode
- [ ] Export cleanup summary

**Files:**
- Create: src/app/dashboard/contacts/cleanup/page.tsx
- Create: src/app/components/contacts/SwipeCard.tsx" > /dev/null

echo "✅ Card 18: Contact Cleanup"

echo ""
echo "================================================"
echo "✅ Successfully created 18 cards in Developer Tasks!"
echo "================================================"
echo ""
echo "Cards created:"
echo "  🔴 Critical Bugs: 3 cards"
echo "  🟠 High Priority: 6 cards"
echo "  🟡 Medium Priority: 4 cards"
echo "  🟢 Post-Launch: 5 cards"
echo ""
echo "Check your chatRealty board → Developer Tasks list"
