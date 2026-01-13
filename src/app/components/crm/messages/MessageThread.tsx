/**
 * Message Thread Component
 * Right panel showing messages and input
 */

'use client';

import { useRef, useEffect } from 'react';
import { Conversation, SMSMessage, MobileView } from '@/app/agent/messages/types';
import { MessageSquare } from 'lucide-react';
import ThreadHeader from './ThreadHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

interface MessageThreadProps {
  conversation: Conversation | null;
  messages: SMSMessage[];
  loading: boolean;
  syncing: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<boolean>;
  onSendOptIn: () => void;
  onEditContact: () => void;
  onBack: () => void;
  mobileView: MobileView;
  isLight: boolean;
  border: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export default function MessageThread({
  conversation,
  messages,
  loading,
  syncing,
  sending,
  onSendMessage,
  onSendOptIn,
  onEditContact,
  onBack,
  mobileView,
  isLight,
  border,
  cardBg,
  textPrimary,
  textSecondary
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className={`md:col-span-7 md:${cardBg} md:rounded-xl md:border ${border} md:shadow-lg flex flex-col overflow-hidden h-full ${
        mobileView === 'thread' ? 'block' : 'hidden md:flex'
      }`}>
        <div className={`flex-1 flex items-center justify-center ${textSecondary}`}>
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className={`text-lg font-medium ${textPrimary}`}>Select a conversation</p>
            <p className="text-sm mt-1">Choose a conversation from the list or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      ${mobileView === 'thread' ? 'fixed inset-0 pt-16 bg-transparent' : 'hidden'}
      md:col-span-7 md:static md:pt-0 md:${cardBg} md:rounded-xl md:border md:${border} md:shadow-lg
      flex flex-col overflow-hidden h-full md:flex
    `}>
      {/* Header */}
      <ThreadHeader
        conversation={conversation}
        onBack={onBack}
        onSendOptIn={onSendOptIn}
        onEditContact={onEditContact}
        sending={sending}
        isLight={isLight}
        border={border}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-full ${textSecondary}`}>
            <div className={`w-8 h-8 border-3 rounded-full animate-spin mb-3 ${
              isLight
                ? 'border-blue-500/30 border-t-blue-500'
                : 'border-emerald-500/30 border-t-emerald-500'
            }`}></div>
            <p className="font-medium">{syncing ? 'Syncing from Twilio...' : 'Loading...'}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${textSecondary}`}>
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm mt-1">Send your first message below</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4 pb-4">
            {messages.map((message) => (
              <MessageBubble
                key={message._id}
                message={message}
                isLight={isLight}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - Fixed at bottom on mobile */}
      <MessageInput
        onSend={onSendMessage}
        sending={sending}
        isLight={isLight}
        border={border}
        cardBg={cardBg}
        textPrimary={textPrimary}
      />
    </div>
  );
}
