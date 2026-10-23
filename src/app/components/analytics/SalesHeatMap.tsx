'use client'

/**
 * Leaflet map for the Analytics tab — three toggleable layers over SoCal.
 *
 * Why rectangles rather than a blurred heat layer (leaflet.heat):
 *
 * The data is ALREADY gridded into 0.005° cells by the precompute, and each
 * cell carries its own caption, median and name-coverage. A gaussian blur
 * throws exactly that away: it renders a smear with no clickable unit, it
 * rescales with zoom so the same market looks hotter when you zoom in, and it
 * would invent gradient between two cells that are genuinely unrelated. Drawing
 * the real cell bbox keeps every pixel traceable to one stored document, which
 * is the same reason the read layer refuses to compute. It also avoids adding a
 * dependency that is unmaintained and has no types.
 *
 * Colour is the dataviz skill's published sequential blue ramp, used unchanged.
 * Sequential = one hue, light->dark; never a rainbow. Dark mode gets its own
 * stepping rather than an inverted flip: over dark tiles the BRIGHT end has to
 * mean "more", or high-volume cells disappear into the basemap. The legend
 * states the direction in both modes so it is never inferred from colour alone.
 */

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Rectangle, Circle, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
  /** Needed by the detail panel to resolve a zone to its market_history row. */
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

/** The skill's sequential blue, steps 100 -> 700. Low magnitude recedes. */
const RAMP_LIGHT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']
/** Dark-mode stepping: bright = more, so hot cells survive the dark basemap. */
const RAMP_DARK = ['#184f95', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#86b6ef', '#cde2fb']

const MILES_TO_M = 1609.34

/** Zoom at which the view switches from zones to individual cells. */
export const CELL_ZOOM = 12

function rampColor(weight: number, max: number, dark: boolean): string {
  const ramp = dark ? RAMP_DARK : RAMP_LIGHT
  if (max <= 0) return ramp[0]
  // sqrt keeps a handful of very hot cells from flattening everything else to
  // the first step; it shapes the colour scale only, never a reported number.
  const t = Math.sqrt(Math.min(weight, max) / max)
  return ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]
}

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
      bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(','),
      zoom: map.getZoom(),
    })
  }
  useEffect(() => {
    emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

interface Props {
  cells: GridCell[]
  zones: Hotspot[]
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

  // Esri's Gray Canvas, not CARTO.
  //
  // CARTO's basemaps now require an API key — unkeyed requests still return
  // tiles, but stamped "API KEY REQUIRED" across every one of them, which is
  // how this shipped the first time. Esri's canvas layers are keyless and are
  // purpose-built as a backdrop for data overlays: desaturated, low-contrast,
  // and without the POI clutter that fights a choropleth.
  //
  // NOTE the axis order. Esri serves {z}/{y}/{x} — y BEFORE x — unlike almost
  // every other XYZ provider. Swapping them silently returns tiles for the
  // wrong place rather than erroring.
  const tiles = dark
    ? 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <TileLayer
        url={tiles}
        maxZoom={16}
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, DeLorme, NAVTEQ'
      />
      <ViewportWatcher onChange={onViewportChange} />

      {showCells &&
        cells.map((c, i) => {
          const bounds: LatLngBoundsExpression = [
            [c.bbox.minLat, c.bbox.minLng],
            [c.bbox.maxLat, c.bbox.maxLng],
          ]
          return (
            <Rectangle
              key={`c${i}`}
              bounds={bounds}
              pathOptions={{
                color: rampColor(c.sales, maxCell, dark),
                fillColor: rampColor(c.sales, maxCell, dark),
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
        zones.map((z) => (
          <Circle
            key={z.zoneId}
            center={[z.lat, z.lng]}
            radius={z.radiusMiles * MILES_TO_M}
            pathOptions={{
              color: rampColor(z.sales, maxZone, dark),
              fillColor: rampColor(z.sales, maxZone, dark),
              fillOpacity: 0.22,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectZone(z) }}
          >
            <Tooltip direction="top" opacity={1}>
              <strong>{z.label}</strong>
              <br />
              {z.sales} sales · rank #{z.rank} · {z.radiusMiles.toFixed(2)} mi radius
            </Tooltip>
          </Circle>
        ))}

      {showPins &&
        zones.slice(0, 20).map((z) => (
          <CircleMarker
            key={`p${z.zoneId}`}
            center={[z.lat, z.lng]}
            radius={6}
            pathOptions={{
              color: dark ? '#1a1a19' : '#fcfcfb',
              fillColor: dark ? '#cde2fb' : '#0d366b',
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
