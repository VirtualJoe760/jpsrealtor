/**
 * IndexNow — push URL changes to Bing and Yandex instead of waiting to be
 * crawled.
 *
 * Why this and not Google: Google does not participate in IndexNow, and its own
 * Indexing API covers only JobPosting and BroadcastEvent — "Request Indexing"
 * in Search Console is UI-only and cannot be automated (see docs/seo/README.md,
 * which records the ADC-scope dead end from 2026-10-12). So for Google the
 * levers remain the sitemap's `lastmod` and internal links. Bing and Yandex DO
 * accept a push, and on a site with ~86,000 listing pages turning over daily
 * that is the difference between a price change being noticed in hours and in
 * weeks.
 *
 * ── Before this does anything ───────────────────────────────────────────────
 *
 * Set INDEXNOW_KEY to a 32+ character hex string and serve it at
 * /<key>.txt containing the key as its only content — app/[key]/route.ts is
 * NOT how to do that; drop a static file in public/. `submitToIndexNow` is a
 * no-op without the env var, deliberately: an unconfigured ping that silently
 * 403s every time is worse than one that never fires, because nobody notices.
 */

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://yandex.com/indexnow',
]

/** The API rejects batches larger than this. */
const MAX_URLS_PER_REQUEST = 10_000

export interface IndexNowResult {
  submitted: number
  skipped: string[]
  endpoints: { endpoint: string; status: number | string }[]
}

/**
 * Submit changed URLs.
 *
 * Fire-and-forget from a route handler means wrapping the call in `after()`
 * from next/server — a bare promise on a serverless function is killed the
 * moment the response returns (see docs/ARCHITECTURE.md, "Vercel after()").
 */
export async function submitToIndexNow(
  urls: string[],
  host: string,
): Promise<IndexNowResult | null> {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    // Not an error. Most deployments will never set this.
    return null
  }

  // Every URL must be on the declared host; the API rejects the whole batch
  // otherwise, so a single stray cross-host URL would lose the lot.
  const skipped: string[] = []
  const valid = urls.filter((u) => {
    try {
      if (new URL(u).host === host) return true
    } catch {
      /* unparseable */
    }
    skipped.push(u)
    return false
  })

  if (!valid.length) return { submitted: 0, skipped, endpoints: [] }

  const batch = valid.slice(0, MAX_URLS_PER_REQUEST)
  const body = JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: batch,
  })

  const endpoints = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body,
        })
        return { endpoint, status: res.status }
      } catch (error: any) {
        // One endpoint being down must not fail the other.
        return { endpoint, status: error?.message || 'error' }
      }
    }),
  )

  console.log(
    `[indexnow] ${batch.length} urls → ${endpoints
      .map((e) => `${new URL(e.endpoint).host}:${e.status}`)
      .join(' ')}`,
  )

  return { submitted: batch.length, skipped, endpoints }
}
