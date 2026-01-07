// app/components/campaigns/ContactSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  TagIcon,
  CheckIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';
import ContactSyncModal from '@/app/components/crm/ContactSyncModal';

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  tags?: string[];
  status?: string;
  campaigns?: Array<{
    campaignId: string;
    campaignName: string;
  }>;
}

interface ContactSelectorProps {
  selectedContactIds: string[];
  onContactsChange: (contactIds: string[]) => void;
  campaignId?: string; // Optional campaign ID for tagging imported contacts
}

export default function ContactSelector({ selectedContactIds, onContactsChange, campaignId }: ContactSelectorProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, buttonPrimary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedTags.length > 0) {
          params.append('tags', selectedTags.join(','));
        }
        if (selectedStatus !== 'all') {
          params.append('status', selectedStatus);
        }

        const response = await fetch(`/api/contacts/list?${params}`);
        const data = await response.json();

        if (data.success) {
          setContacts(data.contacts);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [selectedTags, selectedStatus]);

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

  const toggleContact = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      onContactsChange(selectedContactIds.filter((id) => id !== contactId));
    } else {
      onContactsChange([...selectedContactIds, contactId]);
    }
  };

  const selectAll = () => {
    onContactsChange(filteredContacts.map((c) => c._id));
  };

  const deselectAll = () => {
    onContactsChange([]);
  };

  const handleImportSuccess = (importedContactIds?: string[]) => {
    console.log('[ContactSelector] Import success - received contact IDs:', importedContactIds);

    // Refresh contacts list and auto-select imported contacts
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedTags.length > 0) {
          params.append('tags', selectedTags.join(','));
        }
        if (selectedStatus !== 'all') {
          params.append('status', selectedStatus);
        }

        const response = await fetch(`/api/contacts/list?${params}`);
        const data = await response.json();

        if (data.success) {
          setContacts(data.contacts);

          // Auto-select imported contacts using IDs from API
          if (importedContactIds && importedContactIds.length > 0) {
            const updatedSelection = [...new Set([...selectedContactIds, ...importedContactIds])];
            console.log('[ContactSelector] Auto-selecting contacts:', updatedSelection);
            onContactsChange(updatedSelection);
            toast.success(`Imported and selected ${importedContactIds.length} contact${importedContactIds.length !== 1 ? 's' : ''}!`);
          } else {
            console.log('[ContactSelector] No imported contact IDs to select');
            toast.success('Contacts imported successfully!');
          }

          // Close the import modal
          setShowImportModal(false);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to refresh contacts list');
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  };

  // Get unique tags from all contacts
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            Select Contacts
          </h2>
          <p className={textSecondary}>
            {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className={`px-4 py-2 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg text-sm font-medium transition-colors`}
          >
            Select All
          </button>
          {selectedContactIds.length > 0 && (
            <button
              onClick={deselectAll}
              className={`px-4 py-2 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg text-sm font-medium transition-colors`}
            >
              Deselect All
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 ${cardBg} ${cardBorder} rounded-lg ${
              showFilters
                ? `${isLight ? 'bg-blue-50 border-blue-500' : 'bg-emerald-900/20 border-emerald-500'}`
                : ''
            } transition-colors`}
          >
            <FunnelIcon className={`w-5 h-5 ${textSecondary}`} />
            Filters
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${cardBg} ${cardBorder} rounded-lg p-4 space-y-4`}
          >
            {/* Status Filter */}
            <div>
              <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${
                  isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                } ${textPrimary}`}
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="nurturing">Nurturing</option>
                <option value="client">Client</option>
              </select>
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter((t) => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? `${isLight ? 'bg-blue-600' : 'bg-emerald-600'} text-white`
                            : `${bgSecondary} ${textSecondary} hover:${isLight ? 'bg-blue-50' : 'bg-emerald-900/20'}`
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
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
            <p className={`${textSecondary} text-sm`}>Try adjusting your filters or add contacts to get started</p>
          </div>
        ) : (
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
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? `${isLight ? 'bg-blue-600 border-blue-600' : 'bg-emerald-600 border-emerald-600'}`
                        : `${border}`
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                  </div>

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

                  {contact.status && (
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        contact.status === 'client'
                          ? isLight
                            ? 'bg-green-100 text-green-700'
                            : 'bg-green-900/30 text-green-400'
                          : isLight
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {contact.status}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload CSV Option */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <div className="flex items-center gap-4">
          <ArrowUpTrayIcon className={`w-8 h-8 ${textSecondary}`} />
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${textPrimary} mb-1`}>
              Import from CSV
            </h3>
            <p className={`text-sm ${textSecondary}`}>
              Upload a CSV file to add multiple contacts at once
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-4 py-2 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg text-sm font-medium transition-colors`}
          >
            Upload CSV
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ContactSyncModal
          isLight={isLight}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
          campaignId={campaignId}
          context="campaign"
        />
      )}
    </div>
  );
}
