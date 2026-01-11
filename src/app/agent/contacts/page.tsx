'use client';

// src/app/agent/contacts/page.tsx
// Agent Contacts Page - standalone page for managing contacts
// All contact data automatically filtered by userId

import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import ContactsTab from '@/app/components/crm/ContactsTab';
import AgentNav from '@/app/components/AgentNav';

export default function AgentContactsPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Agent Navigation */}
        <AgentNav />

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Contacts
          </h1>
          <p className={`text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            Manage your contact database
          </p>
        </div>

        {/* Contacts Component */}
        <div className="mt-6">
          <ContactsTab isLight={isLight} />
        </div>
      </div>
    </div>
  );
}
