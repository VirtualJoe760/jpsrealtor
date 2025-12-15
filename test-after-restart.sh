#!/bin/bash

echo "=================================="
echo "Testing Date Filter After Restart"
echo "=================================="
echo ""

echo "Test 1: API with date filter"
echo "----------------------------"
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"city":"Palm Desert","filters":{"listedAfter":"2025-12-07","limit":10}}' \
  2>/dev/null | jq '.meta.totalListings'

RESULT=$(curl -s -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"city":"Palm Desert","filters":{"listedAfter":"2025-12-07","limit":10}}' | jq '.meta.totalListings')

echo ""
if [ "$RESULT" -gt 0 ]; then
  echo "✅ SUCCESS! Found $RESULT listings"
  echo ""
  echo "The date filter is now working correctly!"
  echo "You should see 6 listings for Palm Desert after 2025-12-07"
else
  echo "❌ FAILED - Still returning 0 listings"
  echo ""
  echo "Next steps:"
  echo "1. Check server console for any errors"
  echo "2. Verify .next cache was cleared"
  echo "3. See IMMEDIATE_ACTION_PLAN.md for debugging steps"
fi

echo ""
echo "=================================="
