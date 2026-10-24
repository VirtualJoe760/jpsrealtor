/**
 * Complete-by-construction page metadata.
 *
 * ── The bug this file exists to make unrepeatable ────────────────────────────
 *
 * Next.js metadata MERGES field by field. A page that exports only
 * `{ title, description, alternates }` inherits `openGraph`, `twitter` and
 * `keywords` from the nearest ancestor that set them. Every neighborhood route
 * did exactly that, and `app/neighborhoods/layout.tsx` carried a hardcoded
 * Coachella Valley block — so /neighborhoods/riverside served a correct
 * <title> alongside:
 *
 *   og:title       "Coachella Valley Neighborhoods | Palm Desert, Indian Wells…"
 *   og:description generic CV copy
 *   og:image       la-quinta.jpg            (for every city in the state)
 *   keywords       a list of CV city names  (on a page about Riverside)
 *
 * Social shares and Google's own preview read og:*, so the pages were
 * presenting themselves as duplicates of one CV hub page. The layout block is
 * gone, but a page that sets `title` without `openGraph.title` will silently
 * reintroduce the same class of bug against the ROOT layout instead. So place
 * pages do not hand-roll Metadata any more: they call through here, where the
 * og/twitter pair cannot drift from the title because they are derived from it.
 *
 * Sitewide `keywords` is dropped on purpose. Google has ignored the meta
 * keywords tag since 2009, and the values here were actively wrong.
 */

import type { Metadata } from 'next'

export interface PlaceMetadataInput {
  /** The <title>. og:title and twitter:title are derived from it. */
  title: string
  /** The meta description. Truncated to ~155 chars for og/twitter parity. */
  description: string
  /** Absolute canonical URL. */
  canonical: string
  /** Absolute og:image URL. Falls back to the place OG card when omitted. */
  image?: string
  imageAlt?: string
  /** False emits `noindex, follow` — see lib/indexability.ts. */
  index?: boolean
  siteName?: string
}

/** Google truncates around 155–160 chars; og previews clip sooner. */
export const META_DESCRIPTION_MAX = 155

/**
 * Trim to a whole word under the limit. Subdivision pages were shipping their
 * entire ~600-character About paragraph as the meta description, which Google
 * truncates mid-sentence and which gave the snippet no claim worth reading.
 */
export function truncateDescription(text: string, max = META_DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`
}

export function buildPlaceMetadata(input: PlaceMetadataInput): Metadata {
  const description = truncateDescription(input.description)
  const images = input.image
    ? [{ url: input.image, width: 1200, height: 630, alt: input.imageAlt || input.title }]
    : undefined

  return {
    title: input.title,
    description,
    // `null` is how Next.js REMOVES an inherited field rather than merging it.
    // Without this the root layout's keywords ride along on every place page.
    keywords: null,
    alternates: { canonical: input.canonical },
    robots:
      input.index === false
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: input.canonical,
      // Identical to <title> by construction. This is the field that was wrong
      // on every neighborhood page.
      title: input.title,
      description,
      ...(input.siteName && { siteName: input.siteName }),
      ...(images && { images }),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description,
      ...(images && { images: images.map((i) => i.url) }),
    },
  }
}

/**
 * URL of the generated share card for a place.
 *
 * Why generated rather than photographic: there is no per-city photo to use.
 * `cities.photo` is empty for all 1,047 rows, `public/city-images/` does not
 * exist in this deployment, and the only images actually available per city are
 * MLS listing photos — which belong to other brokerages and are not ours to
 * repurpose as page artwork (see AGENTS.md §7). A rendered card is unique per
 * page, always present, and carries the numbers that make the page worth
 * opening.
 */
export function placeOgImageUrl(
  baseUrl: string,
  params: {
    name: string
    region?: string
    activeCount?: number | null
    medianPrice?: number | null
  },
): string {
  const q = new URLSearchParams({ name: params.name })
  if (params.region) q.set('region', params.region)
  if (params.activeCount != null) q.set('count', String(params.activeCount))
  if (params.medianPrice != null) q.set('median', String(params.medianPrice))
  return `${baseUrl}/api/og/place?${q.toString()}`
}
