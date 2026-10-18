'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, ListOrdered, Mic, MicOff, Phone, PhoneOff, RotateCcw, ShieldCheck, SkipForward, StickyNote } from 'lucide-react';

import DialerContactPane from './dialer/DialerContactPane';
import DialerAudioSettings from './dialer/DialerAudioSettings';
import { DIALER_OUTCOMES, attemptElapsedSeconds, type DialerOutcome, type SavedDialerSession } from '@/lib/dialer/session-contract';
import type { DialerContact } from './dialer/property-context';

// Calls remain simulated. Optional checkpoints save queue progress, not CRM outcomes.
const demoContacts = [
  { name: 'Alex Morgan', initials: 'AM', phone: '(760) 555-0101', city: 'Palm Desert, CA', label: 'Seller lead', context: 'Interested in selling later this year. Ask about timing and offer a market update.' },
  { name: 'Jordan Taylor', initials: 'JT', phone: '(760) 555-0102', city: 'La Quinta, CA', label: 'Follow-up', context: 'Reconnect about their home search and confirm the next steps.' },
  { name: 'Casey Rivera', initials: 'CR', phone: '(760) 555-0103', city: 'Rancho Mirage, CA', label: 'Past client', context: 'Check in and offer a fresh neighborhood market update.' },
  { name: 'Sam Parker', initials: 'SP', phone: '(760) 555-0104', city: 'Palm Springs, CA', label: 'Buyer lead', context: 'Discuss preferred neighborhoods and a comfortable price range.' },
];
const outcomes = DIALER_OUTCOMES;
type CallState = 'ready' | 'ringing' | 'connected' | 'wrap-up';

export default function DialerMockup({ isLight, contacts, initialContactId, queueLabel = 'Preview queue', savedSession, onCheckpoint, onDirtyChange, onCommand }: { onCommand?: (command: 'start' | 'answer' | 'end', contactId: string) => Promise<SavedDialerSession>; onDirtyChange?: (dirty: boolean) => void; savedSession?: SavedDialerSession; onCheckpoint?: (contactId: string, notes: string, outcome?: DialerOutcome) => Promise<void>; isLight: boolean; contacts?: DialerContact[]; initialContactId?: string; queueLabel?: string }) {
  const sampleContacts = useMemo(() => contacts?.length ? contacts.map(record => ({
    name: [record.firstName, record.lastName].filter(Boolean).join(' ') || record.organization || 'Unnamed contact',
    initials: ((record.firstName?.[0] || '') + (record.lastName?.[0] || '')).toUpperCase() || '?',
    phone: record.phones?.find(phone => phone.isPrimary)?.number || record.phones?.[0]?.number || record.phone || 'No phone saved',
    city: [record.address?.city, record.address?.state].filter(Boolean).join(', ') || 'Location not saved',
    label: record.status || 'Contact', context: record.notes || 'Review the property and recent MLS sales before your conversation.', record,
  })) : demoContacts.map(contact => ({ ...contact, record: undefined as DialerContact | undefined })), [contacts]);
  const [index, setIndex] = useState(() => Math.max(0, savedSession ? savedSession.activeAttempt ? savedSession.items.findIndex(item => item.contactId === savedSession.activeAttempt.contactId) : savedSession.items.findIndex(item => !item.outcome) : contacts?.findIndex(contact => contact._id === initialContactId) ?? 0));
  const swipeRef = useRef<HTMLDivElement>(null);
  const [mobilePanel, setMobilePanel] = useState(0);
  const [queueSearch, setQueueSearch] = useState('');
  const mobilePanels = ['Dialer', 'Contact', 'Queue'];
  const [sessionStarted, setSessionStarted] = useState(!!savedSession?.activeAttempt);
  const autoAnswer = useRef(false);
  async function beginCall() {
    if (onCommand) { await operate('start'); return; }
    if (savingRef.current) return;
    setSessionStarted(true); setSeconds(0); setMuted(false); setState('ringing');
  }
  async function endCall() { if (onCommand) await operate('end'); else setState('wrap-up'); }
  async function operate(command: 'start' | 'answer' | 'end') {
    if (savingRef.current || !onCommand || !contact.record) return;
    savingRef.current = true; setSaving(true);
    try {
      const response = await onCommand(command, contact.record._id);
      const phase = response.activeAttempt?.state;
      setState(phase && phase !== 'completed' ? phase : 'ready');
      if (command === 'start') { autoAnswer.current = true; setSessionStarted(true); setSeconds(0); setMuted(false); }
      setNotice(command === 'end' ? 'Call ended and saved. Finish wrap-up before the next call.' : 'Simulated attempt saved.');
    } catch (failure) {
      if (command === 'answer') autoAnswer.current = false;
      setNotice(failure instanceof Error ? failure.message : 'Call state could not be saved.');
    } finally { savingRef.current = false; setSaving(false); }
  }
  function showPanel(position: number) {
    if (window.matchMedia('(min-width: 1280px)').matches) return;
    const container = swipeRef.current;
    const target = container?.querySelector<HTMLElement>('[data-panel="' + position + '"]');
    if (!container || !target) return;
    container.scrollTo({ left: target.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  const [state, setState] = useState<CallState>(() => { const phase = savedSession?.activeAttempt?.state; return phase && phase !== 'completed' ? phase : 'ready'; });
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(() => attemptElapsedSeconds(savedSession?.activeAttempt));
  const [notes, setNotes] = useState(() => savedSession?.items[index]?.notes || '');
  const draftCache = useRef<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [outcome, setOutcome] = useState('');
  const [results, setResults] = useState<Record<number, string>>(() => Object.fromEntries(savedSession?.items.flatMap((item, position) => item.outcome ? [[position, item.outcome]] : []) || []));
  const [finished, setFinished] = useState(() => !!savedSession && savedSession.items.every(item => !!item.outcome));
  const [notice, setNotice] = useState(savedSession?.activeAttempt ? 'Recovered simulated attempt. End it or finish wrap-up before starting another.' : '');
  const contact = sampleContacts[Math.min(index, sampleContacts.length - 1)];
  const visibleQueue = useMemo(() => sampleContacts.map((item, position) => ({ item, position })).filter(({ item }) => (item.name + ' ' + item.city + ' ' + item.phone).toLowerCase().includes(queueSearch.toLowerCase())).slice(queueSearch ? 0 : Math.max(0, index - 10), queueSearch ? 50 : Math.max(0, index - 10) + 50), [sampleContacts, queueSearch, index]);
  const active = state === 'ringing' || state === 'connected';
  const recoveredDrafts = Object.entries(draftCache.current).filter(([id, draft]) => id !== contact.record?._id && draft !== savedSession?.items.find(item => item.contactId === id)?.notes);
  const dirty = !!onCheckpoint && ((!results[index] && notes !== (savedSession?.items[index]?.notes || '')) || recoveredDrafts.length > 0);
  useEffect(() => { onDirtyChange?.(dirty || saving); }, [dirty, saving, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const panel = isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#141b29]';
  const subtle = isLight ? 'text-slate-500' : 'text-slate-400';
  const soft = isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10';
  const button = 'rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500';

  useEffect(() => {
    if (!savedSession) return;
    setResults(Object.fromEntries(savedSession.items.flatMap((item, position) => item.outcome ? [[position, item.outcome]] : [])));
    setFinished(savedSession.items.every(item => !!item.outcome));
    const phase = savedSession.activeAttempt?.state;
    setState(phase && phase !== 'completed' ? phase : 'ready');
    if (savedSession.activeAttempt) {
      const next = savedSession.items.findIndex(item => item.contactId === savedSession.activeAttempt.contactId);
      if (next >= 0 && next !== index) {
        if (contact.record) draftCache.current[contact.record._id] = notes;
        setIndex(next);
        setNotes(draftCache.current[savedSession.items[next].contactId] ?? savedSession.items[next].notes);
        setOutcome(''); setNotice('Showing the active contact from the saved session. Other drafts remain in this tab.');
      }
    }
    if (savedSession.activeAttempt?.endedAt) setSeconds(attemptElapsedSeconds(savedSession.activeAttempt));
  }, [savedSession?.version]);

  useEffect(() => {
    if (state !== 'ringing' || saving || (onCommand && !autoAnswer.current)) return;
    const timer = window.setTimeout(() => { if (onCommand) void operate('answer'); else setState('connected'); }, 1800);
    return () => window.clearTimeout(timer);
  }, [state, saving]);
  useEffect(() => {
    if (state !== 'connected') return;
    const update = () => { if (savedSession?.activeAttempt?.answeredAt) setSeconds(Math.max(0, Math.floor((Date.now() - new Date(savedSession.activeAttempt.answeredAt).getTime()) / 1000))); else setSeconds(value => value + 1); };
    if (savedSession?.activeAttempt?.answeredAt) update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [state, savedSession?.activeAttempt?.answeredAt]);

  function selectContact(next: number, committed = false) {
    if (savingRef.current) return;
    if (!committed && savedSession?.activeAttemptId) { setNotice('Finish the active attempt and wrap-up before changing contacts.'); return; }
    if (!committed && onCheckpoint && notes !== (savedSession?.items[index]?.notes || '') && !results[index]) {
      setNotice('Save your notes before switching contacts.'); return;
    }
    setIndex(next); setState('ready'); setNotes(draftCache.current[savedSession?.items[next]?.contactId] ?? savedSession?.items[next]?.notes ?? ''); setOutcome(''); setSeconds(0); setMuted(false); setNotice(''); showPanel(0);
  }
  async function checkpoint(result?: DialerOutcome) {
    if (savingRef.current) return false;
    savingRef.current = true; setSaving(true);
    try {
      if (onCheckpoint && contact.record) { await onCheckpoint(contact.record._id, notes, result); delete draftCache.current[contact.record._id]; }
      setNotice('Checkpoint saved.'); return true;
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Save failed. Your notes remain here.'); return false; }
    finally { savingRef.current = false; setSaving(false); }
  }
  async function advance(result: DialerOutcome) {
    if (!(await checkpoint(result))) return;
    const updated = { ...results, [index]: result };
    setResults(updated);
    const next = sampleContacts.findIndex((_, position) => !updated[position]);
    if (next < 0) { setFinished(true); setState('ready'); }
    else selectContact(next, true);
    setNotice(onCheckpoint ? 'Progress saved. Your next contact is ready.' : 'Outcome saved for this preview. Your next contact is ready.');
  }
  function reset() { setSessionStarted(false); setResults({}); setFinished(false); selectContact(0); }

  return (
    <section aria-label="Dialer preview" className={`px-3 pb-3 sm:px-6 lg:px-8 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${isLight ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}`}>
        <p className="text-sm"><span className="font-semibold">Interactive preview</span><span className="mx-2 opacity-40">/</span>{contacts?.length ? (savedSession ? 'Saved queue · Calls simulated · Use Save notes or Save outcome to keep progress.' : 'CRM contacts · Calls simulated · Call notes stay local.') : 'Sample contacts · Calls simulated · Nothing saved to CRM.'}</p>
        {!savedSession && <button onClick={reset} className="inline-flex items-center gap-2 text-xs font-semibold"><RotateCcw size={13} /> Reset preview</button>}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div><p className={`mb-1 hidden text-xs font-semibold uppercase tracking-[0.18em] xl:block ${subtle}`}>Your calling workspace</p><h2 className="text-lg xl:text-2xl font-semibold tracking-tight">{contact.name}</h2><p className={`mt-2 hidden text-sm xl:block ${subtle}`}>{queueLabel} · {sampleContacts.length} contacts · {sessionStarted ? 'Session started' : 'Ready to start'}</p></div>
        <div className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs xl:flex ${panel}`}><span className="h-2 w-2 rounded-full bg-emerald-500" /> Single-line dialer <span className={subtle}>· Preview</span></div>
      </div>
      <div aria-label="Dialer panels" className={`mb-3 grid grid-cols-3 gap-1 rounded-2xl border p-1 xl:hidden ${soft}`}>
        {mobilePanels.map((label, position) => <button key={label} aria-pressed={mobilePanel === position} aria-controls={'dialer-panel-' + position} onClick={() => showPanel(position)} className={`min-h-11 rounded-xl text-sm font-semibold transition ${mobilePanel === position ? 'bg-emerald-600 text-white shadow-sm' : subtle}`}>{label}</button>)}
      </div>
      <DialerAudioSettings isLight={isLight} locked={active || saving} />
      <p className={`mb-2 text-center text-[11px] xl:hidden ${subtle}`}>Swipe between the dialer and the full contact page <span aria-hidden="true">↔</span></p>
      <div ref={swipeRef} onScroll={event => {
        const container = event.currentTarget;
        setMobilePanel(Math.max(0, Math.min(2, Math.round(container.scrollLeft / container.clientWidth))));
      }} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); showPanel(Math.max(0, Math.min(2, mobilePanel + (event.key === 'ArrowRight' ? 1 : -1))));
        }
      }} tabIndex={0} aria-label="Swipeable contact information" className="relative flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:grid-cols-[220px_minmax(0,1fr)_minmax(360px,1.1fr)] xl:gap-5 xl:overflow-visible">
        <aside id="dialer-panel-2" data-panel="2" aria-label="Dialer queue" className={`order-3 h-[min(62dvh,620px)] w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain rounded-2xl border xl:order-1 xl:h-auto xl:w-auto ${panel}`}>
          <div className="p-5"><div className="flex items-center gap-2 font-semibold"><ListOrdered size={17} /> Calling queue</div><p className={`mt-1 text-xs ${subtle}`}>{contacts?.length ? 'Your contact list' : 'Sample follow-up list'} · {sampleContacts.length} contacts</p><div className={`mt-4 h-1.5 overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-white/10'}`}><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Object.keys(results).length / sampleContacts.length * 100}%` }} /></div><p className={`mt-2 text-xs ${subtle}`}>{Object.keys(results).length} of {sampleContacts.length} reviewed</p></div>
          <label className="mx-4 mb-3 block text-xs font-medium">Find in queue<input value={queueSearch} onChange={event=>setQueueSearch(event.target.value)} placeholder="Name, city, or phone" className={`mt-2 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus:border-emerald-500 ${soft}`} /></label>
          <p className={`px-4 pb-2 text-[11px] ${subtle}`}>Showing up to 50 contacts. Search to find someone quickly.</p>
          <div className="space-y-1 px-2 pb-3">{visibleQueue.map(({item, position}) => (
            <button key={item.record?._id || item.name} disabled={saving || active || !!savedSession?.activeAttemptId || finished || !!results[position]} onClick={() => selectContact(position)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left disabled:cursor-not-allowed ${position === index && !finished ? (isLight ? 'bg-emerald-50' : 'bg-emerald-500/10') : ''}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${results[position] ? 'bg-emerald-500/15 text-emerald-600' : isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-300'}`}>{results[position] ? <Check size={16} /> : item.initials}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.name}</span><span className={`block text-xs ${subtle}`}>{results[position] || item.label}</span></span>{position === index && !finished && <ChevronRight size={15} className="text-emerald-500" />}
            </button>
          ))}</div>
          <div className={`mx-4 mb-4 rounded-xl border p-3 text-xs leading-relaxed ${soft} ${subtle}`}><ShieldCheck size={15} className="mb-2 text-emerald-500" />Future live queues will check calling eligibility before each attempt.</div>
        </aside>
        <div id="dialer-panel-0" data-panel="0" aria-label="Dialer and call notes" className={`order-1 h-[min(62dvh,620px)] w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain rounded-2xl border xl:order-2 xl:h-auto xl:w-auto ${panel}`}>
          {finished ? <div className="flex min-h-[470px] flex-col items-center justify-center p-8 text-center"><span className="mb-5 rounded-full bg-emerald-500/10 p-5 text-emerald-500"><Check size={30} /></span><h3 className="text-2xl font-semibold">List complete.</h3><p className={`mb-6 mt-2 text-sm ${subtle}`}>You reviewed every contact in this queue.</p><button hidden={!!savedSession} onClick={reset} className={`${button} bg-emerald-600 text-white`}>Start a new preview</button></div> : <>
            <div className={`flex items-center justify-between border-b px-6 py-4 ${isLight ? 'border-slate-100' : 'border-white/10'}`}><span className={`text-xs font-medium ${subtle}`}>CONTACT {index + 1} OF {sampleContacts.length}</span><span role="status" className={`text-xs font-semibold ${state === 'connected' ? 'text-emerald-500' : subtle}`}>{state === 'ready' ? 'Ready to call' : state === 'ringing' ? 'Simulating ringing…' : state === 'connected' ? 'Simulated call connected' : 'Call ended · Add an outcome'}</span></div>
            <div className="px-5 pb-5 pt-5 xl:px-6 xl:pb-6 xl:pt-8"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl font-medium text-emerald-600">{contact.initials}</div><div><h3 className="text-2xl font-semibold tracking-tight">{contact.name}</h3><p className={`mt-1 text-sm ${subtle}`}>{contact.city}</p></div></div>
              <div className="mb-6 mt-5 flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-1 text-xs ${soft}`}>{contact.label}</span><span className={`text-sm tabular-nums ${subtle}`}>{contact.phone}</span></div>
              {contact.record && <div className={`mb-4 rounded-xl border p-3 text-sm ${soft}`}><p className="font-semibold">Contact details</p><p className={subtle}>{contact.record.emails?.find(email=>email.isPrimary)?.address || contact.record.email || 'No email saved'}</p>{contact.record.organization && <p className={subtle}>{contact.record.organization}</p>}{contact.record.doNotContact && <p className="mt-2 font-semibold text-rose-500">Do not contact · Live dialing must be suppressed</p>}<p className={`mt-1 text-xs ${subtle}`}>Last contact: {contact.record.lastContactDate ? new Date(contact.record.lastContactDate).toLocaleDateString() : 'Not recorded'}</p></div>}
              <div className={`rounded-xl border p-4 ${soft}`}><p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${subtle}`}>{contact.record?.notes ? 'Saved contact notes' : 'Conversation starter'}</p><p className="text-sm leading-relaxed">{contact.context}</p></div>
              <div className="hidden py-7 text-center xl:block"><p className={`font-mono text-4xl font-light tabular-nums ${active ? 'text-emerald-500' : subtle}`}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</p><p className={`mt-2 text-xs ${subtle}`}>Calls simulated · Choose audio above</p></div>
              <div className="hidden justify-center gap-3 xl:flex"><button disabled={state !== 'connected'} aria-pressed={muted} onClick={() => setMuted(!muted)} className={`${button} border ${soft} inline-flex items-center gap-2`}>{muted ? <MicOff size={17} /> : <Mic size={17} />}{muted ? 'Unmute' : 'Mute'}</button>{active ? <button disabled={saving} onClick={endCall} className={`${button} inline-flex items-center gap-2 bg-rose-600 text-white`}><PhoneOff size={17} /> End call</button> : <button disabled={saving || state === 'wrap-up'} onClick={beginCall} className={`${button} inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700`}><Phone size={17} /> {sessionStarted ? 'Simulate call' : 'Start dialer'}</button>}<button disabled={saving || active} onClick={() => advance('Skipped')} className={`${button} border ${soft} inline-flex items-center gap-2`}><SkipForward size={16} /> Skip</button></div>
            </div>
            <div className={`border-t p-5 xl:p-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}><label htmlFor="dialer-notes" className="mb-3 flex items-center gap-2 text-sm font-semibold"><StickyNote size={16} /> Call notes</label><textarea id="dialer-notes" rows={3} value={notes} disabled={saving} maxLength={10000} onChange={event => setNotes(event.target.value)} placeholder="What did you learn? Capture details for your next conversation…" className={`w-full resize-y rounded-xl border p-3 text-sm outline-none focus:border-emerald-500 ${soft} placeholder:text-slate-400`} /><button hidden={!onCheckpoint} disabled={saving} onClick={() => checkpoint()} className={`${button} mt-2 border ${soft}`}>{saving ? 'Saving…' : 'Save notes'}</button><fieldset className="mt-4"><legend className={`mb-2 text-xs font-medium ${subtle}`}>Call outcome</legend><div className="flex flex-wrap gap-2">{outcomes.map(item => <button key={item} type="button" aria-pressed={outcome === item} onClick={() => setOutcome(item)} className={`rounded-lg border px-3 py-2 text-xs transition ${outcome === item ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : `${soft} ${subtle}`}`}>{item}</button>)}</div></fieldset><button disabled={saving || !outcome || active} onClick={() => advance(outcome as DialerOutcome)} className={`${button} mt-5 flex w-full items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700`}>Save outcome & next <ArrowRight size={16} /></button><p className={`mt-2 text-center text-xs ${subtle}`}>The next call starts only when you choose.</p></div>
          </>}
        </div>
        <aside id="dialer-panel-1" data-panel="1" aria-label="Full contact page" className={`order-2 h-[min(62dvh,620px)] w-full min-w-0 shrink-0 snap-start overflow-hidden rounded-2xl border xl:order-3 xl:h-[min(76vh,900px)] xl:w-auto ${panel}`}><DialerContactPane key={contact.record?._id || contact.name} contact={contact.record} isLight={isLight} visible={mobilePanel === 1} preview={contact} /></aside>
      </div>
      <div className={`sticky bottom-0 z-10 mt-3 rounded-2xl border p-3 shadow-lg xl:hidden ${panel}`}>
        <div className="mb-3 flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{finished ? 'List complete' : contact.name}</p><p role="status" className={`text-xs ${subtle}`}>{state === 'ringing' ? 'Simulating ringing…' : state === 'connected' ? 'Simulated call connected' : state === 'wrap-up' ? 'Call ended · Choose an outcome' : 'Simulation only · No live call'}</p></div><span className="font-mono text-lg tabular-nums">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span></div>
        <div className="flex gap-2"><button aria-label={muted ? 'Unmute call' : 'Mute call'} disabled={state !== 'connected'} aria-pressed={muted} onClick={() => setMuted(!muted)} className={`${button} min-h-12 border ${soft}`}>{muted ? <MicOff size={19} /> : <Mic size={19} />}</button>{active ? <button disabled={saving} onClick={endCall} className={`${button} flex min-h-12 flex-1 items-center justify-center gap-2 bg-rose-600 text-white`}><PhoneOff size={18} />End call</button> : <button disabled={saving || finished} onClick={() => { if(state === 'wrap-up') { showPanel(0); } else {beginCall();} }} className={`${button} flex min-h-12 flex-1 items-center justify-center gap-2 bg-emerald-600 text-white`}><Phone size={18} />{state === 'wrap-up' ? 'Add outcome' : sessionStarted ? 'Simulate call' : 'Start dialer'}</button>}<button disabled={saving || active || finished} aria-label="Skip contact" onClick={() => advance('Skipped')} className={`${button} min-h-12 border ${soft}`}><SkipForward size={19} /></button></div>
      </div>
      <p role="status" aria-live="polite" className={`mt-4 text-sm ${subtle}`}>{notice}</p>
      {recoveredDrafts.length > 0 && <details className={`mt-3 rounded-xl border p-3 text-sm ${soft}`}><summary>Other unsaved drafts in this tab ({recoveredDrafts.length})</summary>{recoveredDrafts.map(([id, draft]) => <label key={id} className="mt-3 block">{sampleContacts.find(item => item.record?._id === id)?.name || 'Previous contact'}<textarea readOnly value={draft} rows={3} className={`mt-2 w-full rounded-lg border p-2 ${soft}`} /></label>)}<p className="mt-2 text-xs">Copy these drafts before reopening or leaving; they have not been saved.</p></details>}
    </section>
  );
}
