/**
 * Compose View - New message composition interface
 */

'use client';

import { useState } from 'react';
import { X, User, Search } from 'lucide-react';
import { Contact } from '@/app/agent/messages/types';
import MessageInput from './MessageInput';

interface ComposeViewProps {
  contacts: Contact[];
  onBack: () => void;
  onSendMessage: (recipients: Contact[], message: string) => Promise<void>;
  isLight: boolean;
  border: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export default function ComposeView({
  contacts,
  onBack,
  onSendMessage,
  isLight,
  border,
  cardBg,
  textPrimary,
  textSecondary
}: ComposeViewProps) {
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState(false);

  // Filter contacts based on query
  const queryDigits = recipientQuery.replace(/\D/g, '');
  const filteredContacts = contacts.filter(contact => {
    const q = recipientQuery.toLowerCase();
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const phoneDigits = contact.phone.replace(/\D/g, '');

    // Don't show already selected contacts
    if (selectedRecipients.some(r => r._id === contact._id)) return false;

    return fullName.includes(q) || phoneDigits.includes(queryDigits);
  }).slice(0, 8);

  // Check if query is a valid phone number
  const isPhoneNumber = queryDigits.length >= 10;
  const matchesExisting = filteredContacts.some(c => c.phone.replace(/\D/g, '') === queryDigits);

  const handleAddRecipient = (contact: Contact) => {
    setSelectedRecipients([...selectedRecipients, contact]);
    setRecipientQuery('');
    setShowSuggestions(false);
  };

  const handleAddPhoneNumber = () => {
    const newContact: Contact = {
      _id: `temp-${Date.now()}`,
      firstName: 'Unknown',
      lastName: 'Contact',
      phone: queryDigits.length === 10 ? `+1${queryDigits}` : `+${queryDigits}`,
      preferences: { smsOptIn: false }
    };
    handleAddRecipient(newContact);
  };

  const handleRemoveRecipient = (contactId: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r._id !== contactId));
  };

  const handleSend = async (message: string) => {
    if (selectedRecipients.length === 0 || !message.trim()) return false;

    setSending(true);
    try {
      await onSendMessage(selectedRecipients, message);
      return true;
    } catch (error) {
      console.error('[ComposeView] Error sending:', error);
      return false;
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`fixed inset-0 pt-16 md:col-span-7 md:static md:pt-0 md:${cardBg} md:rounded-xl md:border md:${border} md:shadow-lg flex flex-col overflow-hidden h-full bg-transparent`}>
      {/* Header - Similar to ThreadHeader */}
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
            >
              <X className="w-5 h-5" />
            </button>

            {/* Avatar/Icon */}
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <User className="w-5 h-5 md:w-5 md:h-5" />
            </div>

            {/* Recipients Input Area */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5 items-center">
                {/* Show "To:" label only when no recipients */}
                {selectedRecipients.length === 0 && (
                  <span className={`text-xs font-medium ${textSecondary}`}>To:</span>
                )}

                {/* Selected Recipients as chips */}
                {selectedRecipients.map(recipient => (
                  <div
                    key={recipient._id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                      isLight
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-blue-900/30 text-blue-300'
                    }`}
                  >
                    <span className="font-medium">
                      {recipient.firstName} {recipient.lastName}
                    </span>
                    <button
                      onClick={() => handleRemoveRecipient(recipient._id)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Input for typing */}
                <input
                  type="text"
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={selectedRecipients.length === 0 ? "Type name or number..." : "Add more..."}
                  className={`flex-1 min-w-[120px] bg-transparent outline-none text-base md:text-lg font-bold ${
                    isLight ? 'text-slate-900' : 'text-white'
                  } placeholder-gray-500`}
                  autoFocus
                />
              </div>

              {/* Phone Number Display (when typing) */}
              {recipientQuery && isPhoneNumber && (
                <div className={`flex items-center gap-2 text-xs md:text-sm mt-1 ${
                  isLight ? 'text-slate-600' : 'text-gray-300'
                }`}>
                  <span className="truncate">
                    {queryDigits.length === 10 ? `+1 ${queryDigits}` : `+${queryDigits}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions Dropdown - Below Header */}
        {showSuggestions && recipientQuery.trim() && (
          <div className={`mt-3 max-h-48 overflow-y-auto rounded-lg border ${border} ${
            isLight ? 'bg-white' : 'bg-gray-800'
          } shadow-lg`}>
            {/* Existing Contacts */}
            {filteredContacts.map(contact => (
              <button
                key={contact._id}
                onClick={() => handleAddRecipient(contact)}
                className={`w-full text-left p-2.5 border-b ${border} last:border-b-0 transition-colors ${
                  isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    contact.preferences?.smsOptIn
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                      : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${textPrimary}`}>
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className={`text-xs ${textSecondary}`}>{contact.phone}</p>
                  </div>
                </div>
              </button>
            ))}

            {/* New Phone Number Option */}
            {isPhoneNumber && !matchesExisting && (
              <button
                onClick={handleAddPhoneNumber}
                className={`w-full text-left p-2.5 transition-colors ${
                  isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${textPrimary}`}>
                      Message this number
                    </p>
                    <p className={`text-xs ${textSecondary}`}>
                      {queryDigits.length === 10 ? `+1 ${queryDigits}` : `+${queryDigits}`}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* No Results */}
            {filteredContacts.length === 0 && !isPhoneNumber && (
              <div className={`p-3 text-center text-sm ${textSecondary}`}>
                No contacts found. Try entering a phone number.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-3 md:p-4 flex items-center justify-center ${textSecondary}`}>
          {selectedRecipients.length === 0 ? (
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a contact or enter a phone number to get started</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex flex-wrap gap-2 justify-center mb-3">
                {selectedRecipients.map(recipient => (
                  <div
                    key={recipient._id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      recipient.preferences?.smsOptIn
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                ))}
              </div>
              <p className="text-sm">
                {selectedRecipients.length === 1
                  ? `Compose message to ${selectedRecipients[0].firstName} ${selectedRecipients[0].lastName}`
                  : `Compose message to ${selectedRecipients.length} contacts`
                }
              </p>
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedRecipients.length > 0 && (
          <MessageInput
            onSend={handleSend}
            sending={sending}
            isLight={isLight}
            border={border}
            cardBg={cardBg}
            textPrimary={textPrimary}
          />
        )}
      </div>
    </div>
  );
}
