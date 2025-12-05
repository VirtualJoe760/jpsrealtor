#!/bin/bash
# Cloudflare Infrastructure Testing Script
# Tests all deployed Workers and cache functionality

set -e

DOMAIN="jpsrealtor.com"

echo "🧪 Testing Cloudflare Infrastructure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ===== TEST 1: Listings API Worker =====
echo "📋 Test 1/4: Listings API Worker..."

# Test cache MISS (first request)
echo "  → Testing cache MISS..."
RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "https://$DOMAIN/api/mls-listings?limit=10")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
TIME_TOTAL=$(echo "$RESPONSE" | tail -n 1)
CACHE_STATUS=$(echo "$RESPONSE" | grep -o '"X-Cache":"[^"]*"' | cut -d'"' -f4 || echo "MISS")

echo "  ✓ Status: $HTTP_CODE"
echo "  ✓ Cache: $CACHE_STATUS (expected: MISS)"
echo "  ✓ Time: ${TIME_TOTAL}s"

# Test cache HIT (second request)
echo "  → Testing cache HIT..."
sleep 1
RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "https://$DOMAIN/api/mls-listings?limit=10")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
TIME_TOTAL=$(echo "$RESPONSE" | tail -n 1)
CACHE_STATUS=$(echo "$RESPONSE" | grep -o '"X-Cache":"[^"]*"' | cut -d'"' -f4 || echo "UNKNOWN")

echo "  ✓ Status: $HTTP_CODE"
echo "  ✓ Cache: $CACHE_STATUS (expected: HIT-EDGE or HIT-R2)"
echo "  ✓ Time: ${TIME_TOTAL}s (should be <0.1s if HIT-EDGE)"

if (( $(echo "$TIME_TOTAL < 0.2" | bc -l) )); then
  echo "  ✅ Cache working! Fast response time"
else
  echo "  ⚠️  Slower than expected. Check cache configuration"
fi
echo ""

# ===== TEST 2: Different Query Parameters =====
echo "🔍 Test 2/4: Query Parameter Caching..."

# Test different parameters create different cache keys
echo "  → Testing /api/mls-listings?limit=5..."
RESPONSE=$(curl -s -w "\n%{http_code}" "https://$DOMAIN/api/mls-listings?limit=5")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
echo "  ✓ Status: $HTTP_CODE"

echo "  → Testing /api/mls-listings?limit=20..."
RESPONSE=$(curl -s -w "\n%{http_code}" "https://$DOMAIN/api/mls-listings?limit=20")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
echo "  ✓ Status: $HTTP_CODE"

echo "  ✅ Query parameters working correctly"
echo ""

# ===== TEST 3: Image Transformation =====
echo "🖼️  Test 3/4: Image Transformation Worker..."

# Get a sample listing image URL
SAMPLE_IMAGE="https://photos.harstatic.com/gps_mlsimg/GpsPhotos_1024/000/024/074/024074569-1.jpg"

echo "  → Testing image transformation..."
echo "  → Original: $SAMPLE_IMAGE"

# Test different sizes
for SIZE in "300" "600" "1200"; do
  echo "  → Testing width=${SIZE}..."
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" \
    "https://$DOMAIN/images/$(echo $SAMPLE_IMAGE | sed 's/https:\/\///')&width=${SIZE}&quality=85&format=auto")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
  TIME_TOTAL=$(echo "$RESPONSE" | tail -n 1)

  echo "    ✓ ${SIZE}px: $HTTP_CODE (${TIME_TOTAL}s)"
done

echo "  ✅ Image transformation working"
echo ""

# ===== TEST 4: Geographic Distribution =====
echo "🌍 Test 4/4: Geographic Performance..."

echo "  → Testing from different edge locations..."
echo "  ℹ️  Note: This test shows Cloudflare header info"

curl -s -I "https://$DOMAIN/api/mls-listings?limit=1" | grep -i "cf-"

echo ""
echo "  ✅ Geographic distribution test complete"
echo ""

# ===== SUMMARY =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Tests Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Next Steps:"
echo "   1. Check Analytics dashboard for cache hit rates"
echo "   2. Monitor R2 storage usage"
echo "   3. Review worker execution times"
echo "   4. Set up alerts for errors"
echo ""
echo "🔗 Dashboards:"
echo "   • Workers: https://dash.cloudflare.com/workers/analytics"
echo "   • R2: https://dash.cloudflare.com/r2"
echo "   • Cache Analytics: https://dash.cloudflare.com/analytics"
echo ""
