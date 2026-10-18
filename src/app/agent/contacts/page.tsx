'use client';

// src/app/agent/contacts/page.tsx
// Agent Contacts Page - standalone page for managing contacts
// All contact data automatically filtered by userId

import { useEffect, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import ContactsTab from '@/app/components/crm/ContactsTab';
import AgentNav from '@/app/components/AgentNav';
import SavedDialerWorkspace from '@/app/components/crm/dialer/SavedDialerWorkspace';
import type { SavedDialerSession } from '@/lib/dialer/session-contract';
import type { Contact } from '@/app/components/crm/contacts/types';

export default function AgentContactsPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [showToolbar, setShowToolbar] = useState(true);
  const [activeView, setActiveView] = useState<'contacts' | 'dialer'>('contacts');
  const [dialerContacts, setDialerContacts] = useState<Contact[]>([]);
  const [dialerLabel, setDialerLabel] = useState('Selected contacts');
  const [dialerDirty, setDialerDirty] = useState(false);
  const [savedId, setSavedId] = useState<string>();
  const [launch, setLaunch] = useState(0);
  const [recent, setRecent] = useState<SavedDialerSession[]>([]);
  useEffect(() => {
    if (activeView !== 'contacts') return;
    let cancelled = false;
    fetch('/api/crm/dialer/sessions', { cache: 'no-store' }).then(response => response.ok ? response.json() : null)
      .then(data => { if (!cancelled && data) setRecent(data.sessions); }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeView]);
  function openDialer(group: Contact[], label: string) {
    if (!group.length) return;
    setSavedId(undefined); setLaunch(value => value + 1); setDialerContacts([...group]); setDialerLabel(label); setActiveView('dialer');
  }
  function resumeDialer(id: string) {
    setSavedId(id); setDialerLabel(recent.find(item => item._id === id)?.name || 'Saved calling session');
    setDialerContacts([]); setDialerDirty(false); setLaunch(value => value + 1); setActiveView('dialer');
  }

  return (
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col md:p-4 md:p-8" data-page="contacts">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-x-hidden pt-16 md:pt-0">
        {/* Agent Navigation - Fixed */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header - Fixed with gear icon - Wrapped with padding */}
        <div className={`px-4 sm:px-6 lg:px-8 ${activeView === 'dialer' ? 'hidden md:block' : ''}`}>
          <div className="mb-4 sm:mb-6 flex-shrink-0 flex items-start justify-between">
            <div>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {activeView === 'dialer' ? 'Dialer' : 'Contacts'}
              </h1>
              <p className={`text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                {activeView === 'dialer' ? 'Your selected calling queue' : 'Manage your contact database'}
              </p>
            </div>

            {/* Toolbar Toggle Button */}
            <button
              hidden={activeView === 'dialer'}
              onClick={() => setShowToolbar(!showToolbar)}
              className={`p-2 transition-all ${
                isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'
              }`}
              title={showToolbar ? 'Hide filters' : 'Show filters'}
            >
              {!showToolbar ? (
                <svg
                  className="w-6 h-6 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 transition-transform duration-300 animate-spin-once"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {activeView === 'dialer' && <div className="mb-4 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><button disabled={dialerDirty} title={dialerDirty ? 'Save call notes before returning to contacts' : undefined} onClick={() => setActiveView('contacts')} className="min-h-11 rounded-xl border border-emerald-500/30 px-4 text-sm font-semibold text-emerald-600">← Back to contacts</button><p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{dialerLabel} · {savedId && !recent.some(item => item._id === savedId) ? 'Saved progress' : `${savedId ? recent.find(item => item._id === savedId)?.items.length : dialerContacts.length} contacts`}</p></div>}

        {activeView === 'contacts' && recent.length > 0 && <div className="mb-4 px-4 sm:px-6 lg:px-8"><p className="mb-2 text-sm font-semibold">Saved dialing queues · simulation</p><div className="flex gap-2 overflow-x-auto">{recent.map(item => <button key={item._id} onClick={() => resumeDialer(item._id)} className="min-w-48 rounded-xl border border-emerald-500/30 px-4 py-3 text-left text-sm"><span className="block font-semibold">{item.name}</span><span>{item.items.filter(row => row.outcome).length}/{item.items.length} reviewed · {item.status === 'completed' ? 'View' : 'Resume'}</span></button>)}</div></div>}
        {/* Keep the contact list mounted so switching views preserves filters and selection. */}
        <div className={`flex-1 overflow-hidden ${activeView === 'contacts' ? '' : 'hidden'}`}>
          <ContactsTab isLight={isLight} showToolbar={showToolbar} onOpenDialerGroup={openDialer} onOpenDialer={contact => openDialer([contact], 'Single contact')} />
        </div>
        {activeView === 'dialer' && <div className="min-h-0 flex-1 overflow-y-auto"><SavedDialerWorkspace key={launch} isLight={isLight} contacts={dialerContacts} label={dialerLabel} sessionId={savedId} onDirtyChange={setDialerDirty} onResumeSession={resumeDialer} /></div>}
      </div>
    </div>
  );
}
