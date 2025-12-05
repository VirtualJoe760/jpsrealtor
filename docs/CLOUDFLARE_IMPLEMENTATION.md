# Cloudflare Implementation Plan
**Replacing Custom CDN/Redis with Cloudflare Edge Network**
**Last Updated:** December 3, 2025

---

## 🎯 OVERVIEW

Instead of deploying Redis on a VPS for caching, we'll leverage **Cloudflare's edge network** for:
- Global CDN with 270+ locations
- Edge caching via Workers + Cache API
- R2 object storage (zero egress fees)
- Image optimization (Cloudflare Images)
- DDoS protection included

**Cost Comparison:**
- **Redis VPS**: $12/month + maintenance
- **Cloudflare**: $0-5/month (Workers free tier is generous)

**Performance:**
- Redis: Single location (NYC or SF)
- Cloudflare: 270+ global edge locations

---

## 🏗️ ARCHITECTURE

### Current Flow (Without Caching)
```
User Browser
    ↓
Vercel Edge Function
    ↓
MongoDB (DigitalOcean NYC3)
    ↓
Response (200-500ms)
```

### New Flow (With Cloudflare)
```
User Browser
    ↓
Cloudflare Edge (nearest location)
    ├─ Cache HIT → Return (10-50ms) ✅
    └─ Cache MISS:
        ↓
    Cloudflare Worker
        ├─ Check R2 Storage
        │   ├─ HIT → Return + Cache at Edge
        │   └─ MISS:
        │       ↓
        │   Vercel Edge Function
        │       ↓
        │   MongoDB (DigitalOcean)
        │       ↓
        │   Store in R2 + Edge Cache
        │       ↓
        │   Return Response
```

**Cache Layers:**
1. **Edge Cache** (Cloudflare PoPs): 1-5 min TTL
2. **R2 Storage** (Durable): 5-15 min TTL
3. **MongoDB** (Source of truth): Always fresh

---

## 📦 CLOUDFLARE SERVICES BREAKDOWN

### 1. Cloudflare Workers
**Purpose:** Serverless edge compute for cache logic

**Features:**
- Runs at 270+ locations globally
- 10ms CPU time free tier (plenty for our use)
- Automatic scaling
- KV storage included (100k reads/day free)

**Use Cases:**
- Listings API caching
- Image URL transformation
- Cache purging on MLS updates

**File:** `workers/listings-api.js`

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Only cache GET requests
    if (request.method !== 'GET') {
      return fetch(request)
    }

    // Create cache key from URL + filters
    const cacheKey = new Request(url.toString(), {
      method: 'GET',
      headers: request.headers
    })

    // Try Cloudflare edge cache first
    const cache = caches.default
    let response = await cache.match(cacheKey)

    if (response) {
      console.log('Cache HIT at edge')
      return response
    }

    // Try R2 storage
    const r2Key = generateR2Key(url)
    const r2Object = await env.LISTINGS_CACHE.get(r2Key)

    if (r2Object) {
      console.log('Cache HIT in R2')
      response = new Response(r2Object.body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 min edge
          'CDN-Cache-Control': 'max-age=300'
        }
      })

      // Store in edge cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return response
    }

    // Cache MISS - fetch from origin (Vercel)
    console.log('Cache MISS - fetching from origin')
    response = await fetch(`${env.ORIGIN_URL}${url.pathname}${url.search}`, {
      headers: {
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP'),
        'User-Agent': request.headers.get('User-Agent')
      }
    })

    // Only cache successful responses
    if (response.ok) {
      const data = await response.clone().text()

      // Store in R2 (async)
      ctx.waitUntil(
        env.LISTINGS_CACHE.put(r2Key, data, {
          httpMetadata: {
            contentType: 'application/json'
          },
          customMetadata: {
            cachedAt: new Date().toISOString()
          }
        })
      )

      // Create cacheable response
      const cachedResponse = new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'CDN-Cache-Control': 'max-age=300',
          'X-Cache': 'MISS'
        }
      })

      // Store in edge cache (async)
      ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()))

      return cachedResponse
    }

    return response
  }
}

function generateR2Key(url) {
  // Create unique key from path + query params
  const params = new URLSearchParams(url.search)

  // Extract important params for caching
  const bounds = [
    params.get('north'),
    params.get('south'),
    params.get('east'),
    params.get('west')
  ].join(',')

  const filters = [
    params.get('beds'),
    params.get('baths'),
    params.get('minPrice'),
    params.get('maxPrice')
  ].filter(Boolean).join('-')

  return `listings/${bounds}/${filters || 'all'}.json`
}
```

### 2. Cloudflare R2 Storage
**Purpose:** Durable object storage for cached listings

**Pricing:**
- Storage: $0.015/GB/month
- Operations: $4.50 per million reads (Class A)
- **Egress: $0** (unlike S3!)

**Estimated Costs:**
- 10GB cached listings: $0.15/month
- 10M reads/month: $45/month
- **Total: ~$45/month** vs S3 egress ($90+)

**Setup:**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create R2 bucket
wrangler r2 bucket create listings-cache

# Create bucket for images (optional)
wrangler r2 bucket create mls-photos
```

**wrangler.toml:**
```toml
name = "jpsrealtor-listings-api"
main = "workers/listings-api.js"
compatibility_date = "2025-12-03"

[[r2_buckets]]
binding = "LISTINGS_CACHE"
bucket_name = "listings-cache"
preview_bucket_name = "listings-cache-preview"

[vars]
ORIGIN_URL = "https://jpsrealtor.com"

[env.production]
vars = { ORIGIN_URL = "https://jpsrealtor.com" }

[env.staging]
vars = { ORIGIN_URL = "https://staging.jpsrealtor.com" }
```

### 3. Cloudflare Images
**Purpose:** Automatic image optimization & transformation

**Features:**
- Auto WebP/AVIF conversion
- Responsive sizing
- Quality optimization
- 40-60% bandwidth savings

**Pricing:**
- $5/month for 100k images
- $1 per 100k additional
- Delivery included (no bandwidth fees)

**Implementation:**

**Option A: URL Transform (Easiest)**
```typescript
// Original MLS photo
const original = "https://photos.sparkplatform.com/listing-123.jpg"

// Cloudflare automatic optimization
const optimized = `/cdn-cgi/image/width=800,quality=80,format=auto/${original}`

// Usage in component
<img
  src={optimized}
  srcSet={`
    /cdn-cgi/image/width=400,quality=80,format=auto/${original} 400w,
    /cdn-cgi/image/width=800,quality=80,format=auto/${original} 800w,
    /cdn-cgi/image/width=1200,quality=80,format=auto/${original} 1200w
  `}
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  alt="Listing photo"
/>
```

**Option B: Upload to Cloudflare Images**
```javascript
// One-time migration script
async function uploadToCloudflareImages() {
  const photos = await Photo.find({}).limit(1000)

  for (const photo of photos) {
    const response = await fetch(photo.uriLarge)
    const blob = await response.blob()

    const formData = new FormData()
    formData.append('file', blob)

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`
        },
        body: formData
      }
    )

    const result = await cfResponse.json()

    // Update photo record with Cloudflare URL
    await Photo.updateOne(
      { _id: photo._id },
      { cloudflareImageId: result.result.id }
    )
  }
}

// Access optimized images
const imageUrl = `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/public`
```

### 4. Cloudflare KV (Alternative to R2)
**Purpose:** Key-value storage for smaller cache items

**When to Use:**
- Small payloads (<25MB)
- Very high read frequency
- Need lowest latency

**Pricing:**
- $0.50 per million reads
- Storage: $0.50/GB/month
- Cheaper than R2 for high-read, small-data scenarios

**Example Use Case:**
```javascript
// Cache city/subdivision metadata
await env.GEO_CACHE.put('city:palm-desert', JSON.stringify({
  name: 'Palm Desert',
  bounds: { north: 33.8, south: 33.7, east: -116.3, west: -116.4 },
  stats: { avgPrice: 650000, totalListings: 1247 }
}), {
  expirationTtl: 86400 // 24 hours
})

// Retrieve
const cached = await env.GEO_CACHE.get('city:palm-desert', 'json')
```

---

## 🔄 CACHE INVALIDATION STRATEGY

### On MLS Data Updates
**Problem:** New listings come in every 12 hours, cache must be purged

**Solution 1: TTL-Based (Simplest)**
```
Edge Cache: 5 min TTL
R2 Storage: 15 min TTL

Stale data at most: 15 minutes (acceptable)
```

**Solution 2: Active Purging (Best)**
```javascript
// After MLS sync completes
async function purgeCacheAfterSync() {
  // Purge Cloudflare cache by tag
  await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tags: ['listings', 'mls-data']
      })
    }
  )

  // Clear R2 cache
  const list = await env.LISTINGS_CACHE.list({ prefix: 'listings/' })
  for (const object of list.objects) {
    await env.LISTINGS_CACHE.delete(object.key)
  }

  console.log('Cache purged after MLS sync')
}
```

**Add cache tags to responses:**
```javascript
// In Worker
const response = new Response(data, {
  headers: {
    'Cache-Control': 'public, max-age=300',
    'Cache-Tag': 'listings,mls-data'
  }
})
```

### On Individual Listing Updates
```javascript
// When listing price changes or goes pending
async function invalidateListingCache(listingKey) {
  // Purge specific URLs that contain this listing
  await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: [
          `https://jpsrealtor.com/api/mls-listings/${listingKey}`,
          // Purge tiles that might contain this listing
          // (requires tracking which tiles a listing appears in)
        ]
      })
    }
  )
}
```

---

## 📊 CACHE EFFECTIVENESS METRICS

### Expected Cache Hit Rates
Based on typical user behavior:

**Zoom Level 8-10 (Region view):**
- Cache Hit Rate: 90%+ (users browse same regions)
- Edge Latency: 10-20ms
- Bandwidth Savings: 95%

**Zoom Level 11-12 (Neighborhood):**
- Cache Hit Rate: 70-80%
- Edge Latency: 20-30ms
- Bandwidth Savings: 75%

**Zoom Level 13+ (Street view):**
- Cache Hit Rate: 40-50% (more dynamic)
- Edge Latency: 30-50ms
- Bandwidth Savings: 45%

### Cost Savings Estimate

**Before (No CDN):**
- Vercel bandwidth: 100GB/month = $40
- MongoDB queries: 10M/month (stresses DB)
- Total: $40/month + DB strain

**After (Cloudflare):**
- Cloudflare bandwidth: Free
- R2 storage: $0.15/month (10GB)
- R2 reads: $4.50/month (1M uncached)
- MongoDB queries: 1M/month (90% reduction!)
- **Total: ~$5/month** + healthier DB

**Savings: $35/month + improved performance**

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: Setup (Week 1)
- [ ] Create Cloudflare account (if not exists)
- [ ] Add jpsrealtor.com to Cloudflare DNS
- [ ] Create R2 bucket: `listings-cache`
- [ ] Set up Wrangler CLI locally
- [ ] Create Worker: `listings-api`
- [ ] Deploy to staging first

### Phase 2: Implementation (Week 2)
- [ ] Implement Worker caching logic
- [ ] Add R2 storage layer
- [ ] Configure cache TTLs (5 min edge, 15 min R2)
- [ ] Add cache tag system
- [ ] Test cache hit rates in staging

### Phase 3: Integration (Week 3)
- [ ] Update MLS sync script to purge cache
- [ ] Add cache invalidation on listing updates
- [ ] Implement Cloudflare Images for photos
- [ ] Migrate photo URLs to Cloudflare transforms
- [ ] Monitor cache effectiveness

### Phase 4: Production (Week 4)
- [ ] Deploy Worker to production
- [ ] Update DNS to route /api/* through Worker
- [ ] Monitor Cloudflare analytics
- [ ] A/B test performance (with/without cache)
- [ ] Document cache behavior

---

## 🔧 CONFIGURATION FILES

### wrangler.toml
```toml
name = "jpsrealtor-listings-api"
main = "workers/listings-api.js"
compatibility_date = "2025-12-03"
account_id = "your-account-id"

# R2 Bindings
[[r2_buckets]]
binding = "LISTINGS_CACHE"
bucket_name = "listings-cache"

[[r2_buckets]]
binding = "MLS_PHOTOS"
bucket_name = "mls-photos"

# Environment Variables
[vars]
ORIGIN_URL = "https://jpsrealtor.com"
CACHE_ENABLED = "true"

# Production environment
[env.production]
name = "jpsrealtor-listings-api-prod"
vars = {
  ORIGIN_URL = "https://jpsrealtor.com",
  CACHE_ENABLED = "true"
}

# Staging environment
[env.staging]
name = "jpsrealtor-listings-api-staging"
vars = {
  ORIGIN_URL = "https://staging-jpsrealtor.vercel.app",
  CACHE_ENABLED = "true"
}

# Routes (which URLs trigger the Worker)
[[routes]]
pattern = "jpsrealtor.com/api/mls-listings*"
zone_name = "jpsrealtor.com"

[[routes]]
pattern = "jpsrealtor.com/api/listings/*"
zone_name = "jpsrealtor.com"
```

### .dev.vars (Local development)
```
ORIGIN_URL=http://localhost:3000
CACHE_ENABLED=false
CF_API_TOKEN=your-api-token
ZONE_ID=your-zone-id
```

---

## 📈 MONITORING & ANALYTICS

### Cloudflare Dashboard Metrics
- Requests per second
- Cache hit rate (edge + R2)
- Bandwidth saved
- Worker CPU time used
- R2 operations count

### Custom Logging in Worker
```javascript
export default {
  async fetch(request, env, ctx) {
    const start = Date.now()
    const response = await handleRequest(request, env, ctx)
    const duration = Date.now() - start

    // Log to Cloudflare Analytics Engine
    ctx.waitUntil(
      env.ANALYTICS.writeDataPoint({
        indexes: [request.url],
        blobs: [request.method],
        doubles: [duration],
        timestamp: Date.now()
      })
    )

    return response
  }
}
```

### Alerts to Set Up
- Cache hit rate drops below 60%
- R2 read operations spike (>100k/hour)
- Worker errors exceed 1%
- Edge latency >100ms (p95)

---

## 🎯 SUCCESS CRITERIA

**Performance Targets:**
- [ ] 80%+ cache hit rate at edge
- [ ] <50ms p95 latency (from edge)
- [ ] 90% reduction in MongoDB queries
- [ ] 40-60% bandwidth savings on images

**Cost Targets:**
- [ ] <$10/month Cloudflare costs
- [ ] $30+ savings on bandwidth
- [ ] Reduce MongoDB load (improve free tier headroom)

**User Experience:**
- [ ] Map loads 2-3x faster
- [ ] Images load with optimized formats (WebP/AVIF)
- [ ] No stale data issues (proper cache invalidation)

---

## 🔗 REFERENCES

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Images Docs](https://developers.cloudflare.com/images/)
- [Cache API Docs](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

**This replaces the Redis VPS caching strategy outlined in master-plan.md Phase 4.**
**Cloudflare provides superior global performance at lower cost with zero maintenance overhead.**
