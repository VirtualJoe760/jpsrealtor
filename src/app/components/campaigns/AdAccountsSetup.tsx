'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';

interface AdAccountStatus {
  connected: boolean;
  customerId?: string | null;
  availableCustomers?: Array<{ id: string; name?: string }>;
  adAccountId?: string | null;
  adAccountName?: string | null;
  pageId?: string | null;
  pageName?: string | null;
  businessName?: string | null;
  tokenExpiresAt?: string | null;
  availableAdAccounts?: Array<{ id: string; name: string; businessName?: string }>;
  availablePages?: Array<{ id: string; name: string }>;
  accountId?: string | null;
  locationId?: string | null;
  status: string;
  connectedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Brand + UI glyphs (module scope = stable identity, no remounts)     */
/* ------------------------------------------------------------------ */

const GoogleGlyph = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const MetaGlyph = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="#0866FF" aria-hidden="true">
    <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.27-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.157-2.602zm-10.201.553c1.038 0 1.86.475 2.946 1.729.413.478.853 1.078 1.292 1.768l-1.43 2.515c-.629 1.107-1.221 2.012-1.806 2.687-1.18 1.36-1.844 1.546-2.49 1.546-.706 0-1.39-.612-1.39-2.39 0-1.918.56-4.13 1.626-5.836.766-1.227 1.435-1.72 2.252-1.72z" />
  </svg>
);

const StorefrontGlyph = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3.5 8.5 4.7 4.6A1 1 0 0 1 5.66 4h12.68a1 1 0 0 1 .96.6l1.2 3.9M3.5 8.5a2.5 2.5 0 0 0 4.83.5 2.5 2.5 0 0 0 4.84 0 2.5 2.5 0 0 0 4.83 0 2.5 2.5 0 0 0 2.5-.5M3.5 8.5V20a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V8.5M9.5 21v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoCircle = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z" clipRule="evenodd" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Presentational helpers (module scope; theme passed via props)       */
/* ------------------------------------------------------------------ */

function StatusBadge({ connected, isLight }: { connected?: boolean; isLight: boolean }) {
  if (connected) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/15 text-green-400'
      }`}>
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_0_3px] shadow-green-500/20" />
        Connected
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isLight ? 'bg-gray-100 text-gray-500' : 'bg-gray-700/60 text-gray-400'
    }`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
      Not connected
    </span>
  );
}

function IntegrationCard({
  glyph, iconWrap, title, subtitle, connected, isLight, textPrimary, textSecondary, children,
}: {
  glyph: ReactNode; iconWrap: string; title: string; subtitle: string;
  connected?: boolean; isLight: boolean; textPrimary: string; textSecondary: string; children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border p-5 transition-colors ${
      isLight
        ? 'bg-white border-gray-200 hover:border-gray-300'
        : 'bg-gray-800/40 border-gray-700/70 hover:border-gray-600'
    }`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconWrap}`}>{glyph}</div>
          <div>
            <h3 className={`font-semibold leading-tight ${textPrimary}`}>{title}</h3>
            <p className={`text-xs ${textSecondary}`}>{subtitle}</p>
          </div>
        </div>
        <StatusBadge connected={connected} isLight={isLight} />
      </header>
      {children}
    </section>
  );
}

function InfoRow({ label, value, isLight, textSecondary }: { label: string; value: ReactNode; isLight: boolean; textSecondary: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs ${textSecondary}`}>{label}</span>
      <code className={`font-mono text-xs px-2 py-1 rounded-md truncate max-w-[60%] ${
        isLight ? 'bg-gray-100 text-gray-800' : 'bg-gray-900/60 text-gray-200'
      }`}>{value}</code>
    </div>
  );
}

function Callout({ title, children, isLight }: { title: string; children: ReactNode; isLight: boolean }) {
  return (
    <div className={`flex gap-3 rounded-lg p-3.5 ${
      isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-500/10 border border-amber-500/25'
    }`}>
      <InfoCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
      <div className={`text-xs leading-relaxed ${isLight ? 'text-amber-800' : 'text-amber-200/90'}`}>
        <p className="font-semibold mb-0.5">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  );
}

export default function AdAccountsSetup() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [google, setGoogle] = useState<AdAccountStatus | null>(null);
  const [meta, setMeta] = useState<AdAccountStatus | null>(null);
  const [gbp, setGbp] = useState<AdAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Meta form fields
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaPageId, setMetaPageId] = useState('');

  // Google form fields
  const [googleCustomerId, setGoogleCustomerId] = useState('');
  const [googleDevToken, setGoogleDevToken] = useState('');

  const inputClasses = `w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700/60 text-white'
  }`;
  const footerClasses = `flex items-center justify-between pt-3 mt-1 border-t ${
    isLight ? 'border-gray-100' : 'border-gray-700/50'
  }`;
  const dangerLink = `text-xs font-medium transition ${
    isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'
  }`;

  // Pretty-print a bare Google customer id as 123-456-7890
  const formatCid = (id?: string | null) =>
    id ? id.replace(/-/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '';

  // Persist the agent's selected Google customer account.
  const selectGoogleCustomer = async (customerId: string) => {
    await fetch('/api/agent/ad-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'google', customerId }),
    });
    setGoogle((g) => (g ? { ...g, customerId } : g));
    setGoogleCustomerId(customerId);
  };

  // ChatRealty's agency identifiers, shown in the onboarding instructions.
  const MCC_ID = '206-304-7113';            // Google Ads manager account
  const META_PARTNER_BUSINESS_ID = '1260738784844861'; // ChatRealty Business Manager

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/agent/ad-accounts');
        const data = await res.json();
        setGoogle(data.google);
        setMeta(data.meta);
        setGbp(data.gbp);
        if (data.google?.customerId) setGoogleCustomerId(data.google.customerId);
        if (data.meta?.adAccountId) setMetaAdAccountId(data.meta.adAccountId);
        if (data.meta?.pageId) setMetaPageId(data.meta.pageId);
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();

    // Surface OAuth callback results from query params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const metaStatus = params.get('meta_ads');
      const metaErr = params.get('meta_error');
      if (metaStatus === 'connected') setMessage('Meta Business connected!');
      else if (metaStatus === 'connected_partial') setMessage('Meta connected, but no Ad Account or Page was found. Make sure your Facebook account manages at least one Page and has access to an Ad Account.');
      else if (metaErr) setMessage(`Meta connection failed: ${metaErr}`);
    }
  }, []);

  const saveGoogle = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent/ad-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'google',
          customerId: googleCustomerId,
          developerToken: googleDevToken || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Google Ads account saved!');
        setGoogle({ ...google!, connected: true, customerId: googleCustomerId, status: 'connected' });
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  const saveMeta = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent/ad-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'meta',
          adAccountId: metaAdAccountId,
          accessToken: metaAccessToken || undefined,
          pageId: metaPageId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Meta Ads account saved!');
        setMeta({ ...meta!, connected: true, adAccountId: metaAdAccountId, pageId: metaPageId, status: 'connected' });
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (platform: 'google' | 'meta' | 'gbp') => {
    setSaving(true);
    try {
      await fetch(`/api/agent/ad-accounts?platform=${platform}`, { method: 'DELETE' });
      if (platform === 'google') {
        setGoogle({ connected: false, status: 'disconnected', connectedAt: null });
        setGoogleCustomerId('');
        setGoogleDevToken('');
      } else if (platform === 'meta') {
        setMeta({ connected: false, status: 'disconnected', connectedAt: null });
        setMetaAdAccountId('');
        setMetaAccessToken('');
        setMetaPageId('');
      } else if (platform === 'gbp') {
        setGbp({ connected: false, status: 'disconnected', connectedAt: null });
      }
      const labels: Record<string, string> = { google: 'Google Ads', meta: 'Meta Ads', gbp: 'Google Business Profile' };
      setMessage(`${labels[platform]} disconnected`);
    } catch {
      setMessage('Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-2 py-10 text-sm ${textSecondary}`}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading ad accounts…
      </div>
    );
  }

  const isError = message && !/saved|connected|disconnected/.test(message);

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div>
        <h2 className={`text-base font-semibold ${textPrimary}`}>Ad &amp; marketing accounts</h2>
        <p className={`text-sm ${textSecondary}`}>
          Connect the platforms ChatRealty runs on your behalf. You stay the account owner — each
          platform bills you directly; we just build and manage the campaigns.
        </p>
      </div>

      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          isError
            ? isLight ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-red-900/20 text-red-400 border border-red-700/50'
            : isLight ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-green-900/20 text-green-400 border border-green-700/50'
        }`}>
          <InfoCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Google Ads */}
      <IntegrationCard
        glyph={<GoogleGlyph className="h-5 w-5" />}
        iconWrap={isLight ? 'bg-blue-50' : 'bg-blue-500/10'}
        title="Google Ads" subtitle="Search PPC campaigns"
        connected={google?.connected} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary}
      >
        {!google?.connected ? (
          <div className="space-y-3">
            <p className={`text-sm ${textSecondary}`}>
              Connect your Google Ads account to run PPC search campaigns from the dashboard.
            </p>

            {/* Step 1: OAuth */}
            <div className="flex items-center gap-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/15 text-blue-300'
              }`}>1</span>
              <a
                href="/api/auth/google-ads/connect"
                className="inline-flex items-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <GoogleGlyph className="h-4 w-4" />
                Connect with Google
              </a>
            </div>

            {/* Step 2: optional manual entry */}
            <div className="flex items-start gap-3">
              <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isLight ? 'bg-gray-100 text-gray-500' : 'bg-gray-700 text-gray-400'
              }`}>2</span>
              <div className={`flex-1 rounded-lg p-3 ${isLight ? 'bg-gray-50' : 'bg-gray-800/60'}`}>
                <p className={`text-sm font-medium ${textPrimary} mb-2`}>
                  Enter details manually <span className={`font-normal ${textSecondary}`}>(optional — we auto-detect after connecting)</span>
                </p>
                <div className="space-y-2">
                  <div>
                    <label className={`block text-xs ${textSecondary} mb-1`}>Customer ID (from ads.google.com, top right)</label>
                    <input value={googleCustomerId} onChange={(e) => setGoogleCustomerId(e.target.value)}
                      placeholder="123-456-7890" className={inputClasses} />
                  </div>
                  <div>
                    <label className={`block text-xs ${textSecondary} mb-1`}>Developer Token (from API Center — optional until approved)</label>
                    <input value={googleDevToken} onChange={(e) => setGoogleDevToken(e.target.value)}
                      placeholder="Developer token" type="password" className={inputClasses} />
                  </div>
                </div>
                <button onClick={saveGoogle} disabled={saving || !googleCustomerId}
                  className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Google Ads'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Account picker — auto-discovered post-OAuth. Dropdown if >1. */}
            {google.availableCustomers && google.availableCustomers.length > 1 ? (
              <div>
                <label className={`block text-xs ${textSecondary} mb-1`}>Google Ads Account</label>
                <select
                  value={google.customerId || ''}
                  onChange={(e) => selectGoogleCustomer(e.target.value)}
                  className={inputClasses}
                >
                  <option value="" disabled>Select an account…</option>
                  {google.availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatCid(c.id)}{c.name ? ` — ${c.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : google.customerId ? (
              <InfoRow label="Customer ID" value={formatCid(google.customerId)} isLight={isLight} textSecondary={textSecondary} />
            ) : (
              // Discovery failed (e.g. developer token still in review) → manual entry
              <div className={`rounded-lg p-3 ${isLight ? 'bg-gray-50' : 'bg-gray-800/60'}`}>
                <label className={`block text-xs ${textSecondary} mb-1`}>
                  Customer ID (we couldn&apos;t auto-detect it — from ads.google.com, top right)
                </label>
                <input value={googleCustomerId} onChange={(e) => setGoogleCustomerId(e.target.value)}
                  placeholder="123-456-7890" className={inputClasses} />
                <button onClick={saveGoogle} disabled={saving || !googleCustomerId}
                  className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Customer ID'}
                </button>
              </div>
            )}

            <Callout title="One more step — let ChatRealty manage your ads" isLight={isLight}>
              In Google Ads, go to <span className="font-medium">Admin → Access and security → Managers</span> and
              accept the link request from ChatRealty&apos;s agency account
              (<span className="font-medium">{MCC_ID}</span>). This lets us build and run your campaigns on your
              behalf — Google bills your account directly.
            </Callout>

            <div className={footerClasses}>
              <span className={`text-xs ${textSecondary}`}>
                {google.connectedAt ? `Connected ${new Date(google.connectedAt).toLocaleDateString()}` : ''}
              </span>
              <button onClick={() => disconnect('google')} disabled={saving} className={dangerLink}>Disconnect</button>
            </div>
          </div>
        )}
      </IntegrationCard>

      {/* Meta Ads */}
      <IntegrationCard
        glyph={<MetaGlyph className="h-5 w-5" />}
        iconWrap={isLight ? 'bg-blue-50' : 'bg-blue-500/10'}
        title="Meta Ads" subtitle="Facebook &amp; Instagram retargeting"
        connected={meta?.connected} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary}
      >
        {!meta?.connected ? (
          <div className="space-y-3">
            <p className={`text-sm ${textSecondary}`}>
              Connect your Meta Business account so we can run ads on Facebook and Instagram
              on your behalf. We&apos;ll request permission to manage your Pages and Ad Account —
              Meta bills your card directly.
            </p>

            <a
              href="/api/auth/meta-ads/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0866FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0759db]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Connect Meta Business
            </a>
            <p className={`text-xs ${textSecondary}`}>
              You&apos;ll be redirected to Facebook to authorize ChatRealty to manage your ads.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meta.businessName && (
              <InfoRow label="Business" value={meta.businessName} isLight={isLight} textSecondary={textSecondary} />
            )}

            {/* Ad Account selector — only show dropdown if there are multiple */}
            {meta.availableAdAccounts && meta.availableAdAccounts.length > 1 ? (
              <div>
                <label className={`block text-xs ${textSecondary} mb-1`}>Ad Account</label>
                <select
                  value={meta.adAccountId || ''}
                  onChange={async (e) => {
                    const sel = meta.availableAdAccounts!.find((a) => a.id === e.target.value);
                    if (!sel) return;
                    await fetch('/api/agent/ad-accounts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ platform: 'meta', adAccountId: sel.id, adAccountName: sel.name }),
                    });
                    setMeta({ ...meta, adAccountId: sel.id, adAccountName: sel.name });
                  }}
                  className={inputClasses}
                >
                  {meta.availableAdAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.businessName ? ` — ${a.businessName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <InfoRow label="Ad Account" value={meta.adAccountName || meta.adAccountId} isLight={isLight} textSecondary={textSecondary} />
            )}

            {/* Page selector — only show dropdown if there are multiple */}
            {meta.availablePages && meta.availablePages.length > 1 ? (
              <div>
                <label className={`block text-xs ${textSecondary} mb-1`}>Facebook Page</label>
                <select
                  value={meta.pageId || ''}
                  onChange={async (e) => {
                    const sel = meta.availablePages!.find((p) => p.id === e.target.value);
                    if (!sel) return;
                    await fetch('/api/agent/ad-accounts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ platform: 'meta', pageId: sel.id, pageName: sel.name }),
                    });
                    setMeta({ ...meta, pageId: sel.id, pageName: sel.name });
                  }}
                  className={inputClasses}
                >
                  {meta.availablePages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ) : meta.pageName || meta.pageId ? (
              <InfoRow label="Facebook Page" value={meta.pageName || meta.pageId} isLight={isLight} textSecondary={textSecondary} />
            ) : null}

            <Callout title="One more step — add ChatRealty as a Partner" isLight={isLight}>
              In <span className="font-medium">Meta Business Settings → Partners → Add Partner</span>, enter
              ChatRealty&apos;s Business ID <span className="font-medium">{META_PARTNER_BUSINESS_ID}</span> and
              grant <span className="font-medium">Manage ad account</span> access. This lets us build and run your
              ads on your behalf — Meta bills your account directly.
            </Callout>

            <div className={footerClasses}>
              <span className={`text-xs ${textSecondary}`}>
                {meta.connectedAt ? `Connected ${new Date(meta.connectedAt).toLocaleDateString()}` : ''}
                {meta.tokenExpiresAt && (
                  <> · Token expires {new Date(meta.tokenExpiresAt).toLocaleDateString()}</>
                )}
              </span>
              <div className="flex items-center gap-3">
                <a
                  href="/api/auth/meta-ads/connect"
                  className={`text-xs font-medium transition ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                >
                  Reconnect / Refresh
                </a>
                <button
                  onClick={async () => {
                    await fetch('/api/auth/meta-ads/disconnect', { method: 'POST' });
                    setMeta({ connected: false, status: 'disconnected', connectedAt: null });
                    setMessage('Meta Ads disconnected');
                  }}
                  disabled={saving}
                  className={dangerLink}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </IntegrationCard>

      {/* Google Business Profile */}
      <IntegrationCard
        glyph={<StorefrontGlyph className={`h-5 w-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />}
        iconWrap={isLight ? 'bg-emerald-50' : 'bg-emerald-500/10'}
        title="Google Business Profile" subtitle="Auto-post articles to your GBP listing"
        connected={gbp?.connected} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary}
      >
        {!gbp?.connected ? (
          <div className="space-y-3">
            <p className={`text-sm ${textSecondary}`}>
              Connect your Google Business Profile to automatically publish articles as GBP posts
              when you hit publish. We&apos;ll detect your account and location after you grant access.
            </p>
            <a
              href="/api/auth/gbp/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <StorefrontGlyph className="h-4 w-4 text-white" />
              Connect Google Business Profile
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {gbp.accountId && (
              <InfoRow label="Account" value={gbp.accountId} isLight={isLight} textSecondary={textSecondary} />
            )}
            {gbp.locationId && (
              <InfoRow label="Location" value={gbp.locationId} isLight={isLight} textSecondary={textSecondary} />
            )}
            {!gbp.accountId && !gbp.locationId && (
              <p className={`text-sm ${textSecondary}`}>
                Connected, but account/location wasn&apos;t auto-detected. Try disconnecting and reconnecting.
              </p>
            )}
            <div className={footerClasses}>
              <span className={`text-xs ${textSecondary}`}>
                {gbp.connectedAt ? `Connected ${new Date(gbp.connectedAt).toLocaleDateString()}` : ''}
              </span>
              <button onClick={() => disconnect('gbp')} disabled={saving} className={dangerLink}>Disconnect</button>
            </div>
          </div>
        )}
      </IntegrationCard>
    </div>
  );
}
