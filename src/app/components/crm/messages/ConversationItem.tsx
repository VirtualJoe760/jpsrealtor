/**
 * Conversation Item Component
 * Displays a single conversation in the list
 */

'use client';

import { Conversation } from '@/app/agent/messages/types';
import { User, AlertCircle } from 'lucide-react';
import { formatTime } from '@/app/agent/messages/utils/messageUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  isLight: boolean;
  border: string;
  textPrimary: string;
  textSecondary: string;
}

export default function ConversationItem({
  conversation,
  isSelected,
  onClick,
  isLight,
  border,
  textPrimary,
  textSecondary
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b ${border} transition-colors ${
        isSelected
          ? isLight
            ? 'bg-blue-50'
            : 'bg-blue-900/20'
          : isLight
          ? 'hover:bg-gray-50'
          : 'hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          conversation.contactInfo?.smsOptIn
            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
            : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
        }`}>
          <User className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`font-semibold ${textPrimary} truncate`}>
              {conversation.contactName || conversation.phoneNumber}
            </p>
            <span className={`text-xs ${textSecondary} ml-2`}>
              {formatTime(conversation.lastMessage.createdAt)}
            </span>
          </div>

          <p className={`text-sm ${textSecondary} truncate`}>
            {conversation.lastMessage.direction === 'outbound' && 'You: '}
            {conversation.lastMessage.body}
          </p>

          {/* Opt-in status */}
          {!conversation.contactInfo?.smsOptIn && conversation.contactName && (
            <span className={`inline-flex items-center gap-1 mt-1 text-xs ${
              isLight ? 'text-amber-600' : 'text-amber-400'
            }`}>
              <AlertCircle className="w-3 h-3" />
              No opt-in
            </span>
          )}
        </div>

        {/* Unread badge */}
        {conversation.unreadCount > 0 && (
          <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${
            isLight ? 'bg-blue-600' : 'bg-emerald-600'
          }`}>
            {conversation.unreadCount}
          </div>
        )}
      </div>
    </button>
  );
}
