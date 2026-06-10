'use client';

import { useState, useEffect } from 'react';
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

export default function AdAccountsSetup() {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
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

  const inputClasses = `w-full px-3 py-2 rounded-lg border text-sm ${
    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
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
    return <div className={`text-sm ${textSecondary} text-center py-8`}>Loading ad accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('saved') || message.includes('connected') || message.includes('disconnected')
            ? isLight ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-green-900/20 text-green-400 border border-green-700/50'
            : isLight ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-red-900/20 text-red-400 border border-red-700/50'
        }`}>
          {message}
        </div>
      )}

      {/* Google Ads */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-blue-100' : 'bg-blue-900/30'
            }`}>
              <span className="text-xl">G</span>
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Google Ads</h3>
              <p className={`text-xs ${textSecondary}`}>Search PPC campaigns</p>
            </div>
          </div>
          {google?.connected && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400'
            }`}>
              Connected
            </span>
          )}
        </div>

        {!google?.connected ? (
          <div className="space-y-3">
            <p className={`text-sm ${textSecondary}`}>
              Connect your Google Ads account to run PPC search campaigns from the dashboard.
            </p>

            {/* Step 1: OAuth to get refresh token */}
            <div className={`p-3 rounded-lg ${isLight ? 'bg-blue-50' : 'bg-blue-900/10'}`}>
              <p className={`text-sm font-medium ${textPrimary} mb-2`}>Step 1: Connect Google Account</p>
              <a
                href="/api/auth/google-ads/connect"
                className={`inline-block px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Connect with Google
              </a>
            </div>

            {/* Step 2: Customer ID + Dev Token */}
            <div className={`p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
              <p className={`text-sm font-medium ${textPrimary} mb-2`}>Step 2: Enter Account Details</p>
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
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}>
                {saving ? 'Saving...' : 'Save Google Ads'}
              </button>
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
              <p className={`text-sm ${textSecondary}`}>
                Customer ID: <span className={`font-medium ${textPrimary}`}>{formatCid(google.customerId)}</span>
              </p>
            ) : (
              // Discovery failed (e.g. developer token still in review) → manual entry
              <div className={`p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                <label className={`block text-xs ${textSecondary} mb-1`}>
                  Customer ID (we couldn&apos;t auto-detect it — from ads.google.com, top right)
                </label>
                <input value={googleCustomerId} onChange={(e) => setGoogleCustomerId(e.target.value)}
                  placeholder="123-456-7890" className={inputClasses} />
                <button onClick={saveGoogle} disabled={saving || !googleCustomerId}
                  className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:opacity-50`}>
                  {saving ? 'Saving...' : 'Save Customer ID'}
                </button>
              </div>
            )}

            {/* Agency onboarding: accept ChatRealty's manager link */}
            <div className={`p-3 rounded-lg text-xs ${isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-900/15 text-amber-300 border border-amber-700/40'}`}>
              <p className="font-medium mb-1">One more step — let ChatRealty manage your ads</p>
              <p>
                In Google Ads, go to <span className="font-medium">Admin → Access and security → Managers</span> and
                accept the link request from ChatRealty&apos;s agency account
                (<span className="font-medium">{MCC_ID}</span>). This lets us build and run your
                campaigns on your behalf — Google bills your account directly.
              </p>
            </div>

            {google.connectedAt && (
              <p className={`text-xs ${textSecondary}`}>
                Connected {new Date(google.connectedAt).toLocaleDateString()}
              </p>
            )}
            <button onClick={() => disconnect('google')} disabled={saving}
              className={`text-sm ${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Meta Ads */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-pink-100' : 'bg-pink-900/30'
            }`}>
              <span className="text-xl">M</span>
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Meta Ads</h3>
              <p className={`text-xs ${textSecondary}`}>Facebook & Instagram retargeting</p>
            </div>
          </div>
          {meta?.connected && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400'
            }`}>
              Connected
            </span>
          )}
        </div>

        {!meta?.connected ? (
          <div className="space-y-3">
            <p className={`text-sm ${textSecondary}`}>
              Connect your Meta Business account so we can run ads on Facebook and Instagram
              on your behalf. We&apos;ll request permission to manage your Pages and Ad Account —
              Meta bills your card directly.
            </p>

            <div className={`p-3 rounded-lg ${isLight ? 'bg-pink-50' : 'bg-pink-900/10'}`}>
              <a
                href="/api/auth/meta-ads/connect"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1877F2] hover:bg-[#166FE5]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Connect Meta Business
              </a>
              <p className={`text-xs ${textSecondary} mt-2`}>
                You&apos;ll be redirected to Facebook to authorize ChatRealty to manage your ads.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {meta.businessName && (
              <p className={`text-sm ${textSecondary}`}>
                Business: <span className={`font-medium ${textPrimary}`}>{meta.businessName}</span>
              </p>
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
              <p className={`text-sm ${textSecondary}`}>
                Ad Account: <span className={`font-medium ${textPrimary}`}>{meta.adAccountName || meta.adAccountId}</span>
              </p>
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
              <p className={`text-sm ${textSecondary}`}>
                Facebook Page: <span className={`font-medium ${textPrimary}`}>{meta.pageName || meta.pageId}</span>
              </p>
            ) : null}

            {/* Agency onboarding: add ChatRealty as a Partner on the ad account */}
            <div className={`p-3 rounded-lg text-xs ${isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-900/15 text-amber-300 border border-amber-700/40'}`}>
              <p className="font-medium mb-1">One more step — add ChatRealty as a Partner</p>
              <p>
                In <span className="font-medium">Meta Business Settings → Partners → Add Partner</span>,
                enter ChatRealty&apos;s Business ID <span className="font-medium">{META_PARTNER_BUSINESS_ID}</span> and
                grant <span className="font-medium">Manage ad account</span> access. This lets us build and run
                your ads on your behalf — Meta bills your account directly.
              </p>
            </div>

            {meta.connectedAt && (
              <p className={`text-xs ${textSecondary}`}>
                Connected {new Date(meta.connectedAt).toLocaleDateString()}
                {meta.tokenExpiresAt && (
                  <> · Token expires {new Date(meta.tokenExpiresAt).toLocaleDateString()}</>
                )}
              </p>
            )}

            <div className="flex gap-3">
              <a
                href="/api/auth/meta-ads/connect"
                className={`text-sm ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
              >
                Reconnect / Refresh token
              </a>
              <button
                onClick={async () => {
                  await fetch('/api/auth/meta-ads/disconnect', { method: 'POST' });
                  setMeta({ connected: false, status: 'disconnected', connectedAt: null });
                  setMessage('Meta Ads disconnected');
                }}
                disabled={saving}
                className={`text-sm ${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Google Business Profile */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-emerald-100' : 'bg-emerald-900/30'
            }`}>
              <span className="text-xl">B</span>
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Google Business Profile</h3>
              <p className={`text-xs ${textSecondary}`}>Auto-post articles to your GBP listing</p>
            </div>
          </div>
          {gbp?.connected && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400'
            }`}>
              Connected
            </span>
          )}
        </div>

        {!gbp?.connected ? (
          <div className="space-y-3">
            <p className={`text-sm ${textSecondary}`}>
              Connect your Google Business Profile to automatically publish articles as GBP posts
              when you hit publish.
            </p>

            <div className={`p-3 rounded-lg ${isLight ? 'bg-emerald-50' : 'bg-emerald-900/10'}`}>
              <p className={`text-sm font-medium ${textPrimary} mb-2`}>Connect via Google OAuth</p>
              <p className={`text-xs ${textSecondary} mb-3`}>
                We will automatically detect your GBP account and location after you grant access.
              </p>
              <a
                href="/api/auth/gbp/connect"
                className={`inline-block px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  isLight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Connect Google Business Profile
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {gbp.accountId && (
              <p className={`text-sm ${textSecondary}`}>
                Account: <span className={`font-medium ${textPrimary}`}>{gbp.accountId}</span>
              </p>
            )}
            {gbp.locationId && (
              <p className={`text-sm ${textSecondary}`}>
                Location: <span className={`font-medium ${textPrimary}`}>{gbp.locationId}</span>
              </p>
            )}
            {!gbp.accountId && !gbp.locationId && (
              <p className={`text-sm ${textSecondary}`}>
                Connected but account/location not auto-detected.
                Try disconnecting and reconnecting.
              </p>
            )}
            {gbp.connectedAt && (
              <p className={`text-xs ${textSecondary}`}>
                Connected {new Date(gbp.connectedAt).toLocaleDateString()}
              </p>
            )}
            <button onClick={() => disconnect('gbp')} disabled={saving}
              className={`text-sm ${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
