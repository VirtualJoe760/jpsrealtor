'use client';

import { useState, useEffect } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';

interface AdAccountStatus {
  connected: boolean;
  customerId?: string | null;
  adAccountId?: string | null;
  pageId?: string | null;
  status: string;
  connectedAt: string | null;
}

export default function AdAccountsSetup() {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [google, setGoogle] = useState<AdAccountStatus | null>(null);
  const [meta, setMeta] = useState<AdAccountStatus | null>(null);
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

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/agent/ad-accounts');
        const data = await res.json();
        setGoogle(data.google);
        setMeta(data.meta);
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

  const disconnect = async (platform: 'google' | 'meta') => {
    setSaving(true);
    try {
      await fetch(`/api/agent/ad-accounts?platform=${platform}`, { method: 'DELETE' });
      if (platform === 'google') {
        setGoogle({ connected: false, status: 'disconnected', connectedAt: null });
        setGoogleCustomerId('');
        setGoogleDevToken('');
      } else {
        setMeta({ connected: false, status: 'disconnected', connectedAt: null });
        setMetaAdAccountId('');
        setMetaAccessToken('');
        setMetaPageId('');
      }
      setMessage(`${platform === 'google' ? 'Google' : 'Meta'} Ads disconnected`);
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
          <div className="space-y-2">
            <p className={`text-sm ${textSecondary}`}>
              Customer ID: <span className={`font-medium ${textPrimary}`}>{google.customerId}</span>
            </p>
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
              Connect your Meta Ads account to run retargeting campaigns on Facebook and Instagram.
            </p>
            <div className={`p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
              <div className="space-y-2">
                <div>
                  <label className={`block text-xs ${textSecondary} mb-1`}>Ad Account ID (from Meta Business Suite → Ad Accounts)</label>
                  <input value={metaAdAccountId} onChange={(e) => setMetaAdAccountId(e.target.value)}
                    placeholder="act_XXXXXXXXX" className={inputClasses} />
                </div>
                <div>
                  <label className={`block text-xs ${textSecondary} mb-1`}>Facebook Page ID (from Page → About → Page ID)</label>
                  <input value={metaPageId} onChange={(e) => setMetaPageId(e.target.value)}
                    placeholder="Page ID (numeric)" className={inputClasses} />
                </div>
                <div>
                  <label className={`block text-xs ${textSecondary} mb-1`}>Access Token (System User with ads_management permission)</label>
                  <input value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="Access token" type="password" className={inputClasses} />
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    Leave blank to use your existing CAPI token (if it has ads_management scope)
                  </p>
                </div>
              </div>
              <button onClick={saveMeta} disabled={saving || !metaAdAccountId || !metaPageId}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  isLight ? 'bg-pink-600 hover:bg-pink-700' : 'bg-pink-600 hover:bg-pink-700'
                } disabled:opacity-50`}>
                {saving ? 'Saving...' : 'Save Meta Ads'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className={`text-sm ${textSecondary}`}>
              Ad Account: <span className={`font-medium ${textPrimary}`}>{meta.adAccountId}</span>
            </p>
            {meta.pageId && (
              <p className={`text-sm ${textSecondary}`}>
                Page ID: <span className={`font-medium ${textPrimary}`}>{meta.pageId}</span>
              </p>
            )}
            {meta.connectedAt && (
              <p className={`text-xs ${textSecondary}`}>
                Connected {new Date(meta.connectedAt).toLocaleDateString()}
              </p>
            )}
            <button onClick={() => disconnect('meta')} disabled={saving}
              className={`text-sm ${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
