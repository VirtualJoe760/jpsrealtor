#!/bin/bash
# Cloudflare Automated Setup Script
# This script automates ~90% of the Cloudflare infrastructure setup
#
# Prerequisites (one-time manual steps):
# 1. Add jpsrealtor.com to Cloudflare (you're doing this now)
# 2. Update nameservers at your domain registrar
# 3. Generate API token with these permissions:
#    - Account.Cloudflare Workers Scripts (Edit)
#    - Account.Workers R2 Storage (Edit)
#    - Zone.DNS (Edit)
#    - Zone.Cache Purge (Purge)
# 4. Set environment variables below

set -e # Exit on error

# ===== CONFIGURATION =====
# Set these environment variables before running:
# export CF_API_TOKEN="your-api-token-here"
# export CF_ACCOUNT_ID="your-account-id-here"
# export CF_ZONE_ID="your-zone-id-here"

if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ACCOUNT_ID" ] || [ -z "$CF_ZONE_ID" ]; then
  echo "❌ Error: Missing required environment variables"
  echo ""
  echo "Please set the following:"
  echo "  export CF_API_TOKEN='your-api-token'"
  echo "  export CF_ACCOUNT_ID='your-account-id'"
  echo "  export CF_ZONE_ID='your-zone-id'"
  echo ""
  echo "Get these values from:"
  echo "  1. API Token: https://dash.cloudflare.com/profile/api-tokens"
  echo "  2. Account ID: Cloudflare dashboard > Right sidebar"
  echo "  3. Zone ID: jpsrealtor.com overview page > Right sidebar"
  exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4"
ORIGIN_URL="https://jpsrealtor.com"

echo "🚀 Starting Cloudflare Infrastructure Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ===== STEP 1: Create R2 Buckets =====
echo "📦 Step 1/7: Creating R2 buckets..."

# Production bucket
curl -X POST "$API_BASE/accounts/$CF_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "listings-cache",
    "locationHint": "WNAM"
  }' | jq '.'

echo "✅ Created listings-cache bucket"

# Preview bucket for testing
curl -X POST "$API_BASE/accounts/$CF_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "listings-cache-preview",
    "locationHint": "WNAM"
  }' | jq '.'

echo "✅ Created listings-cache-preview bucket"
echo ""

# ===== STEP 2: Deploy Listings API Worker =====
echo "⚡ Step 2/7: Deploying Listings API Worker..."

cd ../workers

# Upload worker script
curl -X PUT "$API_BASE/accounts/$CF_ACCOUNT_ID/workers/scripts/listings-api" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -F "metadata=@-" \
  -F "script=@listings-api.js;type=application/javascript+module" <<EOF
{
  "main_module": "listings-api.js",
  "bindings": [
    {
      "type": "r2_bucket",
      "name": "LISTINGS_CACHE",
      "bucket_name": "listings-cache"
    }
  ],
  "compatibility_date": "2024-12-03",
  "compatibility_flags": []
}
EOF

echo ""
echo "✅ Deployed listings-api worker"
echo ""

# ===== STEP 3: Deploy Images Worker =====
echo "🖼️  Step 3/7: Deploying Images Worker..."

curl -X PUT "$API_BASE/accounts/$CF_ACCOUNT_ID/workers/scripts/images-transform" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -F "metadata=@-" \
  -F "script=@images-transform.js;type=application/javascript+module" <<EOF
{
  "main_module": "images-transform.js",
  "compatibility_date": "2024-12-03",
  "compatibility_flags": []
}
EOF

echo ""
echo "✅ Deployed images-transform worker"
echo ""

# ===== STEP 4: Create Worker Routes =====
echo "🛣️  Step 4/7: Creating Worker routes..."

# Route 1: API endpoints
curl -X POST "$API_BASE/zones/$CF_ZONE_ID/workers/routes" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "pattern": "jpsrealtor.com/api/*",
    "script": "listings-api"
  }' | jq '.'

echo "✅ Created route: jpsrealtor.com/api/* → listings-api"

# Route 2: Image transformation
curl -X POST "$API_BASE/zones/$CF_ZONE_ID/workers/routes" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "pattern": "jpsrealtor.com/images/*",
    "script": "images-transform"
  }' | jq '.'

echo "✅ Created route: jpsrealtor.com/images/* → images-transform"
echo ""

# ===== STEP 5: Configure Cache Rules =====
echo "💾 Step 5/7: Configuring cache rules..."

curl -X POST "$API_BASE/zones/$CF_ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Listings API Cache Rules",
    "kind": "zone",
    "phase": "http_request_cache_settings",
    "rules": [
      {
        "action": "set_cache_settings",
        "expression": "(http.request.uri.path matches \"^/api/(mls-listings|cities|subdivisions)\")",
        "action_parameters": {
          "edge_ttl": {
            "mode": "override_origin",
            "default": 300
          },
          "browser_ttl": {
            "mode": "override_origin",
            "default": 300
          },
          "cache_key": {
            "custom_key": {
              "query_string": {
                "include": "*"
              }
            }
          }
        }
      },
      {
        "action": "set_cache_settings",
        "expression": "(http.request.uri.path matches \"^/images/\")",
        "action_parameters": {
          "edge_ttl": {
            "mode": "override_origin",
            "default": 31536000
          },
          "browser_ttl": {
            "mode": "override_origin",
            "default": 31536000
          }
        }
      }
    ]
  }' | jq '.'

echo "✅ Configured cache rules"
echo ""

# ===== STEP 6: Set up DNS Records (if not already done) =====
echo "🌐 Step 6/7: Verifying DNS records..."

# Check if @ record exists
DNS_RECORDS=$(curl -s -X GET "$API_BASE/zones/$CF_ZONE_ID/dns_records?type=A&name=jpsrealtor.com" \
  -H "Authorization: Bearer $CF_API_TOKEN")

RECORD_COUNT=$(echo $DNS_RECORDS | jq '.result | length')

if [ "$RECORD_COUNT" -eq 0 ]; then
  echo "⚠️  No A record found. You'll need to add your origin server IP manually."
  echo "   Go to: DNS > Records > Add record"
else
  echo "✅ DNS records already configured"
fi
echo ""

# ===== STEP 7: Create Analytics Dashboard =====
echo "📊 Step 7/7: Setting up analytics..."

# Enable Workers Analytics
curl -X PUT "$API_BASE/accounts/$CF_ACCOUNT_ID/workers/scripts/listings-api/settings" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "logpush": true,
    "tail_consumers": []
  }' | jq '.'

echo "✅ Enabled Workers analytics"
echo ""

# ===== COMPLETION =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cloudflare Infrastructure Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 What was created:"
echo "   • 2 R2 buckets (listings-cache, listings-cache-preview)"
echo "   • 2 Workers (listings-api, images-transform)"
echo "   • 2 Routes (jpsrealtor.com/api/*, jpsrealtor.com/images/*)"
echo "   • Cache rules for API and images"
echo "   • Analytics enabled"
echo ""
echo "🔗 Useful Links:"
echo "   • Workers Dashboard: https://dash.cloudflare.com/$CF_ACCOUNT_ID/workers"
echo "   • R2 Dashboard: https://dash.cloudflare.com/$CF_ACCOUNT_ID/r2"
echo "   • Analytics: https://dash.cloudflare.com/$CF_ACCOUNT_ID/workers/analytics"
echo ""
echo "📝 Next Steps:"
echo "   1. Test the setup: npm run test:cloudflare"
echo "   2. Monitor cache hit rates in Analytics dashboard"
echo "   3. Update your Next.js app to use Cloudflare endpoints"
echo "   4. Set up cache purging webhooks (optional)"
echo ""
echo "💰 Expected Monthly Cost: ~\$5-10"
echo "   • Workers: \$5/month (10M requests included)"
echo "   • R2 Storage: ~\$1-2/month (for ~10GB)"
echo "   • R2 Operations: ~\$1-2/month"
echo "   • No egress fees! 🎉"
echo ""
