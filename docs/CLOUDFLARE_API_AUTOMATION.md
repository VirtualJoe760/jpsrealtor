# Cloudflare API Automation Guide
**What I Can Automate vs Manual Steps**
**Last Updated:** December 3, 2025

---

## 🤖 FULLY AUTOMATABLE VIA API (I Can Do This)

### ✅ R2 Bucket Operations
**API:** R2 API (S3-compatible)

```bash
# Create bucket
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name": "listings-cache"}'

# Upload objects
curl -X PUT "https://$ACCOUNT_ID.r2.cloudflarestorage.com/listings-cache/test.json" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  -H "Content-Type: application/json" \
  --data '{"test": "data"}'

# List objects
curl "https://$ACCOUNT_ID.r2.cloudflarestorage.com/listings-cache" \
  --aws-sigv4 "aws:amz:us-east-1:s3"

# Delete objects
curl -X DELETE "https://$ACCOUNT_ID.r2.cloudflarestorage.com/listings-cache/test.json" \
  --aws-sigv4 "aws:amz:us-east-1:s3"
```

**Automation Capability:** ✅ 100%
- I can create buckets
- Upload/download files
- Manage bucket lifecycle
- Set CORS policies

### ✅ Worker Deployment
**API:** Workers API

```bash
# Upload Worker script
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/listings-api" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/javascript" \
  --data-binary "@workers/listings-api.js"

# Create Worker route
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "pattern": "jpsrealtor.com/api/mls-listings*",
    "script": "listings-api"
  }'

# Update Worker environment variables
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/listings-api/settings" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "bindings": [
      {
        "type": "r2_bucket",
        "name": "LISTINGS_CACHE",
        "bucket_name": "listings-cache"
      }
    ]
  }'
```

**Automation Capability:** ✅ 100%
- Deploy Worker code
- Update Worker scripts
- Configure routes
- Bind R2 buckets to Workers
- Set environment variables

### ✅ Cache Purging
**API:** Cache API

```bash
# Purge all cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": true}'

# Purge by URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://jpsrealtor.com/api/mls-listings?north=34&south=33&east=-116&west=-117"
    ]
  }'

# Purge by tag
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"tags": ["listings", "mls-data"]}'

# Purge by prefix
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"prefixes": ["jpsrealtor.com/api/mls-listings"]}'
```

**Automation Capability:** ✅ 100%
- Purge entire cache
- Purge specific URLs
- Purge by cache tags
- Purge by prefix
- Integrate into MLS sync script

### ✅ DNS Record Management
**API:** DNS API

```bash
# List DNS records
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $API_TOKEN"

# Create DNS record
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "jpsrealtor.com",
    "content": "76.76.21.21",
    "ttl": 1,
    "proxied": true
  }'

# Update DNS record
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "www",
    "content": "jpsrealtor.com",
    "proxied": true
  }'
```

**Automation Capability:** ✅ 100%
- Create/update/delete DNS records
- Enable Cloudflare proxy (orange cloud)
- Configure SSL settings

### ✅ Analytics & Monitoring
**API:** Analytics API

```bash
# Get analytics data
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/analytics/dashboard?since=-1440&until=now" \
  -H "Authorization: Bearer $API_TOKEN"

# Get cache analytics
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/analytics/colos?since=-1440" \
  -H "Authorization: Bearer $API_TOKEN"

# Get Worker analytics
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/listings-api/analytics" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Automation Capability:** ✅ 100%
- Fetch analytics data
- Monitor cache hit rates
- Track Worker performance
- Get bandwidth metrics

### ✅ Image Optimization
**API:** Images API

```bash
# Upload image to Cloudflare Images
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/images/v1" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "file=@listing-photo.jpg" \
  -F "id=listing-123"

# List images
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/images/v1" \
  -H "Authorization: Bearer $API_TOKEN"

# Delete image
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/images/v1/listing-123" \
  -H "Authorization: Bearer $API_TOKEN"

# Get image stats
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/images/v1/stats" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Automation Capability:** ✅ 100%
- Upload images
- Delete images
- Batch upload (script)
- Get delivery stats

---

## ⚠️ PARTIALLY AUTOMATABLE (Needs Initial Manual Setup)

### 🔶 Zone/Domain Setup
**Initial Setup:** Manual (one-time)
**After Setup:** API works

**Manual Steps:**
1. Add jpsrealtor.com to Cloudflare account (via dashboard)
2. Update nameservers at domain registrar
3. Wait for DNS propagation (24-48 hours)

**Then API Can Handle:**
```bash
# Get zone ID
curl "https://api.cloudflare.com/client/v4/zones?name=jpsrealtor.com" \
  -H "Authorization: Bearer $API_TOKEN"

# After zone is active, all DNS/settings are API-manageable
```

**Why Manual?**
- Domain ownership verification required
- Nameserver changes at registrar level
- Safety measure to prevent domain hijacking

### 🔶 API Token Generation
**Initial Setup:** Manual (one-time)
**After Setup:** Token works forever (or until revoked)

**Manual Steps:**
1. Log into Cloudflare dashboard
2. Go to My Profile → API Tokens
3. Create token with permissions:
   - Zone:DNS:Edit
   - Zone:Cache Purge:Purge
   - Account:Workers Scripts:Edit
   - Account:Workers Routes:Edit
   - Account:R2:Edit
   - Account:Images:Edit

**Why Manual?**
- Security: Requires human authentication
- Cannot create tokens via API (chicken-egg problem)

### 🔶 Account ID & Zone ID
**Initial Setup:** Manual lookup (one-time)
**After Setup:** Use in all API calls

**How to Get:**
```bash
# Login via Wrangler (interactive)
wrangler whoami

# Or via API with existing token
curl "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Why Manual?**
- Need to know account ID to make API calls
- One-time lookup, then store in .env

---

## ❌ NOT AUTOMATABLE (Must Be Manual)

### ❌ Initial Account Creation
**Why:** Requires email verification, payment method, human verification

**Manual Steps:**
1. Go to https://dash.cloudflare.com/sign-up
2. Create account with email
3. Verify email
4. Add payment method (even for free tier)

**Cannot Be Automated:** No API for account creation

### ❌ Payment Method Setup
**Why:** PCI compliance, fraud prevention

**Manual Steps:**
1. Dashboard → Billing → Payment Methods
2. Add credit card
3. Complete 3D Secure verification

**Cannot Be Automated:** Security requirement

### ❌ Wrangler CLI Initial Setup
**Why:** Interactive OAuth flow

**Manual Steps:**
```bash
# Install Wrangler
npm install -g wrangler

# Login (opens browser for OAuth)
wrangler login
```

**Why Manual?**
- OAuth requires browser interaction
- One-time setup, then works via CLI

**After Login:** Can deploy via CLI or API
```bash
# Deploy Worker (automated)
wrangler deploy workers/listings-api.js

# Or via API
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/listings-api" \
  -H "Authorization: Bearer $API_TOKEN" \
  --data-binary "@workers/listings-api.js"
```

---

## 🚀 AUTOMATION SCRIPT I CAN RUN

Once you provide **API_TOKEN**, **ACCOUNT_ID**, and **ZONE_ID**, I can run this complete automation script:

### `scripts/cloudflare-setup.sh`

```bash
#!/bin/bash
set -e

# Load credentials
source .env.local

echo "🚀 Starting Cloudflare automation setup..."

# 1. Create R2 buckets
echo "📦 Creating R2 buckets..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name": "listings-cache"}'

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name": "mls-photos"}'

echo "✅ R2 buckets created"

# 2. Deploy Worker
echo "⚙️ Deploying Worker..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/listings-api" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/javascript" \
  --data-binary "@workers/listings-api.js"

echo "✅ Worker deployed"

# 3. Bind R2 to Worker
echo "🔗 Binding R2 to Worker..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/listings-api/settings" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "bindings": [
      {
        "type": "r2_bucket",
        "name": "LISTINGS_CACHE",
        "bucket_name": "listings-cache"
      },
      {
        "type": "r2_bucket",
        "name": "MLS_PHOTOS",
        "bucket_name": "mls-photos"
      }
    ]
  }'

echo "✅ R2 buckets bound to Worker"

# 4. Create Worker route
echo "🛣️ Creating Worker route..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/workers/routes" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "pattern": "jpsrealtor.com/api/mls-listings*",
    "script": "listings-api"
  }'

curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/workers/routes" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "pattern": "jpsrealtor.com/api/listings/*",
    "script": "listings-api"
  }'

echo "✅ Worker routes created"

# 5. Enable Cloudflare proxy on DNS
echo "🌐 Enabling Cloudflare proxy..."
# Get existing DNS record ID
RECORD_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records?name=jpsrealtor.com" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result[0].id')

# Update to enable proxy
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"proxied": true}'

echo "✅ Cloudflare proxy enabled"

# 6. Configure cache settings
echo "💾 Configuring cache settings..."
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/cache_level" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value": "aggressive"}'

curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/browser_cache_ttl" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value": 14400}'

echo "✅ Cache settings configured"

# 7. Test Worker
echo "🧪 Testing Worker..."
TEST_RESPONSE=$(curl -s "https://jpsrealtor.com/api/mls-listings?limit=1")
if [[ $TEST_RESPONSE == *"listings"* ]]; then
  echo "✅ Worker is responding correctly"
else
  echo "❌ Worker test failed"
  exit 1
fi

echo ""
echo "🎉 Cloudflare setup complete!"
echo ""
echo "📊 Next steps:"
echo "1. Monitor Worker analytics in dashboard"
echo "2. Check cache hit rates"
echo "3. Upload photos to mls-photos bucket"
echo ""
```

### Run This Script
```bash
# Make executable
chmod +x scripts/cloudflare-setup.sh

# Run
./scripts/cloudflare-setup.sh
```

---

## 📋 WHAT YOU NEED TO PROVIDE

For me to automate 90% of the setup, you need:

### 1. Cloudflare API Token
**How to Get:**
1. Log into https://dash.cloudflare.com
2. Go to My Profile → API Tokens
3. Click "Create Token"
4. Use template "Edit Cloudflare Workers" OR custom with:
   - Zone:DNS:Edit
   - Zone:Cache Purge:Purge
   - Account:Workers Scripts:Edit
   - Account:Workers Routes:Edit
   - Account:R2:Edit
5. Copy the token

**Add to .env.local:**
```bash
CF_API_TOKEN=your_token_here
```

### 2. Account ID
**How to Get:**
1. Dashboard → Workers & Pages
2. Copy "Account ID" from right sidebar

**Add to .env.local:**
```bash
CF_ACCOUNT_ID=your_account_id_here
```

### 3. Zone ID
**How to Get:**
1. Dashboard → Websites → jpsrealtor.com
2. Scroll down to "API" section
3. Copy "Zone ID"

**Add to .env.local:**
```bash
CF_ZONE_ID=your_zone_id_here
```

---

## ✅ AUTOMATION SUMMARY

| Task | Automated? | Method |
|------|-----------|--------|
| Create R2 buckets | ✅ 100% | API |
| Deploy Workers | ✅ 100% | API |
| Configure Worker routes | ✅ 100% | API |
| Bind R2 to Workers | ✅ 100% | API |
| Cache purging | ✅ 100% | API |
| DNS management | ✅ 100% | API (after zone setup) |
| Upload images | ✅ 100% | API |
| Analytics monitoring | ✅ 100% | API |
| Initial account creation | ❌ 0% | Manual only |
| Add domain to Cloudflare | ❌ 0% | Manual only |
| Generate API token | ❌ 0% | Manual only |
| Update nameservers | ❌ 0% | Manual (at registrar) |

**Overall Automation:** ~90% once you complete 4 manual steps

---

## 🎯 YOUR DECISION

**Option 1: You Do Manual Setup (15 minutes)**
1. Create Cloudflare account (if needed)
2. Add jpsrealtor.com to Cloudflare
3. Generate API token
4. Provide: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_ZONE_ID`

**Then I Automate:** Everything else via API

**Option 2: I Guide You Step-by-Step**
I can provide screenshot-level instructions for each manual step

**Option 3: Hybrid Approach**
You do account setup, I build automation scripts you can run anytime

---

**Which option would you prefer?** I can start automating immediately once you provide the 3 credentials.
