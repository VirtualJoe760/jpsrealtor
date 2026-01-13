/**
 * Contact Edit Modal - Edit contact info from messages
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Tag } from 'lucide-react';
import { Conversation } from '@/app/agent/messages/types';

interface ContactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onSave: (updatedContact: any) => void;
  isLight: boolean;
}

export default function ContactEditModal({
  isOpen,
  onClose,
  conversation,
  onSave,
  isLight
}: ContactEditModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (isOpen && conversation.contactInfo) {
      setFirstName(conversation.contactInfo.firstName || '');
      setLastName(conversation.contactInfo.lastName || '');
      setEmail(conversation.contactInfo.email || '');
    } else if (isOpen) {
      // New contact - clear form
      setFirstName('');
      setLastName('');
      setEmail('');
    }
  }, [isOpen, conversation]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const contactData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: conversation.phoneNumber,
        email: email.trim() || undefined,
      };

      let response;
      if (conversation.contactId) {
        // Update existing contact
        response = await fetch(`/api/crm/contacts/${conversation.contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        });
      } else {
        // Create new contact
        response = await fetch('/api/crm/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        });
      }

      const data = await response.json();
      if (data.success) {
        onSave(data.contact);
        onClose();
      } else {
        alert('Failed to save contact: ' + data.error);
      }
    } catch (error) {
      console.error('[ContactEditModal] Error saving contact:', error);
      alert('Error saving contact');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`w-full max-w-md rounded-xl shadow-2xl pointer-events-auto ${
            isLight ? 'bg-white' : 'bg-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isLight ? 'border-gray-200' : 'border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isLight ? 'bg-blue-100' : 'bg-blue-900/30'
              }`}>
                <User className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {conversation.contactId ? 'Edit Contact' : 'Create Contact'}
                </h2>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {conversation.phoneNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isLight
                  ? 'hover:bg-gray-100 text-gray-600'
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            {/* First Name */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                    : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                    : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isLight ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                      : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Phone (Read-only) */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isLight ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="tel"
                  value={conversation.phoneNumber}
                  disabled
                  className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                    isLight
                      ? 'bg-gray-50 border-gray-300 text-gray-600'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400'
                  } cursor-not-allowed`}
                />
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                Phone number cannot be changed
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex gap-3 p-4 border-t ${
            isLight ? 'border-gray-200' : 'border-gray-700'
          }`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                isLight
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!firstName.trim() || !lastName.trim() || saving}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                !firstName.trim() || !lastName.trim() || saving
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
