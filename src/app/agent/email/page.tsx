'use client';

// src/app/agent/email/page.tsx
// Agent Email Inbox Page
// Shows inbox only if the agent has connected their own email account.
// Otherwise shows a setup prompt to connect their email.

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import EmailInbox from '@/app/components/crm/EmailInbox';
import AgentNav from '@/app/components/AgentNav';
import { Mail, Plus, Shield } from 'lucide-react';

export default function AgentEmailPage() {
  const { data: session } = useSession();
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary, textMuted, cardBg, border } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [hasEmailConnected, setHasEmailConnected] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if the current user has their own email account connected
  useEffect(() => {
    if (!session?.user?.email) return;

    const user = session.user as any;
    setIsAdmin(!!user.isAdmin);

    // For now, only the platform owner (admin) has email connected.
    // Other agents need to connect their own email account.
    // TODO: Check user.agentProfile.emailConnected or similar field
    if (user.isAdmin && !user.impersonatedBy) {
      setHasEmailConnected(true);
    } else {
      setHasEmailConnected(false);
    }
  }, [session]);

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
                  Connect Your Email
                </h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>
                  Link your email account to manage communications directly from your ChatRealty dashboard.
                  Your emails are private and only visible to you.
                </p>

                <div className={`p-4 rounded-xl mb-6 text-left space-y-3 ${
                  isLight ? 'bg-gray-50' : 'bg-white/5'
                }`}>
                  <p className={`text-xs font-medium ${textSecondary}`}>Supported providers:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Gmail', 'Outlook', 'Yahoo Mail', 'IMAP/SMTP'].map((provider) => (
                      <div key={provider} className={`flex items-center gap-2 text-sm ${textPrimary}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-blue-400' : 'bg-blue-500'}`} />
                        {provider}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  onClick={() => {
                    // TODO: Implement email OAuth connection flow
                    // For now, redirect to settings
                    window.location.href = '/agent/settings';
                  }}
                >
                  <Plus size={16} />
                  Connect Email Account
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
