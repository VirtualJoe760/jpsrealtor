'use client';

// src/app/agent/email/page.tsx
// Agent Email Inbox Page
// Shows inbox only if the agent has connected their own email account.
// Otherwise shows a setup prompt to connect their email.

import { useState, useEffect } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import EmailInbox from '@/app/components/crm/EmailInbox';
import AgentNav from '@/app/components/AgentNav';
import { Mail, Plus, Shield } from 'lucide-react';

export default function AgentEmailPage() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary, textMuted, cardBg, border } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [hasEmailConnected, setHasEmailConnected] = useState<boolean | null>(null);

  // Gate on the agent's email-sending config: a verified Resend domain, or the
  // primary/platform agent on the shared sender (canEmail from /api/agent/email).
  useEffect(() => {
    fetch('/api/agent/email')
      .then((r) => r.json())
      .then((d) => setHasEmailConnected(d?.email?.canEmail === true))
      .catch(() => setHasEmailConnected(false));
  }, []);

  return (
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col md:p-4 md:p-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0 min-h-0">
        {/* Agent Navigation */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header */}
        <div className="mb-4 sm:mb-6 px-4 md:px-0 flex-shrink-0">
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Email Inbox
          </h1>
          <p className={`text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            Manage your email communications
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {hasEmailConnected === null ? (
            // Loading
            <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : hasEmailConnected ? (
            // Connected — show inbox
            <EmailInbox isLight={isLight} />
          ) : (
            // Not connected — show setup prompt
            <div className="flex items-center justify-center h-full px-4">
              <div className={`max-w-lg w-full ${cardBg} border ${border} rounded-2xl p-8 text-center`}>
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 ${
                  isLight ? 'bg-blue-100' : 'bg-blue-900/20'
                }`}>
                  <Mail className={`w-8 h-8 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>

                <h2 className={`text-xl font-semibold mb-3 ${textPrimary}`}>
                  Set up email sending
                </h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>
                  Verify your own sending domain to email leads and clients from your ChatRealty
                  dashboard — better deliverability than a shared address. Set it up in Settings.
                </p>

                <button
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  onClick={() => { window.location.href = '/agent/settings'; }}
                >
                  <Plus size={16} />
                  Set up email
                </button>

                <div className={`flex items-center justify-center gap-1.5 mt-4 ${textMuted}`}>
                  <Shield size={12} />
                  <p className="text-xs">Your email data is encrypted and never shared</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
