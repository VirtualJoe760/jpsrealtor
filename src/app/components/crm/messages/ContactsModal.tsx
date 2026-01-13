/**
 * Contacts Modal Component
 * Full modal for selecting contacts to message
 */

'use client';

import { Contact } from '@/app/agent/messages/types';
import { Search, X, Users, User } from 'lucide-react';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectContact: (contact: Contact) => void;
}

export default function ContactsModal({
  isOpen,
  onClose,
  contacts,
  searchQuery,
  onSearchChange,
  onSelectContact
}: ContactsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Contact
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {contacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <button
                  key={contact._id}
                  onClick={() => {
                    onSelectContact(contact);
                    onClose();
                  }}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      contact.preferences?.smsOptIn
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        {contact.phone}
                        {contact.preferences?.smsOptIn ? (
                          <span className="text-xs text-green-600 dark:text-green-400">✓ Opted in</span>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">⚠ No opt-in</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
