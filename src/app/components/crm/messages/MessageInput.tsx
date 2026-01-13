/**
 * Message Input Component
 * Input form for sending SMS messages
 */

'use client';

import { useState, FormEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => Promise<boolean>;
  sending: boolean;
  isLight: boolean;
  border: string;
  cardBg: string;
  textPrimary: string;
}

export default function MessageInput({
  onSend,
  sending,
  isLight,
  border,
  cardBg,
  textPrimary
}: MessageInputProps) {
  const [messageBody, setMessageBody] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || sending) return;

    const success = await onSend(messageBody);
    if (success) {
      setMessageBody('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-3 md:p-4 pb-24 md:pb-4 md:border-t md:${border} md:${cardBg} md:bg-transparent`}>
      <div className="flex items-end gap-2 md:gap-3">
        <div className="flex-1 relative">
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your message..."
            rows={1}
            className={`w-full px-4 py-3 rounded-[20px] border ${
              isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-800'
            } ${
              isLight ? 'text-slate-900' : 'text-white'
            } placeholder-gray-500 resize-none focus:outline-none focus:ring-0 text-sm md:text-base max-h-32 shadow-none`}
            style={{ minHeight: '44px', boxShadow: 'none' }}
          />
          <div className="absolute bottom-2 right-2 text-[9px] text-gray-500">
            {messageBody.length > 0 && (
              <span>
                {messageBody.length}/160
                {messageBody.length > 160 && ` (${Math.ceil(messageBody.length / 160)})`}
              </span>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={sending || !messageBody.trim()}
          className={`w-11 h-11 md:w-12 md:h-12 flex-shrink-0 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center md:shadow-lg ${
            isLight
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          } ${!messageBody.trim() && 'opacity-50'}`}
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}
