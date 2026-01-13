'use client';

// src/app/agent/email/page.tsx
// Agent Email Inbox Page - standalone page for managing emails
// All email data automatically filtered by userId

import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import EmailInbox from '@/app/components/crm/EmailInbox';
import AgentNav from '@/app/components/AgentNav';

export default function AgentEmailPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col md:p-4 md:p-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0">
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

        {/* Email Inbox Component - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <EmailInbox isLight={isLight} />
        </div>
      </div>
    </div>
  );
}
