'use client';

// src/app/agent/contacts/page.tsx
// Agent Contacts Page - standalone page for managing contacts
// All contact data automatically filtered by userId

import { useState } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import ContactsTab from '@/app/components/crm/ContactsTab';
import AgentNav from '@/app/components/AgentNav';

export default function AgentContactsPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [showToolbar, setShowToolbar] = useState(true);

  return (
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col md:p-4 md:p-8" data-page="contacts">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-x-hidden pt-16 md:pt-0">
        {/* Agent Navigation - Fixed */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header - Fixed with gear icon - Wrapped with padding */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-4 sm:mb-6 flex-shrink-0 flex items-start justify-between">
            <div>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Contacts
              </h1>
              <p className={`text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Manage your contact database
              </p>
            </div>

            {/* Toolbar Toggle Button */}
            <button
              onClick={() => setShowToolbar(!showToolbar)}
              className={`p-2 transition-all ${
                isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'
              }`}
              title={showToolbar ? 'Hide filters' : 'Show filters'}
            >
              {!showToolbar ? (
                <svg
                  className="w-6 h-6 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 transition-transform duration-300 animate-spin-once"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Contacts Component - Takes remaining height, handles scrolling internally */}
        <div className="flex-1 overflow-hidden">
          <ContactsTab isLight={isLight} showToolbar={showToolbar} />
        </div>
      </div>
    </div>
  );
}
