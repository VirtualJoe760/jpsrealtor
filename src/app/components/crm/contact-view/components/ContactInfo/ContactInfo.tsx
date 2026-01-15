// ContactInfo - Display and edit phone, email, address information
import React from 'react';
import { Contact, ContactPhone, ContactEmail } from '../../types/index';
import { formatPhoneDisplay, formatAddress } from '../../utils/index';
import { PHONE_LABELS, EMAIL_LABELS } from '../../constants/index';

interface ContactInfoProps {
  contact: Contact;
  isEditing: boolean;
  editedPhones: ContactPhone[];
  editedEmails: ContactEmail[];
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAddPhone: () => void;
  onAddEmail: () => void;
  onRemovePhone: (index: number) => void;
  onRemoveEmail: (index: number) => void;
  onPhoneChange: (index: number, field: keyof ContactPhone, value: any) => void;
  onEmailChange: (index: number, field: keyof ContactEmail, value: any) => void;
}

export function ContactInfo({
  contact,
  isEditing,
  editedPhones,
  editedEmails,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAddPhone,
  onAddEmail,
  onRemovePhone,
  onRemoveEmail,
  onPhoneChange,
  onEmailChange,
}: ContactInfoProps) {
  const address = formatAddress(contact.address);

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Phones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Numbers
            </label>
            <button
              onClick={onAddPhone}
              className="text-xs text-blue-600 hover:text-blue-700"
              type="button"
            >
              + Add Phone
            </button>
          </div>
          {editedPhones.map((phone, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="tel"
                value={phone.number}
                onChange={(e) => onPhoneChange(idx, 'number', e.target.value)}
                placeholder="Phone number"
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              <select
                value={phone.label}
                onChange={(e) => onPhoneChange(idx, 'label', e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {PHONE_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onRemovePhone(idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Emails */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Addresses
            </label>
            <button
              onClick={onAddEmail}
              className="text-xs text-blue-600 hover:text-blue-700"
              type="button"
            >
              + Add Email
            </button>
          </div>
          {editedEmails.map((email, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="email"
                value={email.address}
                onChange={(e) => onEmailChange(idx, 'address', e.target.value)}
                placeholder="Email address"
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              <select
                value={email.label}
                onChange={(e) => onEmailChange(idx, 'label', e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {EMAIL_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onRemoveEmail(idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onSaveEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            type="button"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Phone */}
      {contact.phone && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">📞</span>
          <span className="text-gray-900 dark:text-white">
            {formatPhoneDisplay(contact.phone)}
          </span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">✉️</span>
          <span className="text-gray-900 dark:text-white">{contact.email}</span>
        </div>
      )}

      {/* Address */}
      {address && (
        <div className="flex items-start gap-2">
          <span className="text-gray-500 dark:text-gray-400">📍</span>
          <span className="text-gray-900 dark:text-white">{address}</span>
        </div>
      )}

      {/* Edit Button */}
      <button
        onClick={onStartEdit}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        type="button"
      >
        Edit Contact Info
      </button>
    </div>
  );
}
