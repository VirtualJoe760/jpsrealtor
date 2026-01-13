/**
 * Conversation List Component
 * Left panel showing all conversations with search
 */

'use client';

import { Conversation, Contact, MobileView } from '@/app/agent/messages/types';
import { Search, MessageSquare, MessageCircle } from 'lucide-react';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conv: Conversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  contacts: Contact[];
  onNewConversation: () => void;
  mobileView: MobileView;
  isLight: boolean;
  border: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  contacts,
  onNewConversation,
  mobileView,
  isLight,
  border,
  cardBg,
  textPrimary,
  textSecondary
}: ConversationListProps) {

  return (
    <div className={`md:col-span-5 flex flex-col h-full ${
      mobileView === 'list' ? 'flex' : 'hidden md:flex'
    }`}>
      {/* Search and New Conversation - Fixed */}
      <div className="p-4 pb-3 flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className={`w-full pl-10 pr-3 py-2.5 rounded-lg ${
                isLight
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gray-800/50 text-white'
              } placeholder-gray-500 text-sm focus:outline-none focus:ring-2 ${
                isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
              }`}
            />
          </div>
          <button
            onClick={onNewConversation}
            className={`p-2 rounded-lg transition-colors ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
            title="New conversation"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversations - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {conversations.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${textSecondary} px-4`}>
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm text-center">No conversations yet</p>
            <p className="text-xs text-center mt-1">Click the message icon to start</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.phoneNumber}
              conversation={conv}
              isSelected={selectedConversation?.phoneNumber === conv.phoneNumber}
              onClick={() => onSelectConversation(conv)}
              isLight={isLight}
              border={border}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          ))
        )}
      </div>
    </div>
  );
}
