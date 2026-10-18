'use client';

import { useEffect, useState } from 'react';
import ContactViewPanel from '../ContactViewPanel';
import DialerPropertyPanels from './DialerPropertyPanels';
import type { DialerContact } from './property-context';

// The existing contact page is embedded here, so phone editing, status and saved notes
// stay in one implementation rather than drifting inside a separate dialer contact card.
export default function DialerContactPane({ contact, isLight, visible, preview }: { contact?: DialerContact; isLight: boolean; visible: boolean; preview?: { name: string; phone: string; context: string; city: string; label: string } }) {
  const [tab, setTab] = useState<'details' | 'home' | 'comps'>('details');
  const [opened, setOpened] = useState(visible);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)');
    const update = () => { if (desktop.matches || visible) setOpened(true); };
    update(); desktop.addEventListener('change', update);
    return () => desktop.removeEventListener('change', update);
  }, [visible]);
  const soft = isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-slate-900 text-slate-300';
  if (contact?.dialerUnavailable) return <div className={`p-5 text-sm ${soft}`}><h3 className="mb-3 text-lg font-semibold">Contact unavailable</h3><p>This contact was deleted or is no longer accessible. Its saved queue history remains available for wrap-up.</p><p className="mt-3">Queued phone: {contact.phone}</p><p className="mt-3">New calls and contact editing are blocked. Finish the saved outcome or skip this queue item.</p></div>;
  return <div className="flex h-full min-h-0 flex-col">
    <div className={`flex shrink-0 gap-1 border-b p-2 ${soft}`} aria-label="Contact sections">
      {(['details', 'home', 'comps'] as const).map(item => <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)} className={`min-h-11 flex-1 rounded-lg text-xs font-semibold ${tab === item ? 'bg-emerald-600 text-white' : ''}`}>{item === 'details' ? 'Full contact' : item === 'home' ? 'Property research' : 'MLS comps'}</button>)}
    </div>
    <div className={`min-h-0 flex-1 ${tab === 'details' ? '' : 'hidden'}`}>
      {contact && opened ? <ContactViewPanel key={contact._id} contact={contact} isLight={isLight} isOpen embedded onClose={() => {}} onEdit={() => {}} onDelete={() => {}} onMessage={() => {}} /> : <div className={`h-full space-y-4 overflow-y-auto overscroll-y-contain p-5 text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}><div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 px-5 py-7 text-white"><p className="text-xs uppercase tracking-wider opacity-75">Sample contact · Read only</p><h3 className="mt-2 text-2xl font-semibold">{preview?.name || 'Contact preview'}</h3><p className="mt-1 text-xs opacity-80">{preview?.label}</p></div><div><h4 className="mb-2 font-semibold">Contact information</h4><div className={`rounded-xl border p-4 ${soft}`}><p className="text-xs opacity-70">Primary phone</p><p className="mt-1 font-semibold">{preview?.phone}</p><p className="mt-3 text-xs opacity-70">Email</p><p className="mt-1">No email saved</p></div></div><div><h4 className="mb-2 font-semibold">Saved notes</h4><p className={`rounded-xl border p-4 leading-relaxed ${soft}`}>{preview?.context}</p></div><div><h4 className="mb-2 font-semibold">Property information</h4><p className={`rounded-xl border p-4 ${soft}`}>{preview?.city}<span className="mt-2 block text-xs opacity-70">No property linked in this sample. Real CRM contacts open the existing editable contact page here.</span></p></div></div>}
    </div>
    {tab !== 'details' && <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3"><DialerPropertyPanels contact={contact} isLight={isLight} visiblePanel={tab === 'home' ? 1 : 2} mode={tab} /></div>}
  </div>;
}
