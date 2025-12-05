#!/bin/bash
# Cloudflare Cache Purging Script
# Use this when you need to invalidate cached data

set -e

if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ]; then
  echo "❌ Error: Missing CF_API_TOKEN or CF_ZONE_ID"
  exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4"

echo "🧹 Cloudflare Cache Purge Utility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Select purge type:"
echo "  1. Purge everything (nuclear option)"
echo "  2. Purge all API endpoints"
echo "  3. Purge all images"
echo "  4. Purge specific URL"
echo "  5. Purge by prefix"
echo ""
read -p "Enter option (1-5): " OPTION

case $OPTION in
  1)
    echo "⚠️  WARNING: This will purge ALL cached content!"
    read -p "Are you sure? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
      curl -X POST "$API_BASE/zones/$CF_ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything": true}' | jq '.'
      echo "✅ Purged everything"
    fi
    ;;

  2)
    echo "🗑️  Purging all API endpoints..."
    curl -X POST "$API_BASE/zones/$CF_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{
        "prefixes": [
          "jpsrealtor.com/api/"
        ]
      }' | jq '.'
    echo "✅ Purged API cache"
    ;;

  3)
    echo "🖼️  Purging all images..."
    curl -X POST "$API_BASE/zones/$CF_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{
        "prefixes": [
          "jpsrealtor.com/images/"
        ]
      }' | jq '.'
    echo "✅ Purged image cache"
    ;;

  4)
    read -p "Enter full URL to purge: " URL
    curl -X POST "$API_BASE/zones/$CF_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"files\": [\"$URL\"]}" | jq '.'
    echo "✅ Purged $URL"
    ;;

  5)
    read -p "Enter prefix (e.g., jpsrealtor.com/api/cities/): " PREFIX
    curl -X POST "$API_BASE/zones/$CF_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"prefixes\": [\"$PREFIX\"]}" | jq '.'
    echo "✅ Purged prefix: $PREFIX"
    ;;

  *)
    echo "Invalid option"
    exit 1
    ;;
esac

echo ""
echo "ℹ️  Cache will be repopulated on next request"
echo "ℹ️  Purge can take 30-60 seconds to propagate globally"
echo ""
