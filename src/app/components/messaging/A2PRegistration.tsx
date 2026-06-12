'use client';

import { useState, useEffect } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';

interface A2PInfo {
  status?: string;
  legalBusinessName?: string;
  ein?: string;
  businessType?: string;
  website?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
}

const BUSINESS_TYPES = [
  { v: 'sole_proprietor', l: 'Sole proprietor' },
  { v: 'llc', l: 'LLC' },
  { v: 'corporation', l: 'Corporation' },
  { v: 'partnership', l: 'Partnership' },
  { v: 'non_profit', l: 'Non-profit' },
];

export default function A2PRegistration() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [a2p, setA2p] = useState<A2PInfo>({ status: 'none' });
  const [f, setF] = useState<A2PInfo>({});

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-900/50 text-gray-100'
  }`;

  const load = async () => {
    try {
      const res = await fetch('/api/agent/messaging/a2p');
      const d = await res.json();
      if (d.success) {
        setA2p(d.a2p || { status: 'none' });
        setF({ ...(d.a2p || {}), address: d.a2p?.address || {} });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/agent/messaging/a2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { setMsg(d.error || 'Could not submit'); return; }
      await load();
    } catch {
      setMsg('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={`text-sm ${textSecondary} py-3`}>Loading registration…</div>;

  if (a2p.status === 'approved') {
    return (
      <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-green-500/10 border border-green-500/25 text-green-300'}`}>
        <p className="font-semibold">✓ A2P 10DLC registered</p>
        <p>{a2p.legalBusinessName ? `${a2p.legalBusinessName} is approved to send SMS.` : 'Your business is approved to send SMS.'}</p>
      </div>
    );
  }

  if (a2p.status === 'pending') {
    return (
      <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-500/10 border border-amber-500/25 text-amber-200'}`}>
        <p className="font-semibold">A2P 10DLC registration — under review</p>
        <p>We&apos;ve received {a2p.legalBusinessName ? `${a2p.legalBusinessName}'s` : 'your'} business details and submitted them for carrier registration. Until approved, messages may be filtered. This usually takes a few business days.</p>
      </div>
    );
  }

  const upd = (k: keyof A2PInfo, v: string) => setF((s) => ({ ...s, [k]: v }));
  const updAddr = (k: string, v: string) => setF((s) => ({ ...s, address: { ...(s.address || {}), [k]: v } }));

  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-lg text-xs ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-500/10 border border-amber-500/25 text-amber-200'}`}>
        <p className="font-semibold mb-0.5">Register to send texts (A2P 10DLC){a2p.status === 'rejected' ? ' — resubmit needed' : ''}</p>
        <p>US carriers require registering your business before texts deliver reliably. We&apos;ll handle the submission — just provide your business details.</p>
      </div>

      {msg && <div className="text-sm text-amber-600">{msg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="sm:col-span-2">
          <label className={`block text-xs ${textSecondary} mb-1`}>Legal business name *</label>
          <input className={inputCls} value={f.legalBusinessName || ''} onChange={(e) => upd('legalBusinessName', e.target.value)} placeholder="JPS & Company LLC" />
        </div>
        <div>
          <label className={`block text-xs ${textSecondary} mb-1`}>EIN / Tax ID *</label>
          <input className={inputCls} value={f.ein || ''} onChange={(e) => upd('ein', e.target.value)} placeholder="12-3456789" />
        </div>
        <div>
          <label className={`block text-xs ${textSecondary} mb-1`}>Business type *</label>
          <select className={inputCls} value={f.businessType || ''} onChange={(e) => upd('businessType', e.target.value)}>
            <option value="">Select…</option>
            {BUSINESS_TYPES.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-xs ${textSecondary} mb-1`}>Support email *</label>
          <input className={inputCls} value={f.supportEmail || ''} onChange={(e) => upd('supportEmail', e.target.value)} placeholder="you@brokerage.com" />
        </div>
        <div>
          <label className={`block text-xs ${textSecondary} mb-1`}>Support phone</label>
          <input className={inputCls} value={f.supportPhone || ''} onChange={(e) => upd('supportPhone', e.target.value)} placeholder="(760) 555-0100" />
        </div>
        <div className="sm:col-span-2">
          <label className={`block text-xs ${textSecondary} mb-1`}>Website</label>
          <input className={inputCls} value={f.website || ''} onChange={(e) => upd('website', e.target.value)} placeholder="https://youragent.com" />
        </div>
        <div className="sm:col-span-2">
          <label className={`block text-xs ${textSecondary} mb-1`}>Business address</label>
          <input className={`${inputCls} mb-2`} value={f.address?.street || ''} onChange={(e) => updAddr('street', e.target.value)} placeholder="Street" />
          <div className="grid grid-cols-3 gap-2">
            <input className={inputCls} value={f.address?.city || ''} onChange={(e) => updAddr('city', e.target.value)} placeholder="City" />
            <input className={inputCls} value={f.address?.state || ''} onChange={(e) => updAddr('state', e.target.value)} placeholder="State" />
            <input className={inputCls} value={f.address?.postalCode || ''} onChange={(e) => updAddr('postalCode', e.target.value)} placeholder="ZIP" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Submitting…' : 'Submit for registration'}
        </button>
      </div>
    </div>
  );
}
