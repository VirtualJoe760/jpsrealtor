/**
 * Message Bubble Component
 * Displays an individual SMS message with status indicators
 */

'use client';

import { SMSMessage } from '@/app/agent/messages/types';
import { Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';

interface MessageBubbleProps {
  message: SMSMessage;
  isLight: boolean;
}

export default function MessageBubble({ message, isLight }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${isOutbound ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block px-3 py-2 md:px-4 md:py-3 ${
          isOutbound
            ? 'rounded-[20px] rounded-tr-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
            : 'rounded-[20px] rounded-tl-sm bg-gray-800 text-white'
        }`}>
          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
            {message.body}
          </p>
        </div>

        <div className={`flex items-center gap-1 mt-1 px-1 text-[10px] md:text-[11px] text-gray-500 ${
          isOutbound ? 'justify-end' : 'justify-start'
        }`}>
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOutbound && (
            <>
              {message.status === 'delivered' ? (
                <CheckCheck className="w-3 h-3 text-emerald-500" />
              ) : message.status === 'sent' ? (
                <Check className="w-3 h-3" />
              ) : message.status === 'failed' ? (
                <AlertCircle className="w-3 h-3 text-red-500" />
              ) : message.status === 'sending' ? (
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
