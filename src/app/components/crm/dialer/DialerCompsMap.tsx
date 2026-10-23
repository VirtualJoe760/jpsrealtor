'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Map, { Marker, NavigationControl, Popup, type MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { comparableMapBounds, comparableMapPoints } from '@/lib/dialer/comparable-map';
import { comparablePhotos, type ComparableSale as Sale } from '@/lib/dialer/comparable-details';
import { money } from './property-context';

class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="p-5 text-sm">This browser could not open the map. The MLS sales list is still available.</p> : this.props.children; }
}

export default function DialerCompsMap({ latitude, longitude, address, comps, selected, onSelect, onOpenDetails, isLight }: {
  latitude?: number; longitude?: number; address: string; comps: Sale[]; selected: string | null;
  onSelect: (id: string | null) => void; onOpenDetails: (sale: Sale) => void; isLight: boolean;
}) {
  const ref = useRef<MapRef>(null);
  const [tileError, setTileError] = useState(false);
  const points = useMemo(() => comparableMapPoints(comps), [comps]);
  const subject = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null;
  const bounds = useMemo(() => comparableMapBounds([...(subject ? [subject] : []), ...points]), [latitude, longitude, points]);
  const [hovered, setHovered] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function keepPreview(id: string) { clearTimeout(dismissTimer.current); setHovered(id); }
  function dismissPreview() { clearTimeout(dismissTimer.current); dismissTimer.current = setTimeout(() => setHovered(null), 180); }
  useEffect(() => () => clearTimeout(dismissTimer.current), []);
  useEffect(() => { setHovered(null); }, [comps]);
  const previewPoint = points.find(point => point.id === hovered);
  const sale = comps.find(comp => comp.listingKey === hovered);
  const photo = sale ? comparablePhotos(sale)[0] : undefined;
  function openDetails(id: string) {
    const property = comps.find(comp => comp.listingKey === id);
    if (!property) return;
    clearTimeout(dismissTimer.current); setHovered(null); onSelect(id); onOpenDetails(property);
  }
  function fit() { if (bounds) ref.current?.fitBounds(bounds, { padding: 55, maxZoom: 16, duration: 0 }); }
  useEffect(() => { fit(); }, [bounds]);
  useEffect(() => {
    const chosen = points.find(point => point.id === selected);
    if (chosen) ref.current?.panTo([chosen.longitude, chosen.latitude], { duration: 0 });
  }, [selected]);
  const border = isLight ? 'border-slate-200' : 'border-white/10';
  if (!bounds) return <p className={`rounded-xl border p-5 text-sm ${border}`}>Map coordinates are unavailable. MLS sales with valid coordinates will appear here.</p>;
  return <section aria-label="Comparable sales map" className={`overflow-hidden rounded-xl border ${border}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"><p><span className="font-semibold text-rose-500">● Subject home</span><span className="ml-3 font-semibold text-emerald-600">● Numbered MLS sales</span></p><button type="button" className="min-h-11 px-2 font-medium underline" onClick={() => { setHovered(null); onSelect(null); fit(); }}>Fit all properties</button></div>
    <div className="h-72 sm:h-96 xl:h-[480px]" aria-label="Map of subject home and comparable sales">
      <MapBoundary><Map ref={ref} initialViewState={{ longitude: (bounds[0][0] + bounds[1][0]) / 2, latitude: (bounds[0][1] + bounds[1][1]) / 2, zoom: 14 }}
        cooperativeGestures onMoveStart={() => setHovered(null)} onLoad={fit} onError={() => setTileError(true)} mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" style={{ width: '100%', height: '100%' }}>
        <NavigationControl position="top-right" />
        {subject && <Marker {...subject} anchor="center"><span title={address || 'Subject home'} aria-label="Subject home" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-xs font-bold text-white shadow-lg">H</span></Marker>}
        {points.map(point => <Marker key={point.id} latitude={point.latitude} longitude={point.longitude} anchor="center"><button type="button" aria-label={`Comparable ${point.number}: ${point.address}`} aria-pressed={selected === point.id} onPointerEnter={event => { if (event.pointerType !== 'touch') keepPreview(point.id); }} onPointerLeave={dismissPreview} onFocus={() => keepPreview(point.id)} onBlur={dismissPreview} onKeyDown={event => { if (event.key === 'Escape') setHovered(null); }} onClick={event => { event.stopPropagation(); openDetails(point.id); }} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg ${selected === point.id ? 'bg-slate-900 ring-4 ring-emerald-400' : 'bg-emerald-600'}`}>{point.number}</button></Marker>)}
        {previewPoint && sale && <Popup latitude={previewPoint.latitude} longitude={previewPoint.longitude} offset={26} closeButton={false} closeOnClick={false} focusAfterOpen={false} className="dialer-comp-preview"><div onPointerEnter={() => keepPreview(sale.listingKey)} onPointerLeave={dismissPreview} onFocus={() => keepPreview(sale.listingKey)} onBlur={dismissPreview} className="w-56 rounded-xl bg-white p-3 text-slate-900 shadow-xl" role="region" aria-label="Comparable preview">
          {photo && <img src={photo.url} alt={sale.address} className="mb-2 h-24 w-full rounded-lg object-cover" />}
          <p className="text-xs font-semibold text-emerald-700">Sold · {money(sale.closePrice)}</p><p className="mt-1 text-sm font-semibold">{sale.address}</p>
          <p className="mt-1 text-xs">{sale.bedsTotal ?? '—'} bd · {sale.bathroomsTotalDecimal ?? sale.bathroomsFull ?? '—'} ba · {sale.livingArea?.toLocaleString() ?? '—'} sq ft</p>
          <button type="button" className="mt-2 min-h-11 w-full rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white" onClick={() => openDetails(sale.listingKey)}>View property details</button>
        </div></Popup>}
      </Map></MapBoundary>
    </div>
    <p className="px-3 py-2 text-xs opacity-70">{points.length} of {comps.length} returned sales have map coordinates. Hover a pin for a preview. Click or tap for property details. Numbered pins match the list.{tileError && ' Some map tiles could not load; the sales list remains available.'}</p>
  </section>;
}
