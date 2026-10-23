'use client';
import { useEffect, useRef, useState } from 'react';
import { comparableFacts, comparablePhotos, type ComparableSale } from '@/lib/dialer/comparable-details';
import { propertyResearchLinks } from './property-context';

export default function DialerComparableDetails({ sale, isLight, onClose, contactId, onPhotosLoaded }: { contactId?: string; onPhotosLoaded: (listingKey: string, photos: NonNullable<ComparableSale['externalPhotos']>) => void; sale: ComparableSale | null; isLight: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lookupMessage, setLookupMessage] = useState('');
  const [looking, setLooking] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [lookupRetry, setLookupRetry] = useState(0);
  const [webPhotos, setWebPhotos] = useState<NonNullable<ComparableSale['externalPhotos']>>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => {
    setPhotoIndex(0);
    if (sale && !dialog.current?.open) dialog.current?.showModal();
    else if (!sale && dialog.current?.open) dialog.current.close();
  }, [sale]);
  useEffect(() => { setSourceUrl(''); setLookupMessage(''); setWebPhotos([]); setLookupRetry(0); setLooking(false); }, [sale?.listingKey]);
  useEffect(() => {
    if (!sale || !contactId || (comparablePhotos(sale).length && lookupRetry === 0)) return;
    const controller = new AbortController();
    const listingKey = sale.listingKey;
    setLooking(true);
    fetch('/api/crm/contacts/' + contactId + '/property-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingKey, ...(lookupRetry > 0 && sourceUrl ? { sourceUrl } : {}) }), signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Photo lookup failed'); return data; })
      .then(data => { if (!controller.signal.aborted) { setWebPhotos(data.images || []); setLookupMessage(data.message || ''); if (data.images?.length) onPhotosLoaded(listingKey, data.images); } })
      .catch(error => { if (!controller.signal.aborted) setLookupMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLooking(false); });
    return () => controller.abort();
  }, [sale?.listingKey, contactId, lookupRetry]);
  const photos = sale ? comparablePhotos(webPhotos.length ? { ...sale, externalPhotos: webPhotos } : sale) : [];
  const photo = photos[photoIndex];
  return <dialog ref={dialog} aria-labelledby="sold-property-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }} className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border p-4 shadow-2xl backdrop:bg-black/60 sm:p-6 ${isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-[#141c29] text-slate-100'}`}>
    <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-emerald-600">Closed MLS sale</p><h2 id="sold-property-title" className="mt-1 text-xl font-semibold">{sale?.address || 'Sold property details'}</h2></div><button type="button" aria-label="Close sold property details" onClick={onClose} className="min-h-11 shrink-0 rounded-lg border px-3">Close</button></div>
    {sale && <>
      {photo ? <figure><img key={photo.url} src={photo.url} alt={photo.caption} className="h-56 w-full rounded-xl object-contain sm:h-80" /><figcaption className="mt-2 text-xs opacity-70">{photo.caption}{photo.sourcePage && <a className="ml-2 underline" href={photo.sourcePage} target="_blank" rel="noopener noreferrer">{photo.source || 'Photo source'} ↗</a>}</figcaption>{photos.length > 1 && <div className="my-2 flex items-center justify-between"><button type="button" className="min-h-11 px-3" disabled={photoIndex === 0} onClick={() => setPhotoIndex(index => index - 1)}>Previous photo</button><span className="text-xs">{photoIndex + 1} / {photos.length}</span><button type="button" className="min-h-11 px-3" disabled={photoIndex === photos.length - 1} onClick={() => setPhotoIndex(index => index + 1)}>Next photo</button></div>}</figure> : <div className="rounded-xl border border-dashed p-4"><p role="status" className="text-sm opacity-70">{looking ? 'Looking for address-matched property photos…' : lookupMessage || 'No photos available for this sale.'}</p>{!looking && contactId && <form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); setLookupRetry(value => value + 1); }}><input required type="url" aria-label="Sold property photo source URL" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="Zillow / Redfin / Realtor property URL" className="min-h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-3 text-sm" /><button type="submit" className="min-h-11 rounded-lg border px-3 text-sm">Find photo</button></form>}</div>}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{comparableFacts(sale).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-400/20 p-3"><dt className="text-xs opacity-70">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}</dl>
      {sale.publicRemarks && <div className="mt-5"><h3 className="font-semibold">MLS property description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{sale.publicRemarks}</p></div>}
      <nav aria-label="Sold property research" className="mt-5 flex flex-wrap gap-2">{propertyResearchLinks(sale.address).map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-emerald-500/30 px-3 text-sm font-semibold text-emerald-600">{link.label} ↗</a>)}</nav>
      <p className="mt-4 text-xs opacity-70">Source: {sale.mlsSource || 'MLS'} · Recorded closed-sale data; missing fields are shown as unavailable.</p>
    </>}
  </dialog>;
}
