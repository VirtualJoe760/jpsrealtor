'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Home, Layers, Loader2, MapPin, RefreshCw } from 'lucide-react';
import ContactPropertyCarousel from '../ContactPropertyCarousel';
import DialerCompsMap from './DialerCompsMap';
import { type DialerContact, money, propertyAddress, propertyResearchLinks } from './property-context';
import { comparableCoordinates, comparableQuery } from '@/lib/dialer/comparable-query';

import { type ComparableSale as Comparable } from '@/lib/dialer/comparable-details';
import DialerComparableDetails from './DialerComparableDetails';

type Enrichment = {
  source: string; geocode?: { lat: number; lng: number };
  property?: { bedrooms?: number; bathrooms?: number; sqft?: number; yearBuilt?: number; propertyType?: string; purchasePrice?: number; purchaseDate?: string; matchedAddress?: string };
};

export default function DialerPropertyPanels({ contact, isLight, visiblePanel, mode }: { contact?: DialerContact; isLight: boolean; visiblePanel: number; mode?: 'home' | 'comps' }) {
  const [period, setPeriod] = useState('all');
  const [similar, setSimilar] = useState(false);
  const [researchQuery, setResearchQuery] = useState(() => propertyAddress(contact));
  const [showPhotos, setShowPhotos] = useState(false);
  const [radius, setRadius] = useState('0.5');
  const [comps, setComps] = useState<Comparable[]>([]);
  const [detailComp, setDetailComp] = useState<Comparable | null>(null);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [homeError, setHomeError] = useState('');
  const address = propertyAddress(contact);
  const { latitude, longitude } = comparableCoordinates(contact, enrichment?.geocode);
  const hasCoordinates = typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  const panel = isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#141b29]';
  const subtle = isLight ? 'text-slate-500' : 'text-slate-400';
  const soft = isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.03]';
  const homeVisible = visiblePanel === 1;

  useEffect(() => {
    if ((!requested && visiblePanel !== 2) || !contact?._id || !hasCoordinates) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setComps([]); setSelectedComp(null); setDetailComp(null);
    const query = comparableQuery({ latitude, longitude, radius, period, similar,
      bedrooms: contact.bedrooms ?? contact.bedroomsTotal, bathrooms: contact.bathroomsTotalDecimal ?? contact.bathrooms ?? contact.bathroomsFull, sqft: contact.sqft ?? contact.squareFeet });
    fetch(`/api/crm/contacts/${encodeURIComponent(contact._id)}/comparables?${query}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Could not load MLS sales.'); return data; })
      .then(data => { if (!controller.signal.aborted) setComps(data.comparables || []); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [contact, latitude, longitude, hasCoordinates, radius, period, similar, requested, refresh, visiblePanel]);

  async function loadProperty() {
    if (!contact?.address) return;
    setEnriching(true); setHomeError('');
    try {
      // Existing enrichment is read-only; keep candidate MLS facts separate from saved contact facts.
      const response = await fetch('/api/crm/contacts/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: contact.address }), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not load MLS property information.');
      setEnrichment(data);
    } catch (reason) { setHomeError(reason instanceof Error ? reason.message : 'Property lookup failed.'); }
    finally { setEnriching(false); }
  }

  const prices = comps.map(comp => comp.closePrice).filter((value): value is number => typeof value === 'number' && value > 0).sort((a,b) => a-b);
  const unitPrices = comps.filter(comp => comp.closePrice && comp.livingArea).map(comp => comp.closePrice! / comp.livingArea!).sort((a,b) => a-b);
  const median = (values: number[]) => values.length ? (values[Math.floor((values.length-1)/2)] + values[Math.ceil((values.length-1)/2)]) / 2 : undefined;
  const facts = [
    ['Beds / baths', `${contact?.bedrooms ?? contact?.bedroomsTotal ?? '—'} / ${contact?.bathroomsTotalDecimal ?? contact?.bathrooms ?? contact?.bathroomsFull ?? '—'}`],
    ['Living area', (contact?.sqft ?? contact?.squareFeet)?.toLocaleString() ? `${(contact?.sqft ?? contact?.squareFeet)!.toLocaleString()} sq ft` : '—'],
    ['Lot size', contact?.lotSize || '—'], ['Year built', contact?.yearBuilt || '—'],
    ['Purchase price', money(contact?.purchasePrice)], ['Property type', contact?.propertyType || '—'],
  ];
  const research = researchQuery.trim() ? propertyResearchLinks(researchQuery.trim()) : [];
  const candidate = enrichment?.property;

  return <>
    <DialerComparableDetails key={detailComp?.listingKey || 'closed'} contactId={contact?._id} onPhotosLoaded={(listingKey, photos) => setComps(previous => previous.map(comp => comp.listingKey === listingKey ? { ...comp, externalPhotos: photos } : comp))} sale={detailComp} isLight={isLight} onClose={() => setDetailComp(null)} />
    {mode !== 'comps' && <section id={mode ? undefined : "dialer-panel-1"} data-panel={mode ? undefined : "1"} aria-label="Contact home details" className={`${mode ? 'w-full rounded-xl border p-4' : 'order-2 h-[min(62dvh,620px)] w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain rounded-2xl border p-5 xl:order-4 xl:col-span-3 xl:h-auto xl:w-auto'} ${panel}`}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Home size={19} /> Their home</h3>
      {research.length > 0 && <nav aria-label="Quick property research" className="mb-4 flex gap-2 overflow-x-auto pb-1">{research.map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${soft}`}>{link.label}<ExternalLink size={12} /></a>)}</nav>}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-6"><div>
        <div className={`h-32 xl:h-44 overflow-hidden rounded-xl border ${soft}`}>
          {contact?._id && contact.address?.street && (homeVisible || showPhotos) ? <ContactPropertyCarousel key={contact._id} contactId={contact._id} isLight={isLight} /> : <div className={`flex h-full flex-col items-center justify-center gap-2 text-xs ${subtle}`}><Home size={32} /><span>{contact ? 'Open Home on mobile to load available photos' : 'Choose a CRM contact to load property photos'}</span></div>}
        </div>
        {contact?._id && contact.address?.street && !homeVisible && !showPhotos && <button onClick={() => setShowPhotos(true)} className="mt-2 min-h-11 text-sm font-semibold text-emerald-600">Load property photos</button>}
        <p className="mt-4 text-lg font-semibold">{contact ? `${contact.firstName} ${contact.lastName}` : 'Contact property'}</p>
        <p className={`mt-1 flex items-start gap-2 text-sm ${subtle}`}><MapPin size={16} className="mt-0.5 shrink-0" />{address || 'No property address on this contact'}</p>
        <p className={`mt-2 text-xs leading-relaxed ${subtle}`}>Saved contact facts below. Photo lookup checks the property address; use the photo source link to review the original page.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3">{facts.map(([label,value]) => <div key={label} className={`rounded-xl border p-3 ${soft}`}><dt className={`text-xs ${subtle}`}>{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}</dl>
      </div><div className="mt-5 xl:mt-0">
        <h4 className="text-sm font-semibold">Property research</h4><p className={`mb-3 mt-1 text-xs ${subtle}`}>Open sources in a new tab while keeping your call here.</p>
        <label className="mb-3 block text-xs font-medium">Research address<input value={researchQuery} onChange={event => setResearchQuery(event.target.value)} placeholder="Street address, city, state ZIP" className={`mt-2 min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-emerald-500 ${soft}`} /></label>
        {research.length ? <div className="grid grid-cols-2 gap-2">{research.map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border px-3 py-3 hover:border-emerald-500 ${soft}`}><span><span className="block text-sm font-semibold">{link.label}</span><span className={`block text-[10px] ${subtle}`}>{link.detail}</span></span><ExternalLink size={14} className="shrink-0" /></a>)}</div> : <p className={`rounded-xl border p-4 text-sm ${soft} ${subtle}`}>Add a street address to the contact to enable Zillow, Redfin, Realtor.com, Homes.com, and Maps searches.</p>}
        <div className={`mt-4 rounded-xl border p-4 ${soft}`}><h4 className="text-sm font-semibold">Backend MLS information</h4><p className={`mt-2 text-xs leading-relaxed ${subtle}`}>Look up active listings and closed history using your existing property enrichment service. Lookup can use configured geocoding.</p>
          <button disabled={enriching || !contact?.address?.street || !contact.address.city || !contact.address.state} onClick={loadProperty} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{enriching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}Load MLS property</button>
          {homeError && <p role="alert" className="mt-3 text-sm text-rose-500">{homeError}</p>}
          {enrichment && <div className="mt-4 text-sm"><p className="font-semibold">{enrichment.source.includes('nearby') ? 'Nearby property reference — not the subject' : candidate ? 'MLS address match — verify subject' : 'No MLS match found'}</p>{candidate && <><p className={`mt-1 ${subtle}`}>{candidate.matchedAddress}</p><p className="mt-2">{candidate.bedrooms ?? '—'} bd · {candidate.bathrooms ?? '—'} ba · {candidate.sqft?.toLocaleString() ?? '—'} sq ft</p><p className="mt-2">{enrichment.source.includes('closed') ? 'Recorded MLS sale' : 'MLS asking price'}: {money(candidate.purchasePrice)}</p><p className={`mt-1 text-xs ${subtle}`}>Source: {enrichment.source}. Saved contact facts have not been overwritten.</p></>}</div>}
        </div>
      </div></div>
    </section>}
    {mode !== 'home' && <section id={mode ? undefined : "dialer-panel-2"} data-panel={mode ? undefined : "2"} aria-label="Comparable sales" className={`${mode ? 'w-full rounded-xl border p-4' : 'order-3 h-[min(62dvh,620px)] w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain rounded-2xl border p-5 xl:order-5 xl:col-span-3 xl:h-auto xl:w-auto'} ${panel}`}>
      <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-lg font-semibold"><Layers size={19} /> MLS sold comps</h3><button disabled={loading || !contact?._id || !hasCoordinates} onClick={() => {setRequested(true);setRefresh(value=>value+1);}} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs disabled:opacity-40 ${soft}`}>{loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Load / refresh</button></div>
      <p className={`mt-1 text-xs ${subtle}`}>Nearby closed sales · Same source as the contact page · Not an appraisal</p>
      <div className="mt-4 flex flex-wrap gap-2"><label className={`flex min-h-11 flex-1 items-center gap-2 rounded-xl border px-3 text-xs ${soft}`}>Period<select aria-label="Comparable sales period" value={period} onChange={event=>setPeriod(event.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent"><option value="all">All recorded sales</option><option value="90">90 days</option><option value="180">6 months</option><option value="365">1 year</option></select></label><label className={`flex min-h-11 flex-1 items-center gap-2 rounded-xl border px-3 text-xs ${soft}`}>Radius<select aria-label="Comparable sales radius" value={radius} onChange={event=>setRadius(event.target.value)} className="min-h-11 flex-1 bg-transparent"><option value="0.5">0.5 mi</option><option value="1">1 mi</option><option value="2">2 mi</option></select></label></div>
      <label className={`mt-3 flex min-h-11 items-center gap-2 text-xs ${subtle}`}><input type="checkbox" checked={similar} onChange={event => setSimilar(event.target.checked)} />Match available beds, baths &amp; size</label>
      <div className="mt-4 grid grid-cols-2 gap-3">{[['Median sold price',money(median(prices))],['Median $ / sq ft',money(median(unitPrices))]].map(([label,value])=><div key={label} className={`rounded-xl border p-3 ${soft}`}><p className={`text-xs ${subtle}`}>{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}</div>
      <p className={`mt-2 text-[11px] ${subtle}`}>Medians describe the returned {comps.length} sales, not the entire market.</p>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,1fr)]">
        <div className="xl:sticky xl:top-3"><DialerCompsMap latitude={latitude} longitude={longitude} address={address} comps={comps} selected={selectedComp} onSelect={setSelectedComp} onOpenDetails={setDetailComp} isLight={isLight} /></div>
        <div className="min-w-0 xl:max-h-[620px] xl:overflow-y-auto xl:pr-2">
      {loading ? <p role="status" className={`py-8 text-center text-sm ${subtle}`}>Loading closed MLS sales…</p> : error ? <p role="alert" className="mt-4 text-sm text-rose-500">{error}</p> : comps.length ? <div className="mt-4 grid gap-3">{comps.map((comp, index)=><article key={comp.listingKey} className={`rounded-xl border p-4 ${soft} ${selectedComp === comp.listingKey ? "ring-2 ring-emerald-500" : ""}`}><button type="button" aria-label={`Show comparable ${index + 1} on map`} aria-pressed={selectedComp === comp.listingKey} onClick={() => setSelectedComp(comp.listingKey)} className="flex min-h-11 w-full items-center justify-between gap-2 text-left"><strong className="text-lg text-emerald-600">{index + 1}. {money(comp.closePrice)}</strong><span className={`text-xs ${subtle}`}>{comp.distance} mi</span></button><p className="mt-2 text-sm font-semibold">{comp.address}</p><p className={`mt-2 text-xs ${subtle}`}>{comp.bedsTotal ?? '—'} bd · {comp.bathroomsTotalDecimal ?? comp.bathroomsFull ?? '—'} ba · {comp.livingArea?.toLocaleString() ?? '—'} sq ft</p><p className={`mt-2 text-xs ${subtle}`}>Sold {comp.closeDate ? new Date(comp.closeDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'date unavailable'} · {comp.mlsSource || 'MLS'}</p><button type="button" aria-label={`View property details for comparable ${index + 1}`} onClick={() => { setSelectedComp(comp.listingKey); setDetailComp(comp); }} className="mr-4 mt-3 min-h-11 text-xs font-semibold text-emerald-600 underline">Property details</button><a href={propertyResearchLinks(comp.address)[0].href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-emerald-600">Research on Zillow<ExternalLink size={13} /></a></article>)}</div> : <p className={`mt-4 rounded-xl border border-dashed p-5 text-sm leading-relaxed ${soft} ${subtle}`}>{!contact ? 'Choose a CRM contact to load MLS comps.' : !hasCoordinates ? 'No coordinates saved. Use Load MLS property in the Property tab to resolve the address first.' : requested || visiblePanel === 2 ? 'No closed sales found for these filters. Try a wider radius, all recorded sales, or turn off similar-home matching.' : 'Open Comps or select Load / refresh to query your MLS closed-sale history.'}</p>}
        </div>
      </div>
    </section>}
  </>;
}
