#!/bin/bash
cd "$(dirname "$0")"
source .env.local

BOARD_ID="wfo1DQly"
LIST_ID="69307001f0815b7abe500828"

echo "Deleting all cards..."
CARDS=$(curl -s "https://api.trello.com/1/lists/${LIST_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}")
CARD_IDS=$(echo "$CARDS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
for CARD_ID in $CARD_IDS; do
  curl -s -X DELETE "https://api.trello.com/1/cards/${CARD_ID}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}" > /dev/null
done
echo "✅ Deleted old cards"
echo ""

create_card_with_checklist() {
  local name="$1"
  local desc="$2"
  local priority="$3"
  shift 3
  local checklist_items=("$@")

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

  CHECKLIST_RESPONSE=$(curl -s -X POST "https://api.trello.com/1/checklists" \
    -d "key=${TRELLO_API_KEY}" \
    -d "token=${TRELLO_TOKEN}" \
    -d "idCard=${CARD_ID}" \
    -d "name=Tasks")

  CHECKLIST_ID=$(echo "$CHECKLIST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  for item in "${checklist_items[@]}"; do
    curl -s -X POST "https://api.trello.com/1/checklists/${CHECKLIST_ID}/checkItems" \
      -d "key=${TRELLO_API_KEY}" \
      -d "token=${TRELLO_TOKEN}" \
      -d "name=${item}" > /dev/null
  done

  echo "✅ Created: $name"
}

echo "Creating essential pre-launch cards..."
echo ""

# Card 1: Critical Chat & UI Fixes
create_card_with_checklist \
  "🔴 Critical Chat & Mobile Fixes" \
  "Fix blocking issues preventing chat from working properly on mobile and handling errors gracefully. These prevent users from having a good experience." \
  "CRITICAL - BLOCKING LAUNCH" \
  "Fix mobile scroll direction (messages push UP instead of DOWN)" \
  "Add error handling for unprepared AI questions" \
  "Fix listing swipe queue (shows wrong next/previous)" \
  "Test on iPhone and Android devices"

# Card 2: Map & AI Integration
create_card_with_checklist \
  "🟠 Map & AI Synchronization" \
  "Make the map automatically update when users search locations in chat. Map should center on searched area while AI is generating results, creating a seamless experience." \
  "HIGH PRIORITY" \
  "Create event system for AI → Map communication" \
  "Map auto-centers when user searches city/neighborhood" \
  "Works even when map is hidden (updates in background)" \
  "Add geocoding for city names to coordinates" \
  "Test with various location queries"

# Card 3: Neighborhoods & CMA Features
create_card_with_checklist \
  "🟡 Neighborhoods & Auto-CMA" \
  "Expand neighborhood data and add AI-powered CMA generation. These are key differentiators that provide real value to users beyond basic listing search." \
  "MEDIUM PRIORITY" \
  "Expand neighborhoods database with comprehensive data" \
  "Add neighborhood query to AI chat" \
  "Show neighborhood info in listing panels" \
  "Allow users to favorite neighborhoods" \
  "Implement AI auto-CMA generation from sold comps" \
  "Add CMA display in chat with key metrics"

# Card 4: Testing & Launch Prep
create_card_with_checklist \
  "🟢 Launch Readiness" \
  "Final testing, performance optimization, and verification that all core features work correctly under load before going live." \
  "BEFORE LAUNCH" \
  "AI stress test (50+ consecutive messages)" \
  "Test concurrent users (10+ simultaneous)" \
  "Mobile responsiveness audit (all pages)" \
  "Performance monitoring setup" \
  "Error tracking (Sentry or similar)" \
  "SEO optimization (meta tags, sitemap)" \
  "Final QA pass on all core features"

echo ""
echo "========================================="
echo "✅ Created 4 essential cards!"
echo "========================================="
echo ""
echo "View at: https://trello.com/b/wfo1DQly/chatrealty"
