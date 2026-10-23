'use client';
import { useEffect, useState } from 'react';
import type { DialerContact } from './property-context';

function details(contact: DialerContact) {
  return {
    firstName: contact.firstName || '', lastName: contact.lastName || '',
    phones: (contact.phones?.length ? contact.phones : contact.phone ? [{ number: contact.phone, label: 'mobile', isPrimary: true }] : []).map(row => ({ ...row })),
    emails: (contact.emails?.length ? contact.emails : contact.email ? [{ address: contact.email, label: 'personal', isPrimary: true }] : []).map(row => ({ ...row })),
    address: { street: '', city: '', state: '', zip: '', country: '', ...contact.address },
  };
}
export default function DialerContactDetails({ contact, isLight, onSaved, onDirtyChange }: {
  contact: DialerContact; isLight: boolean; onSaved: (contact: DialerContact) => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [draft, setDraft] = useState(() => details(contact));
  const [baseline, setBaseline] = useState(() => JSON.stringify(details(contact)));
  const [saving, setSaving] = useState(false), [message, setMessage] = useState('');
  const dirty = JSON.stringify(draft) !== baseline;
  useEffect(() => { onDirtyChange(dirty || saving); }, [dirty, saving, onDirtyChange]);
  const input = `mt-1 min-h-11 w-full rounded-lg border px-3 text-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`;
  const button = 'min-h-11 rounded-lg border border-emerald-500/30 px-3 text-sm font-semibold text-emerald-600 disabled:opacity-40';
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setMessage('');
    try {
      const original = JSON.parse(baseline);
      const body = Object.fromEntries(Object.entries(draft).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key])));
      const response = await fetch('/api/crm/contacts/' + contact._id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Contact could not be saved');
      const updated = details(result.contact); setDraft(updated); setBaseline(JSON.stringify(updated));
      onSaved({ latitude: undefined, longitude: undefined, lat: undefined, lng: undefined, long: undefined, ...result.contact, dialerUnavailable: contact.dialerUnavailable });
      setMessage('Contact details saved. Saved queues keep their original dial numbers.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save contact'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} aria-label="Edit contact details" className="mt-4 space-y-3">
    <fieldset disabled={saving || contact.dialerUnavailable} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">{(['firstName', 'lastName'] as const).map(key => <label key={key} className="text-xs">{key === 'firstName' ? 'First name' : 'Last name'}<input required={key === 'firstName'} className={input} value={draft[key]} maxLength={150} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div>
      <div><p className="text-xs font-semibold">Phone numbers</p>{draft.phones.map((row, index) => <div key={index} className={`mt-2 items-center gap-2 ${index > 0 && !showAllPhones ? 'hidden' : 'flex'}`}><label className="min-w-0 flex-1 text-xs">Phone {index + 1}<input type="tel" required className={input} value={row.number} onChange={event => setDraft({ ...draft, phones: draft.phones.map((item, position) => position === index ? { ...item, number: event.target.value } : item) })} /></label><label className="text-xs"><input type="radio" name="primary-phone" aria-label={'Primary phone ' + (index + 1)} checked={!!row.isPrimary} onChange={() => setDraft({ ...draft, phones: draft.phones.map((item, position) => ({ ...item, isPrimary: position === index })) })} /> Primary</label><button type="button" aria-label={'Remove phone ' + (index + 1)} className={button} onClick={() => setDraft({ ...draft, phones: draft.phones.filter((_, position) => position !== index) })}>×</button></div>)}<button type="button" className={button + ' mt-2'} disabled={draft.phones.length >= 30} onClick={() => { setShowAllPhones(true); setDraft({ ...draft, phones: [...draft.phones, { number: '', label: 'mobile', isPrimary: !draft.phones.length }] }); }}>+ Phone</button>{draft.phones.length > 1 && <button type="button" aria-expanded={showAllPhones} className={button + ' ml-2 mt-2'} onClick={() => setShowAllPhones(!showAllPhones)}>{showAllPhones ? 'Fewer numbers' : `${draft.phones.length - 1} more numbers`}</button>}</div>
      <div><p className="text-xs font-semibold">Email addresses</p>{draft.emails.map((row, index) => <div key={index} className="mt-2 flex items-center gap-2"><label className="min-w-0 flex-1 text-xs">Email {index + 1}<input type="email" required className={input} value={row.address} onChange={event => setDraft({ ...draft, emails: draft.emails.map((item, position) => position === index ? { ...item, address: event.target.value } : item) })} /></label><label className="text-xs"><input type="radio" name="primary-email" aria-label={'Primary email ' + (index + 1)} checked={!!row.isPrimary} onChange={() => setDraft({ ...draft, emails: draft.emails.map((item, position) => ({ ...item, isPrimary: position === index })) })} /> Primary</label><button type="button" aria-label={'Remove email ' + (index + 1)} className={button} onClick={() => setDraft({ ...draft, emails: draft.emails.filter((_, position) => position !== index) })}>×</button></div>)}<button type="button" className={button + ' mt-2'} disabled={draft.emails.length >= 30} onClick={() => setDraft({ ...draft, emails: [...draft.emails, { address: '', label: 'personal', isPrimary: !draft.emails.length }] })}>+ Email</button></div>
      <div className="grid grid-cols-2 gap-2">{(['street', 'city', 'state', 'zip', 'country'] as const).map(key => <label key={key} className={'text-xs ' + (key === 'street' ? 'col-span-2' : '')}>{({ street: 'Street address', city: 'City', state: 'State', zip: 'ZIP code', country: 'Country' })[key]}<input className={input} maxLength={key === 'street' ? 300 : 100} value={draft.address[key]} onChange={event => setDraft({ ...draft, address: { ...draft.address, [key]: event.target.value } })} /></label>)}</div>
      <div className="flex gap-2"><button type="submit" disabled={!dirty} className={button}>{saving ? 'Saving…' : 'Save contact'}</button><button type="button" disabled={!dirty} className={button} onClick={() => { setDraft(JSON.parse(baseline)); setMessage(''); }}>Cancel edits</button></div>
    </fieldset>
    {message && <p role="status" className="text-xs">{message}</p>}
  </form>;
}
