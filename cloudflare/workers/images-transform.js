/**
 * Cloudflare Worker: Image Transformation & Optimization
 *
 * This Worker handles MLS listing images with:
 * - Automatic WebP/AVIF conversion
 * - Responsive image resizing
 * - Quality optimization
 * - CDN caching
 *
 * Cloudflare Images pricing: $5/month for 100K images, $1 per 100K deliveries
 * Current need: ~32K listings × 20 photos avg = 640K images
 * Cost: ~$5-10/month (vs Vercel image optimization)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Extract image parameters from query string
    const width = url.searchParams.get('width') || 'auto';
    const height = url.searchParams.get('height') || 'auto';
    const quality = url.searchParams.get('quality') || '85';
    const format = url.searchParams.get('format') || 'auto';
    const fit = url.searchParams.get('fit') || 'cover';

    // Get the original image URL from path
    const imagePath = url.pathname.replace('/images/', '');
    const imageUrl = decodeURIComponent(imagePath);

    // Validate image URL
    if (!imageUrl || !isValidImageUrl(imageUrl)) {
      return new Response('Invalid image URL', { status: 400 });
    }

    // Check edge cache first
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (response) {
      return new Response(response.body, {
        ...response,
        headers: {
          ...Object.fromEntries(response.headers),
          'X-Cache': 'HIT'
        }
      });
    }

    try {
      // Fetch and transform image using Cloudflare Images
      const transformedImage = await fetch(imageUrl, {
        cf: {
          image: {
            width: width === 'auto' ? undefined : parseInt(width),
            height: height === 'auto' ? undefined : parseInt(height),
            quality: parseInt(quality),
            format: format, // 'auto' enables WebP/AVIF based on Accept header
            fit: fit,
            metadata: 'none', // Strip EXIF data for privacy
            sharpen: 1.0,
          }
        }
      });

      if (!transformedImage.ok) {
        throw new Error(`Failed to transform image: ${transformedImage.status}`);
      }

      // Create cacheable response
      response = new Response(transformedImage.body, {
        headers: {
          'Content-Type': transformedImage.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
          'X-Cache': 'MISS',
          'Access-Control-Allow-Origin': '*',
        }
      });

      // Cache for 1 year (images are immutable)
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;

    } catch (error) {
      console.error('Image transformation error:', error);

      // Fallback: return original image without transformation
      try {
        const originalImage = await fetch(imageUrl);
        return new Response(originalImage.body, {
          headers: {
            'Content-Type': originalImage.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'ERROR-FALLBACK',
          }
        });
      } catch (fallbackError) {
        return new Response('Image not found', { status: 404 });
      }
    }
  }
};

/**
 * Validate image URL
 */
function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
    return validExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext));
  } catch {
    return false;
  }
}
