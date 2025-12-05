'use client';

import { useState } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { Phone, Mail, Send, Settings } from 'lucide-react';
import DropCowboyCampaign from '@/app/components/crm/DropCowboyCampaign';
import EmailInbox from '@/app/components/crm/EmailInbox';
import EmailComposer from '@/app/components/crm/EmailComposer';
import CRMSettings from '@/app/components/crm/CRMSettings';

export default function CRMPage() {
  const { currentTheme } = useTheme();
  const { border } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';
  const [activeTab, setActiveTab] = useState<'voicemail' | 'inbox' | 'compose'>('voicemail');
  const [showSettings, setShowSettings] = useState(false);

  const tabs = [
    { id: 'voicemail' as const, label: 'Voicemail Campaign', icon: Phone },
    { id: 'inbox' as const, label: 'Email Inbox', icon: Mail },
    { id: 'compose' as const, label: 'Compose Email', icon: Send },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              CRM Dashboard
            </h1>
            <p className={isLight ? 'text-slate-600' : 'text-gray-400'}>
              Manage voicemail campaigns and email communications
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className={`p-3 rounded-lg transition-all ${
              isLight
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            title="CRM Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <nav className="mb-8">
          <div className={`flex items-center gap-2 border-b ${border}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                    active
                      ? isLight
                        ? 'border-blue-600 text-blue-600 font-semibold'
                        : 'border-emerald-500 text-emerald-400 font-semibold'
                      : `border-transparent ${
                          isLight
                            ? 'text-slate-600 hover:text-gray-900 hover:border-gray-300'
                            : 'text-gray-400 hover:text-white hover:border-gray-700'
                        }`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'voicemail' && <DropCowboyCampaign isLight={isLight} />}
          {activeTab === 'inbox' && <EmailInbox isLight={isLight} />}
          {activeTab === 'compose' && <EmailComposer isLight={isLight} />}
        </div>

        {/* CRM Settings Panel */}
        {showSettings && (
          <CRMSettings
            isLight={isLight}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}
