/**
 * Cloudflare Worker: Listings API Cache
 *
 * This Worker implements a multi-tier caching strategy:
 * 1. Edge Cache (5 minutes) - Fastest, 270+ global locations
 * 2. R2 Storage (15 minutes) - S3-compatible object storage, zero egress fees
 * 3. Origin MongoDB (fallback) - Your DigitalOcean MongoDB Atlas instance
 *
 * Expected Performance:
 * - Edge hit: <50ms
 * - R2 hit: 100-200ms
 * - Origin hit: 500-1000ms
 * - 80%+ cache hit rate expected
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only cache GET requests
    if (request.method !== 'GET') {
      return fetch(request);
    }

    // Generate cache key
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // ===== TIER 1: Edge Cache Check =====
    let response = await cache.match(cacheKey);
    if (response) {
      console.log('✅ Cache HIT at edge', url.pathname);
      return new Response(response.body, {
        ...response,
        headers: {
          ...Object.fromEntries(response.headers),
          'X-Cache': 'HIT-EDGE',
          'X-Cache-Age': response.headers.get('age') || '0'
        }
      });
    }

    // ===== TIER 2: R2 Storage Check =====
    const r2Key = generateR2Key(url);
    const r2Object = await env.LISTINGS_CACHE.get(r2Key);

    if (r2Object) {
      console.log('✅ Cache HIT at R2', r2Key);
      const body = await r2Object.text();

      response = new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-Cache': 'HIT-R2',
          'Access-Control-Allow-Origin': '*'
        }
      });

      // Store in edge cache for next request
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    // ===== TIER 3: Fetch from Origin =====
    console.log('❌ Cache MISS, fetching from origin', url.pathname);
    const originUrl = `${env.ORIGIN_URL}${url.pathname}${url.search}`;

    try {
      response = await fetch(originUrl, {
        headers: {
          'User-Agent': 'Cloudflare-Worker-Cache/1.0',
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
        }
      });

      if (!response.ok) {
        console.error('Origin returned error:', response.status);
        return response;
      }

      // Clone response for caching
      const data = await response.text();

      // Store in R2 (15 minute TTL)
      ctx.waitUntil(
        env.LISTINGS_CACHE.put(r2Key, data, {
          httpMetadata: {
            contentType: 'application/json',
          },
          customMetadata: {
            'cached-at': new Date().toISOString(),
            'origin-url': originUrl
          }
        })
      );

      // Create cacheable response
      const cachedResponse = new Response(data, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-Cache': 'MISS',
          'Access-Control-Allow-Origin': '*'
        }
      });

      // Store in edge cache
      ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

      return cachedResponse;

    } catch (error) {
      console.error('Error fetching from origin:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch from origin',
        message: error.message
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Generate R2 key from URL
 * Pattern: listings/{endpoint}/{hash}.json
 */
function generateR2Key(url) {
  const path = url.pathname.replace('/api/', '');
  const query = url.search;

  // Create hash from path + query for uniqueness
  const hashInput = path + query;
  const hash = simpleHash(hashInput);

  // Extract endpoint name
  const endpoint = path.split('/')[0] || 'default';

  return `listings/${endpoint}/${hash}.json`;
}

/**
 * Simple hash function for cache keys
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
