'use client'

/**
 * Leaflet map for the Analytics tab — four toggleable layers over SoCal.
 *
 * ── Two renderings of the same cells, by zoom ───────────────────────────────
 *
 * Below CELL_ZOOM the grid is drawn as a RADIAL heat layer; at or above it, as
 * discrete rectangles on each cell's true bbox. They answer different
 * questions and neither is a downgrade of the other:
 *
 *   zoomed out — "where is it hot?" A blur is the honest answer. At 0.005°
 *     a cell is a couple of screen pixels, so rectangles degenerate into
 *     confetti and the eye cannot aggregate them.
 *   zoomed in  — "what is THIS block?" A rectangle is the honest answer. It
 *     maps one-to-one onto a stored document, it is clickable, and it carries
 *     its own caption, median and name-coverage. A blur at this zoom would
 *     invent gradient between two unrelated cells and give nothing to click.
 *
 * The earlier version shipped rectangles at every zoom and argued against a
 * heat layer outright. That reasoning holds at high zoom and fails at low zoom,
 * which is why both now exist rather than one replacing the other.
 *
 * Colour is Turbo, cold blue → hot red; see heatmap-shared.ts for why a
 * multi-hue ramp here and what it costs.
 */

import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Rectangle,
  Circle,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L, { type LatLngBoundsExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import {
  CELL_ZOOM,
  HEAT_RAMP,
  HEAT_RAMP_DARK,
  heatGradient,
  rampColor,
  type GridCell,
  type Hotspot,
  type Viewport,
} from './heatmap-shared'

export type { GridCell, Hotspot, Viewport }

const MILES_TO_M = 1609.34

function usd(n: number | null): string {
  return n == null ? '—' : `$${n.toLocaleString()}`
}

/** Reports viewport changes up so the page can refetch. */
function ViewportWatcher({ onChange }: { onChange: (v: Viewport) => void }) {
  const map = useMapEvents({
    moveend: () => emit(),
    zoomend: () => emit(),
  })
  function emit() {
    const b = map.getBounds()
    onChange({
      bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
        .map((n) => n.toFixed(5))
        .join(','),
      zoom: map.getZoom(),
    })
  }
  useEffect(() => {
    emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/**
 * The radial layer, via leaflet.heat.
 *
 * `max` is passed explicitly. Left to itself leaflet.heat normalises against
 * the hottest point currently on screen, so panning from Palm Desert to empty
 * desert would repaint the desert as "hot" — the scale has to stay fixed to the
 * data in view, not to the brightest thing in it.
 */
function HeatLayer({
  cells,
  max,
  dark,
  radius,
}: {
  cells: GridCell[]
  max: number
  dark: boolean
  radius: number
}) {
  const map = useMap()
  const points = useMemo(
    () => cells.map((c) => [c.lat, c.lng, c.sales] as [number, number, number]),
    [cells],
  )

  useEffect(() => {
    if (!points.length) return
    // @types/leaflet.heat augments L, but the call is still loose enough that
    // the cast documents what we rely on.
    const layer = (L as unknown as {
      heatLayer: (pts: [number, number, number][], opts: Record<string, unknown>) => L.Layer
    }).heatLayer(points, {
      radius,
      blur: Math.round(radius * 0.75),
      max: max || 1,
      minOpacity: 0.25,
      maxZoom: CELL_ZOOM,
      gradient: heatGradient(dark),
    })
    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [map, points, max, dark, radius])

  return null
}

interface Props {
  cells: GridCell[]
  zones: Hotspot[]
  showHeat: boolean
  showCells: boolean
  showZones: boolean
  showPins: boolean
  dark: boolean
  center: [number, number]
  zoom: number
  onViewportChange: (v: Viewport) => void
  onSelectZone: (z: Hotspot) => void
  onSelectCell: (c: GridCell) => void
}

export default function SalesHeatMap({
  cells,
  zones,
  showHeat,
  showCells,
  showZones,
  showPins,
  dark,
  center,
  zoom,
  onViewportChange,
  onSelectZone,
  onSelectCell,
}: Props) {
  const maxCell = useMemo(() => cells.reduce((m, c) => Math.max(m, c.sales), 0), [cells])
  const maxZone = useMemo(() => zones.reduce((m, z) => Math.max(m, z.sales), 0), [zones])
  const ramp = dark ? HEAT_RAMP_DARK : HEAT_RAMP

  // Esri's Gray Canvas, not CARTO.
  //
  // CARTO's basemaps now require an API key — unkeyed requests still return
  // tiles, but stamped "API KEY REQUIRED" across every one of them, which is
  // how this shipped the first time. Esri's canvas layers are keyless and are
  // purpose-built as a backdrop for data overlays: desaturated, low-contrast,
  // and without the POI clutter that fights a heat ramp.
  //
  // NOTE the axis order. Esri serves {z}/{y}/{x} — y BEFORE x — unlike almost
  // every other XYZ provider. Swapping them silently returns tiles for the
  // wrong place rather than erroring.
  const tiles = dark
    ? 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url={tiles}
        maxZoom={16}
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, DeLorme, NAVTEQ'
      />
      <ViewportWatcher onChange={onViewportChange} />

      {showHeat && cells.length > 0 && (
        <HeatLayer cells={cells} max={maxCell} dark={dark} radius={zoom <= 9 ? 16 : 24} />
      )}

      {showCells &&
        cells.map((c, i) => {
          const bounds: LatLngBoundsExpression = [
            [c.bbox.minLat, c.bbox.minLng],
            [c.bbox.maxLat, c.bbox.maxLng],
          ]
          const color = rampColor(c.sales, maxCell, dark)
          return (
            <Rectangle
              key={`c${i}`}
              bounds={bounds}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.62,
                weight: 0.5,
              }}
              eventHandlers={{ click: () => onSelectCell(c) }}
            >
              <Tooltip direction="top" opacity={1}>
                <strong>{c.caption.label}</strong>
                <br />
                {c.sales} {c.sales === 1 ? 'sale' : 'sales'} · median {usd(c.medianClosePrice)}
              </Tooltip>
            </Rectangle>
          )
        })}

      {showZones &&
        zones.map((z) => {
          // Over the heat layer a zone is a BOUNDARY, not a second intensity
          // encoding. Drawing the ring in ramp colour too put bright green and
          // yellow outlines on top of the blur, so the eye read the ring and
          // the blur as competing signals for the same thing. Neutral, thin
          // and low-fill here; ramp-coloured only when the blur is off and the
          // circle has to carry intensity by itself.
          const color = showHeat
            ? dark
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(17,17,17,0.35)'
            : rampColor(z.sales, maxZone, dark)
          return (
            <Circle
              key={z.zoneId}
              center={[z.lat, z.lng]}
              radius={z.radiusMiles * MILES_TO_M}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: showHeat ? 0 : 0.22,
                weight: showHeat ? 1 : 2,
              }}
              eventHandlers={{ click: () => onSelectZone(z) }}
            >
              <Tooltip direction="top" opacity={1}>
                <strong>{z.label}</strong>
                <br />
                {z.sales} sales · rank #{z.rank} · {z.radiusMiles.toFixed(2)} mi radius
              </Tooltip>
            </Circle>
          )
        })}

      {showPins &&
        zones.slice(0, 20).map((z) => (
          <CircleMarker
            key={`p${z.zoneId}`}
            center={[z.lat, z.lng]}
            radius={6}
            pathOptions={{
              color: dark ? '#0b0b0b' : '#ffffff',
              fillColor: ramp[ramp.length - 1],
              fillOpacity: 1,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectZone(z) }}
          >
            <Tooltip direction="top" opacity={1}>
              <strong>{z.label}</strong>
              <br />
              {z.sales} sales
            </Tooltip>
          </CircleMarker>
        ))}
    </MapContainer>
  )
}
