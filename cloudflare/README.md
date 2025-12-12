# Cloudflare Infrastructure for JPSRealtor.com

This directory contains all Cloudflare Workers and automation scripts for the listing cache and image optimization infrastructure.

## 🏗️ Architecture Overview

```
User Request
    ↓
Cloudflare Edge (270+ locations)
    ↓
┌─────────────────────────────────┐
│   Edge Cache (5 min TTL)        │ ← Fastest: <50ms
└─────────────────────────────────┘
    ↓ (if miss)
┌─────────────────────────────────┐
│   R2 Storage (15 min TTL)       │ ← Fast: 100-200ms
└─────────────────────────────────┘
    ↓ (if miss)
┌─────────────────────────────────┐
│   Origin (MongoDB Atlas NYC3)   │ ← Fallback: 500-1000ms
└─────────────────────────────────┘
```

## 📁 Directory Structure

```
cloudflare/
├── workers/
│   ├── listings-api.js         # Main API caching worker
│   ├── images-transform.js     # Image optimization worker
│   └── wrangler.toml          # Worker configuration
├── scripts/
│   ├── setup.sh               # Automated infrastructure setup
│   ├── test.sh                # Test all workers and cache
│   └── purge-cache.sh         # Cache purging utility
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Complete Domain Setup (One-Time)

You're currently doing this! Follow these steps:

1. **Add domain to Cloudflare** (you're here now)
   - Click "Continue" with "Quick scan for DNS records" selected
   - Cloudflare will scan your existing DNS records

2. **Update nameservers at your registrar**
   - Cloudflare will provide 2 nameservers (e.g., `dana.ns.cloudflare.com`)
   - Go to your domain registrar (where you bought jpsrealtor.com)
   - Replace existing nameservers with Cloudflare's nameservers
   - Wait 24-48 hours for propagation (usually faster)

3. **Get your Cloudflare credentials**
   ```bash
   # Account ID: Found on Cloudflare dashboard right sidebar
   # Zone ID: Found on jpsrealtor.com overview page right sidebar

   # API Token: Create at https://dash.cloudflare.com/profile/api-tokens
   # Required permissions:
   #   - Account.Cloudflare Workers Scripts (Edit)
   #   - Account.Workers R2 Storage (Edit)
   #   - Zone.DNS (Edit)
   #   - Zone.Cache Purge (Purge)
   ```

### 2. Set Environment Variables

```bash
export CF_API_TOKEN="your-api-token-here"
export CF_ACCOUNT_ID="your-account-id-here"
export CF_ZONE_ID="your-zone-id-here"
```

Or add to your `.env.local`:
```env
CF_API_TOKEN=your-api-token-here
CF_ACCOUNT_ID=your-account-id-here
CF_ZONE_ID=your-zone-id-here
```

### 3. Run Automated Setup

```bash
cd cloudflare/scripts
chmod +x setup.sh
./setup.sh
```

This will automatically:
- ✅ Create R2 buckets (listings-cache, listings-cache-preview)
- ✅ Deploy Workers (listings-api, images-transform)
- ✅ Configure routes (jpsrealtor.com/api/*, jpsrealtor.com/images/*)
- ✅ Set up cache rules
- ✅ Enable analytics

### 4. Test the Setup

```bash
chmod +x test.sh
./test.sh
```

## 🔧 Workers

### Listings API Worker (`listings-api.js`)

**Purpose**: Multi-tier caching for MLS listing API endpoints

**Routes**: `jpsrealtor.com/api/*`

**Cache Strategy**:
- Edge Cache: 5 minutes
- R2 Storage: 15 minutes
- Origin fallback: MongoDB Atlas

**Expected Performance**:
- Edge hit: <50ms (80% of requests)
- R2 hit: 100-200ms (15% of requests)
- Origin hit: 500-1000ms (5% of requests)

**Endpoints Cached**:
- `/api/query` ⭐ **New** - Chat Query System endpoint
- `/api/mls-listings`
- `/api/cities/*`
- `/api/subdivisions/*`
- `/api/market-stats`
- All other `/api/*` endpoints

### Images Transform Worker (`images-transform.js`)

**Purpose**: Automatic image optimization and transformation

**Routes**: `jpsrealtor.com/images/*`

**Features**:
- Auto WebP/AVIF conversion based on browser support
- Responsive resizing (width, height parameters)
- Quality optimization (default: 85%)
- EXIF data stripping for privacy
- 1 year cache (images are immutable)

**Usage Example**:
```javascript
// Original MLS image
const originalUrl = "https://photos.harstatic.com/gps_mlsimg/GpsPhotos_1024/000/024/074/024074569-1.jpg"

// Optimized via Cloudflare
const optimizedUrl = `https://jpsrealtor.com/images/${encodeURIComponent(originalUrl)}?width=600&quality=85&format=auto`
```

## 💰 Cost Breakdown

| Service | Usage | Cost |
|---------|-------|------|
| **Workers** | 10M requests/month | $5/month (included) |
| **R2 Storage** | ~10GB (640K images) | $1.50/month |
| **R2 Class A Ops** | 100K writes/month | $0.45/month |
| **R2 Class B Ops** | 10M reads/month | $0.36/month |
| **Images** | 640K stored, 1M deliveries | $6.40 + $10 = $16.40/month |
| **Total** | | **~$24/month** |

**Savings vs alternatives**:
- Self-hosted Redis VPS: $47/month → Save $23/month
- Vercel Image Optimization: ~$20/month → Save $4/month
- AWS S3 + CloudFront: ~$35/month → Save $11/month

## 🛠️ Maintenance Scripts

### Purge Cache

```bash
# Purge everything (use sparingly)
./scripts/purge-cache.sh

# Purge specific endpoints
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  --data '{"files": ["https://jpsrealtor.com/api/mls-listings"]}'
```

### Monitor Performance

```bash
# View analytics
https://dash.cloudflare.com/workers/analytics

# Check cache hit rate
# Goal: >80% edge hits, <5% origin hits
```

### Update Workers

```bash
# After modifying worker code
cd cloudflare/workers

# Deploy via Wrangler CLI (recommended)
npx wrangler deploy listings-api.js

# Or via API
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/listings-api" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -F "script=@listings-api.js;type=application/javascript+module"
```

## 📊 Monitoring & Analytics

### Key Metrics to Watch

1. **Cache Hit Rate**
   - Target: >80% edge hits
   - Monitor: Cloudflare Analytics Dashboard
   - Alert if: <70% for extended period

2. **Worker Execution Time**
   - Target: <10ms average
   - Monitor: Workers Analytics
   - Alert if: >50ms p95

3. **R2 Storage Growth**
   - Target: <15GB (640K images × ~20KB avg)
   - Monitor: R2 Dashboard
   - Alert if: Unusual growth rate

4. **Error Rate**
   - Target: <0.1%
   - Monitor: Workers Logs
   - Alert if: >1% sustained

### Access Dashboards

- **Workers Analytics**: `https://dash.cloudflare.com/{account-id}/workers/analytics`
- **R2 Storage**: `https://dash.cloudflare.com/{account-id}/r2`
- **Cache Analytics**: `https://dash.cloudflare.com/{zone-id}/analytics/cache`

## 🔍 Troubleshooting

### Cache Not Working

**Symptoms**: All requests hitting origin, slow response times

**Debug**:
```bash
# Check cache headers
curl -I https://jpsrealtor.com/api/mls-listings

# Look for:
# X-Cache: HIT-EDGE or HIT-R2 (good)
# X-Cache: MISS (bad if consistent)
```

**Solutions**:
1. Check worker routes are active
2. Verify cache rules in dashboard
3. Check for `Cache-Control: no-cache` headers from origin

### Worker Errors

**Symptoms**: 500 errors, worker not responding

**Debug**:
```bash
# View worker logs
npx wrangler tail listings-api

# Check recent deployments
curl https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/listings-api \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Solutions**:
1. Check worker logs for errors
2. Verify R2 binding is correct
3. Test worker locally with Wrangler

### High R2 Costs

**Symptoms**: Unexpected billing spikes

**Debug**:
```bash
# Check R2 metrics
curl https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/r2/buckets/listings-cache/metrics \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Solutions**:
1. Reduce TTL to clear stale objects
2. Implement lifecycle policies
3. Review cache purge frequency

## 🚦 Status & Health Checks

### Automated Health Check

Create a cron job to monitor health:

```bash
#!/bin/bash
# health-check.sh

# Test API endpoint
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://jpsrealtor.com/api/mls-listings?limit=1)

if [ "$STATUS" != "200" ]; then
  echo "❌ API health check failed: HTTP $STATUS"
  # Send alert (email, Slack, etc.)
else
  echo "✅ API healthy"
fi

# Test image worker
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://jpsrealtor.com/images/test.jpg?width=100")

if [ "$STATUS" != "200" ] && [ "$STATUS" != "404" ]; then
  echo "❌ Images health check failed: HTTP $STATUS"
else
  echo "✅ Images healthy"
fi
```

Run every 5 minutes:
```bash
crontab -e
# Add:
*/5 * * * * /path/to/health-check.sh
```

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Image Optimization Docs](https://developers.cloudflare.com/images/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## 🆘 Support

If you run into issues:

1. Check the [troubleshooting section](#-troubleshooting) above
2. Review Cloudflare worker logs
3. Check R2 bucket metrics
4. Verify DNS propagation: `dig jpsrealtor.com`
5. Contact Cloudflare support if needed

## 📝 Next Steps After Setup

1. ✅ Complete domain setup in Cloudflare dashboard
2. ✅ Update nameservers at registrar
3. ✅ Wait for DNS propagation (check: https://www.whatsmydns.net/)
4. ✅ Get API credentials (Account ID, Zone ID, API Token)
5. ✅ Run `./scripts/setup.sh`
6. ✅ Run `./scripts/test.sh`
7. ✅ Update Next.js app to use Cloudflare URLs
8. ✅ Monitor analytics for 24 hours
9. ✅ Adjust cache TTLs based on hit rates
10. ✅ Set up automated health checks

---

**Created**: December 3, 2025
**Last Updated**: December 3, 2025
**Version**: 1.0.0
