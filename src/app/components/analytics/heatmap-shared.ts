/**
 * Types, constants and the colour ramp shared by the Analytics tab shell and
 * the Leaflet map.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * It imports nothing from Leaflet, on purpose. `SalesHeatMap` is loaded with
 * `dynamic(..., { ssr: false })` because Leaflet touches `window` at module
 * scope — but the shell also needed CELL_ZOOM and the ramp, and importing those
 * as VALUES from the map module pulls leaflet, react-leaflet and leaflet.heat
 * straight back into the parent chunk, defeating the split entirely. A
 * `import type` would have been erased; `CELL_ZOOM` is not a type.
 */

export interface GridCell {
  lat: number
  lng: number
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  sales: number
  medianClosePrice: number | null
  medianPricePerSqft: number | null
  caption: { label: string; kind: string; reason: string }
  city: string | null
  postalCode: string | null
}

export interface Hotspot {
  zoneId: string
  rank: number
  lat: number
  lng: number
  radiusMiles: number
  sales: number
  cellCount: number
  label: string
  labelKind: string
  city: string | null
  postalCode: string | null
  medianClosePrice: number | null
  medianPricePerSqft: number | null
  partialYear: boolean
  yearMonthsCovered: number | null
  /** Resolved server-side; see zoneLookupKey. Null when the zone has no key. */
  lookup: { scope: string; key: string; wider: boolean } | null
}

export interface Viewport {
  bbox: string
  zoom: number
}

/**
 * Zoom at which the map switches from the radial heat view to individual cells.
 *
 * Below this you are asking "where is it hot" and a blur answers best; at or
 * above it you are asking "what is this specific block", and a rectangle you
 * can click answers that. Zones and pins ride with the blur.
 */
export const CELL_ZOOM = 12

/**
 * The heat ramp: cold blue → hot red, via cyan, green, yellow and orange.
 *
 * This is Google's **Turbo**, sampled at 11 stops — not the single-hue blue the
 * first version shipped with. The request was explicitly "red for hot, blue for
 * cold" with more range, and for a density map that is the right call: a
 * multi-hue ramp separates adjacent intensities far better than one hue's
 * light→dark steps, which is the whole job of a heat layer.
 *
 * The tradeoff, stated once so nobody re-litigates it: a multi-hue ramp makes
 * RELATIVE intensity easy to see and ABSOLUTE value hard to judge, because the
 * eye ranks lightness but not hue. So colour here is never the only carrier of
 * a number — every cell and zone has its count in a hover tooltip and in the
 * detail panel, and the legend is always on screen.
 *
 * Turbo specifically, rather than the classic jet rainbow: jet devotes a huge
 * perceptual stretch to green and has sharp false edges at the cyan and yellow
 * boundaries, which invent structure that is not in the data. Turbo was built
 * to fix exactly that while keeping the blue→red reading.
 */
export const HEAT_RAMP = [
  '#30123b', // 0.0  deep indigo — coldest
  '#4145ab', // 0.1
  '#4675ed', // 0.2  blue
  '#39a2fc', // 0.3
  '#1bcfd4', // 0.4  cyan
  '#24eca6', // 0.5
  '#61fc6c', // 0.6  green
  '#a4fc3b', // 0.7
  '#d1e834', // 0.78 yellow-green
  '#f3c63a', // 0.85 yellow
  '#fe9b2d', // 0.9  orange
  '#f36315', // 0.95
  '#c92903', // 1.0  red — hottest
]

/**
 * Dark-basemap variant: the two coldest indigo stops vanish against dark tiles,
 * so the ramp starts at the blue that is actually legible there. Same hues and
 * same direction — this is a floor, not a different palette, and not a flip.
 */
export const HEAT_RAMP_DARK = HEAT_RAMP.slice(2)

/** leaflet.heat wants { stop: colour }. Built from the same arrays, never a third list. */
export function heatGradient(dark: boolean): Record<number, string> {
  const ramp = dark ? HEAT_RAMP_DARK : HEAT_RAMP
  const out: Record<number, string> = {}
  ramp.forEach((c, i) => {
    // Start at 0.05 rather than 0 — leaflet.heat renders stop 0 across the
    // whole blurred tail, which paints a wash over empty desert.
    const t = 0.05 + (i / (ramp.length - 1)) * 0.95
    out[Number(t.toFixed(3))] = c
  })
  return out
}

/**
 * Colour for a discrete rectangle at high zoom.
 *
 * sqrt shapes the scale so a handful of very hot cells cannot flatten every
 * other cell onto the first stop. It affects colour only — never a number that
 * is reported anywhere.
 */
export function rampColor(weight: number, max: number, dark: boolean): string {
  const ramp = dark ? HEAT_RAMP_DARK : HEAT_RAMP
  if (max <= 0) return ramp[0]
  const t = Math.sqrt(Math.min(weight, max) / max)
  return ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]
}
