#!/bin/bash
cd "$(dirname "$0")"
source .env.local

# Get all boards
echo "Fetching boards..."
curl -s "https://api.trello.com/1/members/me/boards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,id" > /tmp/boards.json

# Find Programming board
BOARD_ID=$(cat /tmp/boards.json | grep -i "programming" -A 1 | grep '"id"' | cut -d'"' -f4 | head -1)

if [ -z "$BOARD_ID" ]; then
  echo "❌ Programming board not found"
  echo "Available boards:"
  cat /tmp/boards.json | grep '"name"' | cut -d'"' -f4
  exit 1
fi

echo "✅ Found Programming board: $BOARD_ID"

# Get lists
echo "Fetching lists..."
curl -s "https://api.trello.com/1/boards/${BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,id" > /tmp/lists.json

# Find Developer Task List
LIST_ID=$(cat /tmp/lists.json | grep -i "developer" -A 1 | grep '"id"' | cut -d'"' -f4 | head -1)

if [ -z "$LIST_ID" ]; then
  echo "Creating Developer Task List..."
  RESPONSE=$(curl -s -X POST "https://api.trello.com/1/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&name=Developer%20Task%20List&idBoard=${BOARD_ID}")
  LIST_ID=$(echo "$RESPONSE" | grep '"id"' | cut -d'"' -f4 | head -1)
  echo "✅ Created list: $LIST_ID"
else
  echo "✅ Found Developer Task List: $LIST_ID"
fi

echo "$BOARD_ID" > /tmp/trello_board_id.txt
echo "$LIST_ID" > /tmp/trello_list_id.txt

echo ""
echo "Board ID: $BOARD_ID"
echo "List ID: $LIST_ID"
