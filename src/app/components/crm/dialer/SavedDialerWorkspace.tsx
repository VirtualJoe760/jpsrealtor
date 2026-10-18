'use client';

import { useEffect, useRef, useState } from 'react';
import DialerMockup from '../DialerMockup';
import DialerCreditBalance from './DialerCreditBalance';
import type { Contact } from '../contacts/types';
import type { DialerOutcome, SavedDialerSession } from '@/lib/dialer/session-contract';

export default function SavedDialerWorkspace({ isLight, contacts, label, sessionId, onDirtyChange, onResumeSession }: { onDirtyChange?: (dirty: boolean) => void; onResumeSession?: (id: string) => void;
  isLight: boolean; contacts: Contact[]; label: string; sessionId?: string;
}) {
  const [saved, setSaved] = useState<SavedDialerSession>();
  const [records, setRecords] = useState<Contact[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [excludedCount, setExcludedCount] = useState(0);
  const [retry, setRetry] = useState(0);
  const [recoverySessionId, setRecoverySessionId] = useState<string>();
  const key = useRef<string>('');
  const creation = useRef<Promise<Response> | null>(null);
  const pending = useRef<{ signature: string; key: string; body: string; suffix: string; method: string } | null>(null);
  const dirty = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        let id = sessionId;
        if (!id) {
          key.current ||= crypto.randomUUID();
          // Strict Mode effects share one in-flight create, not two independent selections.
          creation.current ||= fetch('/api/crm/dialer/sessions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current },
            body: JSON.stringify({ name: label, contactIds: contacts.map(contact => contact._id) }),
          });
          const response = await creation.current;
          const data = await response.clone().json();
          if (!response.ok) { creation.current = null; throw new Error(data.error); }
          if (!cancelled) setExcludedCount(data.excluded?.length || 0);
          id = data.session._id;
        }
        const response = await fetch('/api/crm/dialer/sessions/' + id, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) { setSaved(data.session); setRecords(data.contacts); }
      } catch (failure) { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Unable to open saved session'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [sessionId, contacts, label, retry]);

  if (loading) return <p role="status" className="p-4">Loading saved dialer…</p>;
  if (error || !saved) return <div role="alert" className="p-4"><p>{error}</p><button className="mt-3 rounded-lg border px-4 py-3" onClick={() => setRetry(value => value + 1)}>Retry</button></div>;
  const byId = new Map(records.map(contact => [contact._id, contact]));
  const unavailable = saved.items.filter(item => !byId.has(item.contactId)).length;
  const ordered = saved.items.map(item => ({ ...(byId.get(item.contactId) || {
    _id: item.contactId, firstName: 'Unavailable', lastName: 'contact', phone: item.phone, createdAt: '', doNotContact: true,
  }), dialerUnavailable: !byId.has(item.contactId), phone: item.phone, phones: [{ number: item.phone, label: 'other' as const, isPrimary: true, isValid: true }] }));
  async function send(suffix: string, method: string, fields: object) {
    const body = JSON.stringify({ version: saved!.version, ...fields });
    const signature = suffix + body;
    if (pending.current && pending.current.signature !== signature) throw new Error('A previous command needs recovery. Retry it unchanged or reopen the saved session.');
    pending.current ||= { signature, key: crypto.randomUUID(), body, suffix, method };
    const request = pending.current;
    const response = await fetch('/api/crm/dialer/sessions/' + saved!._id + request.suffix, {
      method: request.method, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.key }, body: request.body,
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status < 500) pending.current = null;
      if (data.resumeSessionId && data.resumeSessionId !== saved!._id) setRecoverySessionId(data.resumeSessionId);
      throw new Error(data.error);
    }
    pending.current = null;
    setSaved(data.session);
    return data.session as SavedDialerSession;
  }
  async function checkpoint(contactId: string, notes: string, outcome?: DialerOutcome) { await send('', 'PATCH', { contactId, notes, outcome }); }
  async function command(command: 'start' | 'answer' | 'end', contactId: string) {
    return send('/commands', 'POST', { command, ...(command === 'start' ? { contactId } : { attemptId: saved!.activeAttempt?._id }) });
  }
  return <><DialerCreditBalance isLight={isLight} />{unavailable > 0 && <p role="status" className="px-4 pb-3 text-sm">{unavailable} contacts are unavailable. New calls to them are blocked; you can still finish saved wrap-up or skip them.</p>}<div className="mb-3 px-4"><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => {
    if (dirty.current && !window.confirm('Reopen saved state? Unsaved notes in this tab will be discarded. Copy them first if needed.')) return;
    pending.current = null; setRetry(value => value + 1);
  }}>Reopen saved session</button>{recoverySessionId && onResumeSession && <button className="ml-2 rounded-lg border border-emerald-500 px-3 py-2 text-sm" onClick={() => {
    if (dirty.current && !window.confirm('Open the unfinished calling session? Unsaved notes here will be discarded.')) return;
    onResumeSession(recoverySessionId);
  }}>Open unfinished calling session</button>}</div>{excludedCount > 0 && <p role="status" className="px-4 pb-3 text-sm">{excludedCount} contacts excluded: blocked, invalid or duplicate phone numbers.</p>}<DialerMockup key={saved._id} isLight={isLight} contacts={ordered} queueLabel={saved.name} savedSession={saved} onCheckpoint={checkpoint} onCommand={command} onDirtyChange={value => { dirty.current = value; onDirtyChange?.(value); }} /></>;
}
