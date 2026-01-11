// src/app/components/crm/MessagingTab.tsx
'use client';

import { MessageSquare, Smartphone } from 'lucide-react';

interface MessagingTabProps {
  isLight: boolean;
}

export default function MessagingTab({ isLight }: MessagingTabProps) {
  return (
    <div className="space-y-6">
      {/* Coming Soon Message */}
      <div className={`rounded-xl p-12 text-center border ${
        isLight
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
          : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
      }`}>
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
          isLight ? 'bg-blue-100' : 'bg-blue-900/30'
        }`}>
          <MessageSquare className={`w-10 h-10 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        </div>

        <h2 className={`text-3xl font-bold mb-4 ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          SMS Messaging
        </h2>

        <p className={`text-lg mb-8 max-w-2xl mx-auto ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          Send SMS messages to your contacts and manage two-factor authentication via text message.
        </p>

        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg ${
          isLight
            ? 'bg-blue-100 text-blue-700'
            : 'bg-blue-900/30 text-blue-400'
        }`}>
          <Smartphone className="w-5 h-5" />
          <span className="font-semibold">Coming Soon</span>
        </div>

        <div className={`mt-8 pt-8 border-t max-w-2xl mx-auto ${
          isLight ? 'border-blue-200' : 'border-gray-700'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            Planned Features:
          </h3>
          <ul className={`text-left space-y-2 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <li className="flex items-start gap-2">
              <span className={isLight ? 'text-blue-600' : 'text-blue-400'}>•</span>
              <span>Send SMS messages to individual contacts or groups</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={isLight ? 'text-blue-600' : 'text-blue-400'}>•</span>
              <span>SMS-based two-factor authentication for enhanced security</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={isLight ? 'text-blue-600' : 'text-blue-400'}>•</span>
              <span>Message templates and scheduling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={isLight ? 'text-blue-600' : 'text-blue-400'}>•</span>
              <span>SMS conversation history and analytics</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
