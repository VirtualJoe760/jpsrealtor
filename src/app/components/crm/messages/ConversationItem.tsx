/**
 * Conversation Item Component
 * Displays a single conversation in the list with swipe-to-delete
 */

'use client';

import { useRef, useState } from 'react';
import { Conversation } from '@/app/agent/messages/types';
import { User, AlertCircle, Trash2 } from 'lucide-react';
import { formatTime } from '@/app/agent/messages/utils/messageUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (phoneNumber: string) => void;
  isLight: boolean;
  border: string;
  textPrimary: string;
  textSecondary: string;
}

const THRESHOLD = 80;

export default function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onDelete,
  isLight,
  border,
  textPrimary,
  textSecondary
}: ConversationItemProps) {
  const startX = useRef(0);
  const isDragging = useRef(false);
  const [offsetX, setOffsetX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    // Only allow left swipe (negative diff)
    if (diff < 0) {
      setOffsetX(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (offsetX < -THRESHOLD) {
      // Snap open
      setOffsetX(-THRESHOLD);
    } else {
      // Snap closed
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete button behind */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={() => onDelete(conversation.phoneNumber)}
          className="h-full px-6 bg-red-600 text-white flex items-center justify-center"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable content */}
      <button
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
        }}
        className={`w-full text-left p-4 border-b ${border} transition-colors relative z-10 ${
          isSelected
            ? isLight
              ? 'bg-blue-50'
              : 'bg-blue-900/20'
            : isLight
            ? 'hover:bg-gray-50 bg-white'
            : 'hover:bg-gray-700/50 bg-gray-900'
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
    </div>
  );
}
