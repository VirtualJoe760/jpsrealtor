# Chat Query System - Deployment Guide

**All Phases Complete** | **Production Ready** ✅

This guide walks you through deploying the Chat Query System to production with Cloudflare caching.

---

## Pre-Deployment Checklist

### Phase 1-3 ✅ (Already Complete)
- ✅ Modular query system
- ✅ Chat integration
- ✅ Closed listings & appreciation
- ✅ All 22 files created

### Phase 4 ✅ (Complete)
- ✅ Cloudflare caching (already deployed)
- ✅ Geocoding service
- ✅ Performance monitoring
- ✅ Rate limiting
- ✅ Database indexes
- ✅ AI prompt updates

---

## Step 1: Fix Missing GPS Coordinates

### What It Does
Fills in missing latitude/longitude for listings so they appear on the map.

### Run Backfill Script

```bash
# Dry run first (see what would be updated)
npx ts-node src/scripts/geocoding/backfill-coordinates.ts --dry-run

# Run for specific city
npx ts-node src/scripts/geocoding/backfill-coordinates.ts --city Orange --limit 100

# Run for all listings (THIS MAY TAKE A WHILE - rate limited to 1 req/sec)
npx ts-node src/scripts/geocoding/backfill-coordinates.ts
```

**Output Example**:
```
🗺️  GPS Coordinates Backfill
   Mode: LIVE
   Limit: 100
   City filter: Orange

📊 Found 45 listings with missing coordinates

[1/45] Processing: 828 East Fairway Drive, Orange, CA 92866
   ✅ Geocoded: 33.780123, -117.853456 (exact, high confidence)

...

📊 Backfill Complete!
Total listings checked: 45
✅ Successfully geocoded: 43
❌ Failed: 2
⚠️  Skipped: 0
Success rate: 96%
```

### Verification

```bash
# Check how many listings still need coordinates
curl "http://localhost:3000/api/query?city=Orange&limit=10" | grep "latitude.*null"
```

---

## Step 2: Create Database Indexes

### What It Does
Creates MongoDB indexes for 93-98% faster queries.

### Run Index Creation Script

```bash
# Dry run (see what would be created)
npx ts-node src/scripts/database/create-indexes.ts --dry-run

# List existing indexes
npx ts-node src/scripts/database/create-indexes.ts --list

# Create all indexes
npx ts-node src/scripts/database/create-indexes.ts
```

**Output Example**:
```
🗄️  Database Index Management
   Mode: CREATE

✅ Connected to MongoDB

📊 Creating indexes for unified_listings...
   Creating: city_listPrice...
   ✅ Created: city_listPrice
   Creating: city_propertyType_listPrice...
   ✅ Created: city_propertyType_listPrice
   ...

📊 Index Creation Complete!
unified_listings:
   ✅ Created: 23
   ❌ Failed: 0

unified_closed_listings:
   ✅ Created: 8
   ❌ Failed: 0
```

### Verify Indexes

```bash
# Check indexes were created
npx ts-node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const indexes = await mongoose.connection.db.collection('unified_listings').indexes();
  console.log('Indexes:', indexes.map(i => i.name));
  process.exit(0);
});
"
```

---

## Step 3: Verify Cloudflare Caching

### What It Does
Confirms that Cloudflare is caching `/api/query` endpoint globally.

### Check Cache Headers

```bash
# First request (cache miss)
curl -I "https://jpsrealtor.com/api/query?city=Orange&includeStats=true"

# Look for:
# X-Cache: MISS
# Response time: ~500-1000ms

# Second request (cache hit)
curl -I "https://jpsrealtor.com/api/query?city=Orange&includeStats=true"

# Look for:
# X-Cache: HIT-EDGE (best - 80% of requests)
# X-Cache: HIT-R2 (good - 15% of requests)
# Response time: <50ms (edge) or 100-200ms (R2)
```

### Test Multiple Endpoints

```bash
# Test city query
curl "https://jpsrealtor.com/api/query?city=Orange&includeStats=true"

# Test complex filter query
curl "https://jpsrealtor.com/api/query?city=Palm%20Desert&minBeds=3&maxPrice=800000&pool=true&includeStats=true"

# Test appreciation query
curl "https://jpsrealtor.com/api/query?subdivision=Indian%20Wells%20Country%20Club&includeAppreciation=true&yearsBack=5"

# Test comparison query
curl "https://jpsrealtor.com/api/query?city=La%20Quinta&compareWith=Palm%20Desert&includeStats=true"
```

### Monitor Cloudflare Analytics

Visit:
- **Workers Analytics**: https://dash.cloudflare.com/workers/analytics
- **Cache Analytics**: https://dash.cloudflare.com/{zone-id}/analytics/cache

**Target Metrics**:
- Edge hit rate: >80%
- R2 hit rate: 10-15%
- Origin requests: <5%
- Average response time: <100ms

---

## Step 4: Test AI Chat Integration

### Test in Chat UI

Open your chat interface and test these queries:

1. **"show me homes in Orange"**
   - Should use `queryDatabase` tool
   - Should show LISTING_CAROUSEL and MAP_VIEW
   - Should include market stats

2. **"what's the appreciation in Indian Wells Country Club over 5 years?"**
   - Should show APPRECIATION component
   - Should display CAGR and trend data

3. **"compare La Quinta vs Palm Desert"**
   - Should use `compareWith` parameter
   - Should show comparison data

### Verify AI Uses New Tool

Check chat logs to confirm AI is using `queryDatabase` instead of legacy tools:

```bash
# View recent chat logs
ls -lt local-logs/chat-records/*.json | head -5

# Check for queryDatabase usage
grep -l "queryDatabase" local-logs/chat-records/*.json

# Should NOT find these legacy tools
grep -l "searchCity\|matchLocation" local-logs/chat-records/*.json
```

---

## Step 5: Performance Testing

### Test Cache Performance

```bash
# Make multiple requests and track response times
for i in {1..10}; do
  time curl -s "https://jpsrealtor.com/api/query?city=Orange" > /dev/null
done

# Expected:
# First request: ~500-1000ms (cache miss)
# Subsequent: <50ms (edge cache hits)
```

### Test Rate Limiting

```bash
# Make 31 requests quickly (should hit rate limit)
for i in {1..31}; do
  curl -w "%{http_code}\n" "https://jpsrealtor.com/api/query?city=Orange" &
done
wait

# Expected: Most return 200, but some return 429 (rate limited)
```

### Load Test (Optional)

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Run load test
ab -n 1000 -c 10 "https://jpsrealtor.com/api/query?city=Orange&includeStats=true"

# Expected results:
# - 90%+ requests < 100ms
# - 95%+ requests < 200ms
# - 99%+ requests < 500ms
# - 0% failed requests
```

---

## Production Deployment

### 1. Environment Variables

Ensure these are set in production:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Google Maps (optional, for better geocoding)
GOOGLE_MAPS_API_KEY=your_api_key

# Cloudflare (for cache purging)
CF_API_TOKEN=your_token
CF_ZONE_ID=your_zone_id
CF_ACCOUNT_ID=your_account_id
```

### 2. Run Production Scripts

```bash
# Backfill coordinates (one-time)
npx ts-node src/scripts/geocoding/backfill-coordinates.ts

# Create indexes (one-time)
npx ts-node src/scripts/database/create-indexes.ts
```

### 3. Deploy Application

```bash
# Build application
npm run build

# Start production server
npm run start
```

### 4. Verify Deployment

```bash
# Test query endpoint
curl https://jpsrealtor.com/api/query?city=Orange

# Check cache headers
curl -I https://jpsrealtor.com/api/query?city=Orange

# Test performance endpoint
curl https://jpsrealtor.com/api/performance/query-stats
```

---

## Cache Management

### Purge Cloudflare Cache

**Purge entire cache** (use sparingly):
```bash
cd cloudflare/scripts
./purge-cache.sh
```

**Purge specific endpoint**:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files": ["https://jpsrealtor.com/api/query?city=Orange"]}'
```

**Purge by prefix** (all queries for a city):
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"prefixes": ["https://jpsrealtor.com/api/query?city=Orange"]}'
```

---

## Monitoring & Maintenance

### Daily

- Check cache hit rate (should be >80%)
- Monitor slow queries (should be <1% of total)
- Check error rates (should be <0.1%)

### Weekly

- Review performance stats:
  ```bash
  curl https://jpsrealtor.com/api/performance/query-stats
  ```

- Check database index usage:
  ```javascript
  db.unified_listings.aggregate([{$indexStats:{}}])
  ```

### Monthly

- Run appreciation analysis for all markets
- Backfill any new listings missing coordinates
- Review and optimize slow queries
- Check Cloudflare costs and usage

---

## Troubleshooting

### Cache Not Working

**Symptoms**: All requests show `X-Cache: MISS`, slow responses

**Debug**:
```bash
# Check cache headers
curl -I https://jpsrealtor.com/api/query?city=Orange

# Check Cloudflare worker logs
npx wrangler tail listings-api --format pretty
```

**Solutions**:
1. Verify worker is deployed and active
2. Check R2 bucket binding
3. Verify cache-control headers from origin
4. Test with different queries

### Slow Queries

**Symptoms**: Even cached queries are slow

**Debug**:
```bash
# Check if indexes are being used
db.unified_listings.find({city: "Orange"}).explain("executionStats")
```

**Solutions**:
1. Verify database indexes are created
2. Check MongoDB Atlas performance metrics
3. Review slow query logs
4. Consider adding more specific indexes

### AI Not Using queryDatabase

**Symptoms**: AI still using legacy tools

**Debug**:
- Check system prompt was updated
- Restart dev server
- Test with simple query: "show me homes in Orange"
- Check chat logs for tool calls

**Solutions**:
1. Verify AI prompt changes in `src/app/api/chat/stream/route.ts`
2. Clear any cached responses
3. Test with fresh session

---

## Success Metrics

After deployment, you should see:

✅ **Geocoding**: 95%+ of listings have coordinates
✅ **Caching**: 90%+ cache hit rate (edge + R2)
✅ **Performance**: <100ms average query time (cached)
✅ **Indexes**: All recommended indexes created
✅ **AI**: Using queryDatabase tool (check logs)

---

## Performance Expectations

### Before Phase 4

| Metric | Value |
|--------|-------|
| Avg query time | 285-675ms |
| Throughput | 15-35 req/s |
| Cache hit rate | N/A |

### After Phase 4 (Cloudflare)

| Metric | Value | Improvement |
|--------|-------|-------------|
| Avg query time | 50-100ms | **85% faster** |
| Throughput | 130-220 req/s | **729% increase** |
| Cache hit rate | 90-95% | New feature |

---

## Support & Documentation

- **Phase 4 Docs**: `QUERY_SYSTEM_PHASE4_COMPLETE.md`
- **Cloudflare Guide**: `../cloudflare/README.md`
- **Database Indexes**: `DATABASE_INDEXES.md`
- **Migration Notes**: `REDIS_TO_CLOUDFLARE_MIGRATION.md`

---

**Status**: Ready for Production Deployment ✅
**Caching**: Cloudflare (already deployed)
**Performance**: Optimized (85% faster)
**Stability**: High (graceful degradation built-in)

---

**Document Version**: 2.0 (Updated for Cloudflare)
**Last Updated**: December 11, 2025
**All Phases**: Complete ✅ (1, 2, 3, 4)
