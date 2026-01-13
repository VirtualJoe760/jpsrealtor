/**
 * New Conversation Input with Contact Autocomplete
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, User } from 'lucide-react';
import { Contact } from '@/app/agent/messages/types';

interface NewConversationInputProps {
  isOpen: boolean;
  onToggle: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  isLight: boolean;
  border: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export default function NewConversationInput({
  isOpen,
  onToggle,
  query,
  onQueryChange,
  contacts,
  onSelectContact,
  isLight,
  border,
  cardBg,
  textPrimary,
  textSecondary
}: NewConversationInputProps) {
  // Filter contacts by name or phone
  const filteredContacts = contacts.filter(contact => {
    const q = query.toLowerCase().replace(/\D/g, ''); // Remove non-digits for phone comparison
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const phoneDigits = contact.phone.replace(/\D/g, '');
    return fullName.includes(query.toLowerCase()) || phoneDigits.includes(q);
  }).slice(0, 5);

  // Check if query looks like a phone number (10+ digits)
  const queryDigits = query.replace(/\D/g, '');
  const isPhoneNumber = queryDigits.length >= 10;
  const matchesExisting = filteredContacts.some(c => c.phone.replace(/\D/g, '') === queryDigits);

  return (
    <>
      <button
        onClick={onToggle}
        className={`p-2 rounded-lg transition-colors ${
          isLight
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
        title="New conversation"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Enter phone number or contact name..."
                className={`w-full px-3 py-2 rounded-lg border ${border} ${cardBg} ${textPrimary} placeholder-gray-500 text-sm focus:ring-2 ${
                  isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                }`}
                autoFocus
              />
              {query.trim() && (
                <div className={`mt-2 max-h-48 overflow-y-auto rounded-lg border ${border} ${cardBg}`}>
                  {/* Show existing contacts */}
                  {filteredContacts.map(contact => (
                    <button
                      key={contact._id}
                      onClick={() => onSelectContact(contact)}
                      className={`w-full text-left p-3 border-b ${border} last:border-b-0 transition-colors ${
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

                  {/* Show option to message a new phone number */}
                  {isPhoneNumber && !matchesExisting && (
                    <button
                      onClick={() => onSelectContact({
                        _id: '',
                        firstName: 'Unknown',
                        lastName: 'Contact',
                        phone: queryDigits.length === 10 ? `+1${queryDigits}` : `+${queryDigits}`,
                        preferences: { smsOptIn: false }
                      })}
                      className={`w-full text-left p-3 border-b ${border} last:border-b-0 transition-colors ${
                        isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                          <MessageCircle className="w-4 h-4" />
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

                  {/* No results */}
                  {filteredContacts.length === 0 && !isPhoneNumber && (
                    <div className={`p-3 text-center text-sm ${textSecondary}`}>
                      No contacts found. Try entering a phone number.
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
