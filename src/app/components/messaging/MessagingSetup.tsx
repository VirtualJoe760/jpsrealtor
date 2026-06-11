'use client';

import { useState, useEffect } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';

interface MessagingStatus {
  twilioNumber: string | null;
  messagingServiceSid: string | null;
  status: string;
  a2p: { status: string };
  provisionedAt: string | null;
  usingSharedNumber: boolean;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

const fmt = (e164?: string | null) =>
  e164 ? e164.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : '';

export default function MessagingSetup() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [status, setStatus] = useState<MessagingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [areaCode, setAreaCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AvailableNumber[]>([]);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const card = isLight ? 'bg-white border-gray-200' : 'bg-gray-800/40 border-gray-700/70';
  const input = `px-3 py-2 rounded-lg border text-sm ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700/60 text-white'}`;

  const load = async () => {
    try {
      const res = await fetch('/api/agent/messaging');
      const data = await res.json();
      if (data.success) setStatus(data.messaging);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const search = async () => {
    setMessage('');
    setResults([]);
    if (!/^\d{3}$/.test(areaCode)) { setMessage('Enter a 3-digit area code (e.g. 760).'); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/agent/messaging/numbers?areaCode=${areaCode}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setResults(data.numbers || []);
        if (!data.numbers?.length) setMessage(`No available numbers in area code ${areaCode}. Try another.`);
      } else setMessage(data.error || 'Search failed');
    } catch { setMessage('Network error'); } finally { setSearching(false); }
  };

  const provision = async (phoneNumber: string) => {
    if (!window.confirm(`Claim ${fmt(phoneNumber)} as your texting number? This rents the number (~$1.50/mo, billed via credits).`)) return;
    setProvisioning(phoneNumber);
    setMessage('');
    try {
      const res = await fetch('/api/agent/messaging/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (data.success) { setResults([]); setAreaCode(''); await load(); }
      else setMessage(data.error || 'Could not claim that number');
    } catch { setMessage('Network error'); } finally { setProvisioning(null); }
  };

  if (loading) {
    return <div className={`text-sm ${textSecondary} py-6`}>Loading messaging…</div>;
  }

  const provisioned = !!status?.twilioNumber;

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className={`font-semibold ${textPrimary}`}>Text Messaging (SMS)</h3>
          <p className={`text-xs ${textSecondary}`}>Your own number to text leads &amp; clients</p>
        </div>
        {provisioned && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/15 text-green-400'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Connected
          </span>
        )}
      </div>

      {message && (
        <div className={`mb-3 p-2.5 rounded-lg text-sm ${isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'}`}>{message}</div>
      )}

      {provisioned ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs ${textSecondary}`}>Your number</span>
            <code className={`font-mono text-sm px-2 py-1 rounded-md ${isLight ? 'bg-gray-100 text-gray-800' : 'bg-gray-900/60 text-gray-200'}`}>{fmt(status!.twilioNumber)}</code>
          </div>
          <div className={`p-3 rounded-lg text-xs ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-500/10 border border-amber-500/25 text-amber-200'}`}>
            <p className="font-semibold mb-0.5">One more step — A2P 10DLC registration ({status!.a2p.status})</p>
            <p>US carriers require registering your business + campaign before texts deliver reliably. We&apos;ll walk you through it next (it uses your business details and your SMS Terms &amp; Privacy). Until approved, messages may be filtered.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm ${textSecondary}`}>
            Get your own local number so you can text leads and clients from your dashboard
            (and they reply to <em>you</em>, not a shared line).
          </p>
          <div className="flex items-end gap-2">
            <div>
              <label className={`block text-xs ${textSecondary} mb-1`}>Area code</label>
              <input value={areaCode} onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="760" inputMode="numeric" className={`${input} w-24`} />
            </div>
            <button onClick={search} disabled={searching}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {searching ? 'Searching…' : 'Find numbers'}
            </button>
          </div>

          {results.length > 0 && (
            <ul className="space-y-2 pt-1">
              {results.map((n) => (
                <li key={n.phoneNumber} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
                  <div>
                    <p className={`font-mono text-sm ${textPrimary}`}>{fmt(n.phoneNumber)}</p>
                    {(n.locality || n.region) && <p className={`text-xs ${textSecondary}`}>{[n.locality, n.region].filter(Boolean).join(', ')}</p>}
                  </div>
                  <button onClick={() => provision(n.phoneNumber)} disabled={!!provisioning}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                    {provisioning === n.phoneNumber ? 'Claiming…' : 'Claim'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {status?.usingSharedNumber && (
            <p className={`text-xs ${textSecondary}`}>Until you claim a number, outbound texts use the shared ChatRealty line.</p>
          )}
        </div>
      )}
    </div>
  );
}
