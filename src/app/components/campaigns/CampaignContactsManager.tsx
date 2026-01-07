// app/components/campaigns/CampaignContactsManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import ContactSelector from './ContactSelector';

interface CampaignContact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  tags?: string[];
  status?: string;
  campaignStatus: string;
  addedAt: string;
}

interface CampaignContactsManagerProps {
  campaignId: string;
  onContactsChange?: () => void;
}

export default function CampaignContactsManager({ campaignId, onContactsChange }: CampaignContactsManagerProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, buttonPrimary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSelectedContacts, setModalSelectedContacts] = useState<string[]>([]);
  const [addingContacts, setAddingContacts] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Fetch campaign contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}/contacts`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Error fetching campaign contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [campaignId]);

  // Filter contacts by search query
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      contact.firstName.toLowerCase().includes(search) ||
      contact.lastName.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.phone.includes(search)
    );
  });

  const handleAddContacts = async (contactIds: string[]) => {
    try {
      setAddingContacts(true);
      const response = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        await fetchContacts();
        if (onContactsChange) onContactsChange();
      } else {
        alert(data.error || 'Failed to add contacts');
      }
    } catch (error) {
      console.error('Error adding contacts:', error);
      alert('An error occurred while adding contacts');
    } finally {
      setAddingContacts(false);
    }
  };

  const handleRemoveContacts = async () => {
    if (selectedContactIds.length === 0) return;

    if (!confirm(`Remove ${selectedContactIds.length} contact(s) from this campaign?`)) {
      return;
    }

    try {
      setRemoving(true);
      const response = await fetch(
        `/api/campaigns/${campaignId}/contacts?contactIds=${selectedContactIds.join(',')}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (data.success) {
        setSelectedContactIds([]);
        await fetchContacts();
        if (onContactsChange) onContactsChange();
      } else {
        alert(data.error || 'Failed to remove contacts');
      }
    } catch (error) {
      console.error('Error removing contacts:', error);
      alert('An error occurred while removing contacts');
    } finally {
      setRemoving(false);
    }
  };

  const toggleContact = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      setSelectedContactIds(selectedContactIds.filter((id) => id !== contactId));
    } else {
      setSelectedContactIds([...selectedContactIds, contactId]);
    }
  };

  const selectAll = () => {
    setSelectedContactIds(filteredContacts.map((c) => c._id));
  };

  const deselectAll = () => {
    setSelectedContactIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-1`}>
            Campaign Contacts
          </h3>
          <p className={textSecondary}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            {selectedContactIds.length > 0 && ` • ${selectedContactIds.length} selected`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedContactIds.length > 0 && (
            <button
              onClick={handleRemoveContacts}
              disabled={removing}
              className={`flex items-center gap-2 px-4 py-2 ${isLight ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'} text-white rounded-lg text-sm font-medium transition-colors ${removing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <TrashIcon className="w-4 h-4" />
              Remove ({selectedContactIds.length})
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-2 px-4 py-2 ${buttonPrimary} rounded-lg text-sm font-medium transition-colors`}
          >
            <PlusIcon className="w-4 h-4" />
            Add Contacts
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${
            isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
          } focus:border-transparent ${textPrimary}`}
        />
      </div>

      {/* Contact List */}
      <div className={`${cardBg} ${cardBorder} rounded-lg overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`w-12 h-12 border-4 ${isLight ? 'border-blue-600' : 'border-emerald-500'} border-t-transparent rounded-full animate-spin`}></div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
            <p className={`${textPrimary} font-medium mb-1`}>No contacts found</p>
            <p className={`${textSecondary} text-sm`}>
              {contacts.length === 0 ? 'Add contacts to get started' : 'Try adjusting your search'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            <div className="p-4 flex items-center gap-4">
              <button
                onClick={selectAll}
                className={`text-sm ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-emerald-500 hover:text-emerald-400'} font-medium`}
              >
                Select All
              </button>
              {selectedContactIds.length > 0 && (
                <button
                  onClick={deselectAll}
                  className={`text-sm ${textSecondary} hover:${textPrimary} font-medium`}
                >
                  Deselect All
                </button>
              )}
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredContacts.map((contact) => {
                const isSelected = selectedContactIds.includes(contact._id);

                return (
                  <div
                    key={contact._id}
                    onClick={() => toggleContact(contact._id)}
                    className={`flex items-center gap-4 p-4 border-b ${border} cursor-pointer transition-colors ${
                      isSelected
                        ? `${isLight ? 'bg-blue-50' : 'bg-emerald-900/10'}`
                        : `hover:${isLight ? 'bg-gray-50' : 'bg-slate-700/30'}`
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />

                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${textPrimary}`}>
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className={`text-sm ${textSecondary}`}>
                        {contact.email || contact.phone}
                      </div>
                    </div>

                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-slate-700 text-gray-300'} rounded text-xs`}
                          >
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 2 && (
                          <span className={`px-2 py-0.5 ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-slate-700 text-gray-300'} rounded text-xs`}>
                            +{contact.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        contact.campaignStatus === 'sent'
                          ? isLight
                            ? 'bg-green-100 text-green-700'
                            : 'bg-green-900/30 text-green-400'
                          : isLight
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {contact.campaignStatus}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Contacts Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${cardBg} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className={`text-xl font-bold ${textPrimary}`}>Add Contacts to Campaign</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`p-2 rounded-lg hover:${isLight ? 'bg-gray-100' : 'bg-slate-700'} transition-colors`}
                >
                  <XMarkIcon className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <ContactSelector
                  selectedContactIds={modalSelectedContacts}
                  onContactsChange={setModalSelectedContacts}
                  campaignId={campaignId}
                />
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setModalSelectedContacts([]);
                  }}
                  className={`px-4 py-2 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg font-medium transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (modalSelectedContacts.length > 0) {
                      handleAddContacts(modalSelectedContacts);
                      setModalSelectedContacts([]);
                    }
                  }}
                  disabled={addingContacts || modalSelectedContacts.length === 0}
                  className={`px-4 py-2 ${buttonPrimary} rounded-lg font-medium transition-colors ${addingContacts || modalSelectedContacts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {addingContacts ? 'Adding...' : `Add ${modalSelectedContacts.length > 0 ? `(${modalSelectedContacts.length})` : 'Selected'}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
