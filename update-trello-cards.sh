#!/bin/bash
cd "$(dirname "$0")"
source .env.local

BOARD_ID="wfo1DQly"
LIST_ID="69307001f0815b7abe500828"

echo "Deleting old cards..."
# Get all cards in the list
CARDS=$(curl -s "https://api.trello.com/1/lists/${LIST_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}")
CARD_IDS=$(echo "$CARDS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# Delete each card
for CARD_ID in $CARD_IDS; do
  curl -s -X DELETE "https://api.trello.com/1/cards/${CARD_ID}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" > /dev/null
done

echo "✅ Deleted old cards"
echo ""
echo "Creating new cards with proper checklists..."
echo ""

# Helper function to create card with checklist
create_card_with_checklist() {
  local name="$1"
  local desc="$2"
  local priority="$3"
  shift 3
  local checklist_items=("$@")

  # Create the card
  CARD_RESPONSE=$(curl -s -X POST "https://api.trello.com/1/cards" \
    -d "key=${TRELLO_API_KEY}" \
    -d "token=${TRELLO_TOKEN}" \
    -d "idList=${LIST_ID}" \
    -d "name=${name}" \
    -d "desc=**Priority:** ${priority}

${desc}")

  CARD_ID=$(echo "$CARD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$CARD_ID" ]; then
    echo "❌ Failed to create card: $name"
    return
  fi

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

# Card 1: Chat Error Handling
create_card_with_checklist \
  "🔴 Chat Error Handling" \
  "Chat doesn't handle errors gracefully when AI receives questions it's not prepared to answer. Users see broken/failed responses instead of friendly error messages." \
  "Critical" \
  "Add try-catch blocks in src/lib/chat/tool-executor.ts" \
  "Wrap streaming in error boundaries in src/app/api/chat/stream/route.ts" \
  "Display user-friendly error messages in ChatWidget.tsx" \
  "Log errors to monitoring system" \
  "Test with edge case questions"

# Card 2: Mobile Scroll
create_card_with_checklist \
  "🔴 Mobile Chat Scroll Direction" \
  "AI responses push messages UP instead of DOWN on mobile, forcing user messages out of viewport. Messages should progress down the screen with space below." \
  "Critical" \
  "Fix message container flexDirection (should be column, not column-reverse)" \
  "Implement auto-scroll to latest message after AI response" \
  "Test on iPhone SE, Pro Max, Android devices" \
  "Verify long responses don't break layout" \
  "Handle various mobile screen sizes gracefully"

# Card 3: Swipe Queue
create_card_with_checklist \
  "🔴 Listing Swipe Queue Refactor" \
  "Bottom panel swipe queue not functioning correctly - shows wrong next/previous listings. Need smart queue generation with database prefetching." \
  "Critical" \
  "Create ListingQueueManager class with prefetch logic" \
  "Implement sliding window (20 listings in memory)" \
  "Prefetch next batch when user reaches listing #8" \
  "Handle edge cases (first/last listing)" \
  "Maintain queue state across panel open/close" \
  "Test with various query filters (city, price range, etc.)"

# Card 4: Map & AI Sync
create_card_with_checklist \
  "🟠 Map & AI Event Sync" \
  "Map should auto-update to searched area while AI is generating results, even when map is hidden. Implement event listener pattern for AI → Map communication." \
  "High" \
  "Create event emitter system in src/lib/events/map-sync.ts" \
  "Emit location events from AI tool executor when user searches" \
  "Listen to events in MapView component" \
  "Implement geocoding for city → lat/lng lookup" \
  "Map centers/zooms immediately (even if hidden)" \
  "Test with city, subdivision, address, radius queries"

# Card 5: Neighborhoods Expansion
create_card_with_checklist \
  "🟠 Neighborhoods Directory Expansion" \
  "Completely update neighborhoods directory with expanded dataset and metadata. Add comprehensive neighborhood/subdivision coverage with SEO-friendly pages." \
  "High" \
  "Audit current neighborhoods in database" \
  "Identify missing neighborhoods in coverage area" \
  "Source comprehensive neighborhood/subdivision data (MLS, GIS, Census)" \
  "Create migration script to populate new neighborhoods" \
  "Add neighborhood metadata (schools, amenities, demographics)" \
  "Generate SEO-friendly neighborhood pages" \
  "Add neighborhood images and boundary maps"

# Card 6: Neighborhood Chat
create_card_with_checklist \
  "🟠 Neighborhood Chat Integration" \
  "Add neighborhood query functionality to AI chat. Users should be able to ask 'Tell me about La Quinta Cove' and get stats, listings, and info." \
  "High" \
  "Add queryNeighborhood tool to AI in src/lib/chat/tools.ts" \
  "Implement neighborhood query in src/lib/chat/tool-executor.ts" \
  "Fetch neighborhood metadata and stats from database" \
  "Display neighborhood info card in chat" \
  "Show active listings in neighborhood" \
  "Link to full neighborhood page" \
  "Handle misspellings/variations of neighborhood names"

# Card 7: Neighborhood Panels
create_card_with_checklist \
  "🟠 Neighborhood Info Panels" \
  "Add neighborhood context to listing info panels. When viewing a listing, show neighborhood info, stats, amenities, and schools." \
  "High" \
  "Add neighborhood section to ListingBottomPanel component" \
  "Fetch neighborhood data based on listing subdivision" \
  "Display key neighborhood stats (median price, schools)" \
  "Show nearby amenities" \
  "Add 'View Neighborhood' button linking to full page" \
  "Handle listings without subdivision data gracefully"

# Card 8: Neighborhood Favorites
create_card_with_checklist \
  "🟠 Neighborhood Favorites" \
  "Allow users to favorite entire neighborhoods. Display in dashboard with stats and get alerts for new listings in favorite neighborhoods." \
  "High" \
  "Add favoriteNeighborhoods array to User model" \
  "Create 'Favorite Neighborhood' button in UI" \
  "Display favorite neighborhoods in dashboard" \
  "Show listing count + recent activity for each favorite" \
  "Send notifications for new listings in favorites" \
  "Allow unfavoriting neighborhoods" \
  "Create API endpoint: src/app/api/favorites/neighborhoods/route.ts"

# Card 9: AI Stress Testing
create_card_with_checklist \
  "🟠 AI Stress Testing" \
  "Comprehensive stress test to ensure AI functions correctly after series of messages. Test context retention, memory usage, and concurrent users." \
  "High" \
  "Create automated test suite with 50 consecutive messages" \
  "Test context retention across 20+ messages" \
  "Verify response times don't degrade over time" \
  "Monitor memory usage during extended sessions" \
  "Test concurrent users (10+ simultaneous chats)" \
  "Test with large result sets (100+ listings)" \
  "Test complex filters (5+ simultaneous filters)" \
  "Document failure modes and recovery patterns"

# Card 10: Drag to Select
create_card_with_checklist \
  "🟡 Drag to Select Properties" \
  "Implement drag-to-select functionality on map for multi-property selection. Users can draw selection box and add all properties to favorites or compare." \
  "Medium" \
  "Integrate Mapbox Draw plugin" \
  "Implement rectangle selection mode on map" \
  "Detect listings within selection bounds" \
  "Highlight selected properties on map" \
  "Add 'Add Selected to Favorites' button" \
  "Add 'Compare Selected' button" \
  "Support mobile (long-press + drag)" \
  "Show selection count badge"

# Card 11: Selected Properties
create_card_with_checklist \
  "🟡 Update Selected Properties (Favorites)" \
  "Improve multi-select UI in favorites panel with bulk actions. Better selection mode, bulk operations, and comparison features." \
  "Medium" \
  "Add checkbox selection mode in favorites panel" \
  "Implement select all / deselect all" \
  "Bulk delete selected properties" \
  "Move selected to folders" \
  "Export selected to PDF/CSV" \
  "Compare properties side-by-side" \
  "Show selection count badge"

# Card 12: AI Auto-CMA
create_card_with_checklist \
  "🟡 AI Auto-CMA" \
  "AI automatically generates Comparative Market Analysis when viewing listings. Finds comparable sold properties and calculates estimated value." \
  "Medium" \
  "Create generateCMA AI tool in src/lib/chat/tools.ts" \
  "Query unified_closed_listings for sold comps" \
  "Match by location (1 mile radius), sqft (±20%), beds/baths" \
  "Filter last 6 months of sales, same property type" \
  "Calculate price per sqft analysis" \
  "Calculate estimated value based on comps" \
  "Display CMA card in chat with key metrics" \
  "Link to full CMA report page" \
  "Save CMA to user's dashboard"

# Card 13: User-Selected CMA
create_card_with_checklist \
  "🟡 User-Selected CMA" \
  "Allow users to manually select comparable properties for custom CMA. Override AI auto-selection with specific comps and generate custom reports." \
  "Medium" \
  "Add 'Add to CMA' button on closed listings" \
  "Create CMA builder interface at src/app/cma/builder/page.tsx" \
  "Drag and drop comps to reorder" \
  "Remove/replace comps in analysis" \
  "Adjust weights for each comp" \
  "Generate PDF report from custom CMA" \
  "Save custom CMA to dashboard" \
  "Share CMA via shareable link"

# Card 14: Voicemail Drops
create_card_with_checklist \
  "🟢 Voicemail Drops (Post-Launch)" \
  "Implement automated voicemail drop system for lead follow-up using Slybroadcast or similar service." \
  "Low - Post-Launch" \
  "Research Slybroadcast or similar voicemail drop services" \
  "Set up API integration" \
  "Create pre-recorded voicemail templates" \
  "Trigger voicemail drops from CRM workflows" \
  "Track delivery and response metrics" \
  "Add activity logging to CRM"

# Card 15: Twilio SMS
create_card_with_checklist \
  "🟢 Twilio SMS (Post-Launch)" \
  "Two-way SMS messaging with leads via Twilio. Send/receive SMS from dashboard with conversation threading." \
  "Low - Post-Launch" \
  "Set up Twilio account and phone number" \
  "Create send API endpoint: src/app/api/sms/send/route.ts" \
  "Create receive webhook: src/app/api/sms/webhook/route.ts" \
  "Build SMS conversation UI in dashboard" \
  "Create SMS templates for common messages" \
  "Implement conversation threading" \
  "Add auto-response rules"

# Card 16: AI Twilio Webhook
create_card_with_checklist \
  "🟢 AI Twilio Webhook (Post-Launch)" \
  "AI-powered SMS auto-responses via Twilio webhook. AI generates contextual responses to incoming SMS messages." \
  "Low - Post-Launch" \
  "Create Twilio webhook endpoint for incoming SMS" \
  "Integrate AI with conversation context" \
  "Generate contextual responses based on conversation history" \
  "Add optional human review queue before sending" \
  "Implement auto-respond for common questions" \
  "Track AI response accuracy and quality" \
  "Add fallback to human agent when needed"

# Card 17: AI Results Pages
create_card_with_checklist \
  "🟢 AI Results Pages (Post-Launch)" \
  "Dynamically generate custom listing results pages for leads. AI creates personalized collections with shareable URLs." \
  "Low - Post-Launch" \
  "Create dynamic results page generator" \
  "AI creates personalized listing collections" \
  "Generate shareable URLs (e.g., /results/palm-desert-3bed-600k)" \
  "Track page views and engagement metrics" \
  "Add lead capture forms on results pages" \
  "Send email notification when lead views page" \
  "Include agent branding and contact info"

# Card 18: Contact Cleanup
create_card_with_checklist \
  "🟢 Contact Cleanup Swipe (Post-Launch)" \
  "Tinder-style swipe interface for cleaning up CRM contacts. Quick gestures to keep, archive, merge, or flag contacts for review." \
  "Low - Post-Launch" \
  "Build swipe card interface component" \
  "Swipe right: Keep contact" \
  "Swipe left: Archive/delete contact" \
  "Swipe up: Merge duplicate contact" \
  "Swipe down: Flag for review" \
  "Add bulk cleanup mode for faster processing" \
  "Export cleanup summary report"

echo ""
echo "================================================"
echo "✅ Successfully created 18 cards with checklists!"
echo "================================================"
echo ""
echo "View at: https://trello.com/b/wfo1DQly/chatrealty"
