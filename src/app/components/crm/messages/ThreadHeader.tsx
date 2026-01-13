/**
 * Thread Header - Contact info and actions
 */

'use client';

import { Conversation } from '@/app/agent/messages/types';
import { ChevronLeft, User, Phone, CheckCircle, XCircle, Edit } from 'lucide-react';

interface ThreadHeaderProps {
  conversation: Conversation;
  onBack: () => void;
  onSendOptIn: () => void;
  onEditContact: () => void;
  sending: boolean;
  isLight: boolean;
  border: string;
  textPrimary: string;
  textSecondary: string;
}

export default function ThreadHeader({
  conversation,
  onBack,
  onSendOptIn,
  onEditContact,
  sending,
  isLight,
  border,
  textPrimary,
  textSecondary
}: ThreadHeaderProps) {
  return (
    <div className={`p-3 md:p-4 md:border-b md:${border} md:${
      isLight ? 'md:bg-gray-50' : 'md:bg-gray-900/50'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back Button - Mobile Only */}
          <button
            onClick={onBack}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              isLight
                ? 'hover:bg-gray-200 text-gray-600'
                : 'hover:bg-gray-700 text-gray-400'
            }`}
            aria-label="Back to conversations"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            conversation.contactInfo?.smsOptIn
              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
              : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
          }`}>
            <User className="w-5 h-5 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-base md:text-lg truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {conversation.contactName || 'Unknown Contact'}
              </h3>
              <button
                onClick={onEditContact}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLight
                    ? 'hover:bg-gray-200 text-gray-600'
                    : 'hover:bg-gray-700 text-gray-400'
                }`}
                title="Edit contact"
              >
                <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
            <div className={`flex items-center gap-2 text-xs md:text-sm ${
              isLight ? 'text-slate-600' : 'text-gray-300'
            }`}>
              <Phone className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
              <span className="truncate">{conversation.phoneNumber}</span>
              {conversation.contactInfo?.smsOptIn ? (
                <CheckCircle className={`w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0 ${
                  isLight ? 'text-green-600' : 'text-green-400'
                }`} />
              ) : (
                <XCircle className={`w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0 ${
                  isLight ? 'text-amber-600' : 'text-amber-400'
                }`} />
              )}
            </div>
          </div>
        </div>

        {!conversation.contactInfo?.smsOptIn && (
          <button
            onClick={onSendOptIn}
            disabled={sending}
            className="px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0 font-medium"
          >
            <span className="hidden sm:inline">Send Opt-in</span>
            <span className="sm:hidden">Opt-in</span>
          </button>
        )}
      </div>
    </div>
  );
}
