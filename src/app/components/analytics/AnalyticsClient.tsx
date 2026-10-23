'use client'

/**
 * The Analytics tab shell: map, year selector, layer toggles, ranked side list
 * and a detail panel.
 *
 * ── Theming ─────────────────────────────────────────────────────────────────
 *
 * This app does NOT use Tailwind's `dark:` variant. `tailwind.config` sets
 * darkMode to "class", but nothing ever puts `.dark` on an ancestor — themes
 * are named ("blackspace" / "lightgradient") and resolved through ThemeContext
 * into explicit class strings by `useThemeClasses()`.
 *
 * A first pass here used `dark:` utilities plus a `matchMedia` probe. Every
 * utility silently no-opped and the year selector rendered white-on-white on
 * the dark dashboard, because `bg-white` applied and `dark:bg-neutral-900`
 * never did. The probe was wrong independently: it read the OS setting, which
 * is not the same as the user's theme preference or a tenant theme lock.
 *
 * ── Honesty requirements ────────────────────────────────────────────────────
 *
 * Three, none of them decoration:
 *   1. 2026 is 11 of 12 months. Every surface showing a 2026 count says so,
 *      because a partial year otherwise reads as a market decline.
 *   2. A caption that fell back to city+ZIP explains why, so users see that the
 *      area is unnamed in the feed rather than concluding the map is broken.
 *   3. A zone resolved to its ZIP or city says those figures cover a wider area
 *      than the circle drawn on the map.
 *
 * Zone `rank` is global within a year, so every fetch is bounded by the current
 * viewport. Panning refetches; there is no unbounded "top areas" call.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext'
// From heatmap-shared, never from ./SalesHeatMap: importing a VALUE out of the
// map module pulls leaflet into this chunk and defeats the dynamic import.
import {
  CELL_ZOOM,
  HEAT_RAMP,
  HEAT_RAMP_DARK,
  type GridCell,
  type Hotspot,
  type Viewport,
} from './heatmap-shared'

// Leaflet touches `window` at module scope, so it can never be server-rendered.
const SalesHeatMap = dynamic(() => import('./SalesHeatMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-neutral-500/20" />,
})

/**
 * 2021 is deliberately absent: the closed archive starts mid-year and covers
 * only 3 months, so it is not comparable to any other entry in this list and a
 * selector is the wrong place to explain that.
 */
const YEAR_OPTIONS = [
  { value: 'all', label: 'All years' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
]

/** Palm Desert — the agent's market, not the statewide centroid. */
const DEFAULT_CENTER: [number, number] = [33.75, -116.37]
const DEFAULT_ZOOM = 11

interface AreaRow {
  key: string
  label: string
  city: string | null
  scope: string
  closedCount: number
  medianClosePrice: number | null
  medianPricePerSqft: number | null
  medianDaysOnMarket: number | null
  medianCloseToListRatio: number | null
  confidence: string | null
  partialYear: boolean
  yearMonthsCovered: number | null
}

type Selection =
  | { kind: 'zone'; zone: Hotspot; area: AreaRow | null; wider: boolean; loading: boolean }
  | { kind: 'cell'; cell: GridCell }
  | null

function usd(n: number | null | undefined): string {
  return n == null ? '—' : `$${n.toLocaleString()}`
}

function pct(n: number | null | undefined): string {
  return n == null ? '—' : `${(n * 100).toFixed(1)}%`
}

function kindLabel(kind: string): string {
  return kind === 'subdivision' ? 'community' : kind === 'city_zip' ? 'city + ZIP' : 'multiple communities'
}

export default function AnalyticsClient() {
  const { currentTheme } = useTheme()
  const { textPrimary, textSecondary, textMuted, border, hover } = useThemeClasses()
  const isLight = currentTheme === 'lightgradient'
  const dark = !isLight

  const panel = isLight ? 'bg-white' : 'bg-gray-950'
  const input = isLight
    ? 'border-slate-300 bg-white text-slate-900'
    : 'border-gray-700 bg-gray-900 text-white'
  const notice = isLight
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : 'border-amber-900/40 bg-amber-950/40 text-amber-200'
  const danger = isLight
    ? 'border-red-200 bg-red-50 text-red-800'
    : 'border-red-900/40 bg-red-950/40 text-red-200'

  const [year, setYear] = useState('2026')
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [cells, setCells] = useState<GridCell[]>([])
  const [zones, setZones] = useState<Hotspot[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showHeat, setShowHeat] = useState(true)
  const [showCells, setShowCells] = useState(true)
  const [showZones, setShowZones] = useState(true)
  const [showPins, setShowPins] = useState(true)

  // Layer defaults follow zoom until the user overrides them: zones read better
  // when zoomed out, individual cells when zoomed in.
  const [autoLayers, setAutoLayers] = useState(true)
  const zoom = viewport?.zoom ?? DEFAULT_ZOOM
  const zoomedIn = zoom >= CELL_ZOOM
  // Radial below CELL_ZOOM, discrete rectangles at or above it — the same
  // cells asked a different question. See SalesHeatMap's header.
  const effShowHeat = autoLayers ? !zoomedIn : showHeat
  const effShowCells = autoLayers ? zoomedIn : showCells
  const effShowZones = autoLayers ? !zoomedIn : showZones
  const effShowPins = autoLayers ? !zoomedIn : showPins

  // Panning fires moveend continuously; one in-flight fetch at a time.
  const reqId = useRef(0)

  const load = useCallback(async (vp: Viewport, yr: string) => {
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    try {
      const q = `bbox=${vp.bbox}&year=${yr}`
      const [gRes, hRes] = await Promise.all([
        fetch(`/api/analytics/sales-grid?${q}&minSales=1`),
        fetch(`/api/analytics/hotspots?${q}&limit=50`),
      ])
      if (id !== reqId.current) return // a newer pan superseded this one
      if (!gRes.ok || !hRes.ok) {
        const body = await (gRes.ok ? hRes : gRes).json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load analytics')
      }
      const g = await gRes.json()
      const h = await hRes.json()
      if (id !== reqId.current) return
      setCells(g.cells ?? [])
      setZones(h.zones ?? [])
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (viewport) load(viewport, year)
  }, [viewport, year, load])

  const onSelectZone = useCallback(
    async (zone: Hotspot) => {
      // The lookup is resolved server-side by zoneLookupKey and shipped with
      // the zone. Deriving it again here would be a second copy of a
      // case-sensitive key format that silently misses when it drifts.
      const lookup = zone.lookup
      const wider = lookup?.wider ?? false
      setSelection({ kind: 'zone', zone, area: null, wider, loading: Boolean(lookup) })
      if (!lookup) return
      try {
        const yr = year === 'all' ? '2026' : year
        const res = await fetch(
          `/api/analytics/areas?scope=${lookup.scope}&key=${encodeURIComponent(lookup.key)}&year=${yr}`,
        )
        const body = await res.json().catch(() => ({}))
        setSelection({ kind: 'zone', zone, area: res.ok ? body.area : null, wider, loading: false })
      } catch {
        setSelection({ kind: 'zone', zone, area: null, wider, loading: false })
      }
    },
    [year],
  )

  const partial = year === '2026'
  const unnamed = useMemo(() => zones.filter((z) => z.labelKind !== 'subdivision').length, [zones])

  return (
    // flex-1 + min-h-0 rather than a calc() on the viewport: the nav above is
    // not a fixed 4rem (it wraps on narrow widths), so a hardcoded offset
    // pushed the map legend below the fold. Let the page's flex column size it.
    <div className={`flex min-h-0 flex-1 flex-col ${textPrimary}`}>
      {/* Controls */}
      <div className={`flex flex-wrap items-center gap-3 border-b px-4 py-3 ${border}`}>
        <label className="flex items-center gap-2 text-sm">
          <span className={textSecondary}>Year</span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={`rounded border px-2 py-1 text-sm ${input}`}
          >
            {YEAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={autoLayers} onChange={(e) => setAutoLayers(e.target.checked)} />
          <span className={textSecondary}>Layers follow zoom</span>
        </label>

        {!autoLayers && (
          <>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
              <span className={textSecondary}>Heat</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} />
              <span className={textSecondary}>Cells</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
              <span className={textSecondary}>Zones</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={showPins} onChange={(e) => setShowPins(e.target.checked)} />
              <span className={textSecondary}>Pins</span>
            </label>
          </>
        )}

        <div className={`ml-auto flex items-center gap-3 text-xs ${textMuted}`}>
          {loading && <span>Loading…</span>}
          <span>
            {cells.length} cells · {zones.length} zones in view
          </span>
        </div>
      </div>

      {/* Honesty notes */}
      {partial && (
        <div className={`border-b px-4 py-2 text-xs ${notice}`}>
          2026 covers 11 of 12 months. Counts are not comparable to a full year without prorating.
        </div>
      )}
      {error && <div className={`border-b px-4 py-2 text-xs ${danger}`}>{error}</div>}

      <div className="flex min-h-0 flex-1">
        {/* Map */}
        <div className="relative min-w-0 flex-1">
          <SalesHeatMap
            cells={cells}
            zones={zones}
            showHeat={effShowHeat}
            showCells={effShowCells}
            showZones={effShowZones}
            showPins={effShowPins}
            dark={dark}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            onViewportChange={setViewport}
            onSelectZone={onSelectZone}
            onSelectCell={(cell) => setSelection({ kind: 'cell', cell })}
          />
          <div
            className={`pointer-events-none absolute bottom-8 left-3 z-[1000] rounded px-3 py-2 text-[11px] shadow ${panel} ${textPrimary}`}
          >
            <div className="mb-1 font-medium">
              Sales {year === 'all' ? '(all years)' : year}
              <span className={`ml-1 font-normal ${textMuted}`}>
                · {zoomedIn ? 'cells' : 'heat'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={textMuted}>cold</span>
              <span className="flex overflow-hidden rounded-sm">
                {(dark ? HEAT_RAMP_DARK : HEAT_RAMP).map((c) => (
                  <span key={c} className="inline-block h-3 w-3" style={{ background: c }} />
                ))}
              </span>
              <span className={textMuted}>hot</span>
            </div>
          </div>
        </div>

        {/* Side list + detail */}
        <aside className={`flex w-96 shrink-0 flex-col border-l ${border} ${panel}`}>
          {selection ? (
            <DetailPanel selection={selection} onClose={() => setSelection(null)} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div
                className={`sticky top-0 border-b px-4 py-2 text-xs font-medium ${border} ${panel} ${textSecondary}`}
              >
                Busiest zones in view
                {unnamed > 0 && (
                  <span className="font-normal">
                    {' '}
                    — {unnamed} of {zones.length} are unnamed in the feed
                  </span>
                )}
              </div>
              {zones.length === 0 && !loading && (
                <p className={`px-4 py-6 text-sm ${textMuted}`}>
                  No zones in this view. Zones need 25+ sales, so try zooming out.
                </p>
              )}
              <ul>
                {zones.map((z) => (
                  <li key={z.zoneId}>
                    <button
                      onClick={() => onSelectZone(z)}
                      className={`w-full border-b px-4 py-2.5 text-left ${border} ${hover}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{z.label}</span>
                        <span className="shrink-0 text-sm tabular-nums">{z.sales}</span>
                      </div>
                      <div className={`mt-0.5 flex items-center justify-between gap-2 text-xs ${textMuted}`}>
                        <span>{kindLabel(z.labelKind)}</span>
                        <span>median {usd(z.medianClosePrice)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function DetailPanel({
  selection,
  onClose,
}: {
  selection: NonNullable<Selection>
  onClose: () => void
}) {
  const { currentTheme } = useTheme()
  const { textSecondary, textMuted, border } = useThemeClasses()
  const isLight = currentTheme === 'lightgradient'
  const panel = isLight ? 'bg-white' : 'bg-gray-950'
  const quiet = isLight ? 'bg-slate-100 text-slate-700' : 'bg-gray-900 text-gray-300'
  const warn = isLight ? 'bg-amber-50 text-amber-900' : 'bg-amber-950/40 text-amber-200'

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={`sticky top-0 flex items-center justify-between border-b px-4 py-2 ${border} ${panel}`}
      >
        <span className={`text-xs font-medium ${textSecondary}`}>Details</span>
        <button onClick={onClose} className={`text-xs hover:underline ${textMuted}`}>
          Back to list
        </button>
      </div>

      {selection.kind === 'cell' ? (
        <div className="space-y-3 p-4">
          <h3 className="text-base font-semibold">{selection.cell.caption.label}</h3>
          <p className={`rounded p-2 text-xs ${quiet}`}>{selection.cell.caption.reason}</p>
          <Row label="Sales" value={String(selection.cell.sales)} />
          <Row label="Median close price" value={usd(selection.cell.medianClosePrice)} />
          <Row label="Median $/sqft" value={selection.cell.medianPricePerSqft?.toFixed(0) ?? '—'} />
          <Row label="City" value={selection.cell.city ?? '—'} />
          <Row label="ZIP" value={selection.cell.postalCode ?? '—'} />
          <p className={`pt-2 text-[11px] ${textMuted}`}>
            One ~0.3 mile grid cell. Medians are per cell and are never averaged together.
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <h3 className="text-base font-semibold">{selection.zone.label}</h3>
          <div className={`text-xs ${textMuted}`}>
            Rank #{selection.zone.rank} statewide for this year · {selection.zone.cellCount} cells ·{' '}
            {selection.zone.radiusMiles.toFixed(2)} mi radius
          </div>

          <Row label="Sales in zone" value={String(selection.zone.sales)} />
          <Row label="Median close price" value={usd(selection.zone.medianClosePrice)} />
          <Row label="Median $/sqft" value={selection.zone.medianPricePerSqft?.toFixed(0) ?? '—'} />
          <Row label="City" value={selection.zone.city ?? '—'} />

          <div className={`border-t pt-3 ${border}`}>
            {selection.loading ? (
              <p className={`text-xs ${textMuted}`}>Loading area history…</p>
            ) : selection.area ? (
              <>
                {selection.wider && (
                  <p className={`mb-2 rounded p-2 text-[11px] ${warn}`}>
                    This zone has no single named community, so the figures below are for{' '}
                    <strong>{selection.area.label}</strong> ({selection.area.closedCount} sales) — a
                    wider area than the circle on the map.
                  </p>
                )}
                <Row
                  label="Median days on market"
                  value={selection.area.medianDaysOnMarket?.toString() ?? '—'}
                />
                <Row label="Close-to-list ratio" value={pct(selection.area.medianCloseToListRatio)} />
                <Row label="Confidence" value={selection.area.confidence ?? '—'} />
                {selection.area.partialYear && (
                  <p className={`pt-2 text-[11px] ${textMuted}`}>
                    Partial year — {selection.area.yearMonthsCovered} of 12 months.
                  </p>
                )}
              </>
            ) : (
              <p className={`text-xs ${textMuted}`}>
                No matching area history for this zone, so days-on-market and close-to-list are
                unavailable rather than estimated.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const { textMuted } = useThemeClasses()
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className={textMuted}>{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
