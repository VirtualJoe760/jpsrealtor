'use client';

import { useMemo, useState } from 'react';
import ContactViewPanel from '../ContactViewPanel';
import DialerPropertyPanels from './DialerPropertyPanels';
import { money, propertyAddress, propertyResearchLinks, type DialerContact } from './property-context';

export default function DialerContactPane({ contact: originalContact, isLight, preview }: { contact?: DialerContact; isLight: boolean; visible: boolean; preview?: { name: string; phone: string; context: string; city: string; label: string } }) {
  const [updates, setUpdates] = useState<Partial<DialerContact>>({});
  const contact = useMemo(() => originalContact ? { ...originalContact, ...updates } : undefined, [originalContact, updates]);
  const [tab, setTab] = useState<'details' | 'home' | 'comps'>('details');
  const [expanded, setExpanded] = useState(false);
  const subtle = isLight ? 'text-slate-500' : 'text-slate-400';
  const border = isLight ? 'border-slate-200' : 'border-white/10';
  const address = propertyAddress(contact);
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || contact?.organization || preview?.name || 'Contact';
  const phones = contact?.phones?.length ? contact.phones.map(phone => phone.number) : [contact?.phone || preview?.phone].filter(Boolean);
  const emails = contact?.emails?.length ? contact.emails.map(email => email.address) : [contact?.email].filter(Boolean);
  const facts = [
    ['Beds', contact?.bedrooms ?? contact?.bedroomsTotal],
    ['Baths', contact?.bathrooms ?? contact?.bathroomsTotalDecimal ?? contact?.bathroomsFull],
    ['Sq ft', contact?.sqft ?? contact?.squareFeet], ['Built', contact?.yearBuilt],
  ].filter(([, value]) => value !== undefined && value !== null);
  if (contact?.dialerUnavailable) return <div className={`p-5 text-sm ${subtle}`}><h3 className="mb-3 text-lg font-semibold">Contact unavailable</h3><p>This contact was deleted or is no longer accessible. Its saved queue history remains available for wrap-up.</p><p className="mt-3">Queued phone: {contact.phone}</p><p className="mt-3">New calls and contact editing are blocked. Finish the saved outcome or skip this queue item.</p></div>;
  return <div className="flex h-full min-h-0 flex-col">
    <div className={`flex shrink-0 gap-1 border-b p-2 ${border}`} aria-label="Contact sections">
      {(['details', 'home', 'comps'] as const).map(item => <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)} className={`min-h-11 flex-1 rounded-lg text-xs font-semibold ${tab === item ? 'bg-emerald-600 text-white' : subtle}`}>{item === 'details' ? 'Contact' : item === 'home' ? 'Property' : 'MLS comps'}</button>)}
    </div>
    <div className={`min-h-0 flex-1 ${tab === 'details' ? '' : 'hidden'}`}>
      {expanded && contact ? <div className="flex h-full min-h-0 flex-col"><button onClick={() => setExpanded(false)} className={`min-h-11 shrink-0 border-b px-4 text-left text-sm font-medium ${border}`}>Back to summary</button><div className="min-h-0 flex-1"><ContactViewPanel key={contact._id} contact={contact} isLight={isLight} isOpen embedded onContactChange={patch => setUpdates(previous => ({ ...previous, ...patch }))} onClose={() => setExpanded(false)} onEdit={() => {}} onDelete={() => {}} onMessage={() => {}} /></div></div> : <div aria-label="Contact summary" className={`h-full overflow-y-auto overscroll-y-contain p-5 pb-28 xl:pb-5 text-sm divide-y ${border}`}>
        <div className="pb-4"><h3 className="text-lg font-semibold">{name}</h3><p className={`mt-1 text-xs ${subtle}`}>{contact?.status || preview?.label || 'Contact'}</p>{contact?.doNotContact && <p className="mt-2 font-semibold text-rose-500">Do not contact</p>}</div>
        <dl className="space-y-3 py-4"><div><dt className={`text-xs ${subtle}`}>Phone</dt><dd className="mt-1 break-words">{phones.length ? phones.join(' · ') : 'No phone saved'}</dd></div><div><dt className={`text-xs ${subtle}`}>Email</dt><dd className="mt-1 break-words">{emails.length ? emails.join(' · ') : 'No email saved'}</dd></div><div><dt className={`text-xs ${subtle}`}>Property</dt><dd className="mt-1">{address || preview?.city || 'No address saved'}</dd></div></dl>
        {facts.length > 0 && <dl className="grid grid-cols-4 gap-2 py-4">{facts.map(([label, value]) => <div key={String(label)}><dt className={`text-xs ${subtle}`}>{label}</dt><dd className="mt-1 font-semibold">{typeof value === 'number' && label !== 'Built' ? value.toLocaleString() : value}</dd></div>)}</dl>}
        {contact?.purchasePrice !== undefined && <p className="py-3"><span className={subtle}>Recorded purchase </span>{money(contact.purchasePrice)}</p>}
        {address && <div className="flex flex-wrap gap-3 py-4">{propertyResearchLinks(address).slice(0, 3).map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="min-h-11 py-3 font-medium text-emerald-600 underline underline-offset-4">{link.label} ↗</a>)}</div>}
        <div className="py-4"><h4 className={`mb-2 text-xs font-medium ${subtle}`}>Saved contact notes</h4><p className="whitespace-pre-wrap leading-relaxed">{contact ? contact.notes || (contact.noteHistory?.length ? '' : 'No notes saved.') : preview?.context || 'Sample contact.'}</p>{contact?.noteHistory?.slice(-3).map((note, index) => <p key={index} className="mt-2 whitespace-pre-wrap leading-relaxed">{note.content}</p>)}</div>
        {contact && <div className="pt-4"><button onClick={() => setExpanded(true)} className={`min-h-11 rounded-lg border px-4 font-medium ${border}`}>Open full contact & edit</button><p className={`mt-2 text-xs ${subtle}`}>Edit details, add saved notes, or review the complete contact page.</p></div>}
      </div>}
    </div>
    {tab !== 'details' && <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3"><DialerPropertyPanels contact={contact} isLight={isLight} visiblePanel={tab === 'home' ? 1 : 2} mode={tab} /></div>}
  </div>;
}
