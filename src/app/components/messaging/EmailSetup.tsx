'use client';

import { useState, useEffect } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { EMAIL_SETUP_CREDITS, CREDIT_SPEND_VALUE } from '@/config/credits';

interface EmailStatus {
  domain: string | null;
  fromAddress: string | null;
  status: string;
  canEmail: boolean;
  usingSharedSender: boolean;
}
interface DnsRecord {
  record?: string; name?: string; type?: string; value?: string; ttl?: string; priority?: number; status?: string;
}

export default function EmailSetup() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [domain, setDomain] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const card = isLight ? 'bg-white border-gray-200' : 'bg-gray-800/40 border-gray-700/70';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-900/50 text-gray-100'}`;

  const load = async () => {
    try {
      const r = await fetch('/api/agent/email');
      const d = await r.json();
      if (d.success) setStatus(d.email);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const activate = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/agent/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, fromAddress }),
      });
      const d = await r.json();
      if (d.success) { setRecords(d.records || []); await load(); }
      else if (r.status === 402 || d.error === 'insufficient_credits') {
        setMsg(`Not enough credits — activation needs ${d.creditsNeeded ?? EMAIL_SETUP_CREDITS}. Buy more credits, then try again.`);
      } else setMsg(d.error || 'Could not set up email');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/agent/email', { method: 'PATCH' });
      const d = await r.json();
      if (d.success) {
        setRecords(d.records || []);
        if (!d.verified) setMsg('Not verified yet — DNS changes can take a little while to propagate.');
        await load();
      } else setMsg(d.error || 'Verification failed');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  if (loading) return <div className={`text-sm ${textSecondary} py-6`}>Loading email…</div>;

  const verified = status?.status === 'verified';
  const provisioning = status?.status === 'provisioning';
  const dollars = Math.round(EMAIL_SETUP_CREDITS * CREDIT_SPEND_VALUE);

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className={`font-semibold ${textPrimary}`}>Email Sending</h3>
          <p className={`text-xs ${textSecondary}`}>Send from your own domain</p>
        </div>
        {verified && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/15 text-green-400'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Verified
          </span>
        )}
      </div>

      {msg && (
        <div className={`mb-3 p-2.5 rounded-lg text-sm ${isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'}`}>{msg}</div>
      )}

      {verified ? (
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${textSecondary}`}>Sending as</span>
          <code className={`font-mono text-sm px-2 py-1 rounded-md ${isLight ? 'bg-gray-100 text-gray-800' : 'bg-gray-900/60 text-gray-200'}`}>{status?.fromAddress}</code>
        </div>
      ) : provisioning ? (
        <div className="space-y-3">
          <p className={`text-sm ${textSecondary}`}>Add these DNS records to <strong>{status?.domain}</strong>, then verify. DNS changes can take a little while.</p>
          {records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className={textSecondary}><th className="text-left p-1">Type</th><th className="text-left p-1">Name</th><th className="text-left p-1">Value</th></tr></thead>
                <tbody>
                  {records.map((rec, i) => (
                    <tr key={i} className={isLight ? 'border-t border-gray-100' : 'border-t border-gray-700'}>
                      <td className="p-1 font-mono">{rec.type}</td>
                      <td className="p-1 font-mono break-all">{rec.name}</td>
                      <td className="p-1 font-mono break-all">{rec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={verify} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Checking…' : 'Check verification'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm ${textSecondary}`}>
            Use your own domain so emails come from you (better deliverability than a shared address).
            One-time {EMAIL_SETUP_CREDITS} credits (~${dollars}) to activate.
          </p>
          <div>
            <label className={`block text-xs ${textSecondary} mb-1`}>Sending domain</label>
            <input className={inputCls} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="mail.youragent.com" />
          </div>
          <div>
            <label className={`block text-xs ${textSecondary} mb-1`}>From address</label>
            <input className={inputCls} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="you@mail.youragent.com" />
          </div>
          <div className="flex justify-end">
            <button onClick={activate} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Activating…' : 'Activate email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
