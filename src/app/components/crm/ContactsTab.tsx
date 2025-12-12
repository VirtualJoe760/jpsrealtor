'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Phone, Mail, Edit, Trash2, X, MessageSquare, Download, Filter, SortAsc, SortDesc } from 'lucide-react';
import ContactSyncModal from './ContactSyncModal';

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  email?: string;
  alternateEmails?: string[];
  phone: string;
  alternatePhones?: string[];
  birthday?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  alternateAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  organization?: string;
  jobTitle?: string;
  department?: string;
  website?: string;
  status?: string;
  tags?: string[];
  labels?: string[];
  interests?: {
    buying?: boolean;
    selling?: boolean;
    locations?: string[];
  };
  preferences?: {
    smsOptIn: boolean;
    emailOptIn: boolean;
  };
  notes?: string;
  createdAt: string;
  importedAt?: string;
  originalCreatedDate?: string;
  lastContactDate?: string;
  lastModified?: string;
}

interface ContactsTabProps {
  isLight: boolean;
}

export default function ContactsTab({ isLight }: ContactsTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactAgeFilter, setContactAgeFilter] = useState<string>('all');  // all, recent, old, ancient
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0, hasMore: false });
  const [sortBy, setSortBy] = useState<string>('newest'); // newest, oldest, a-z, z-a
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'no-email' | 'no-phone' | 'no-address' | 'buyers' | 'sellers'>('all');

  // Fetch contacts
  useEffect(() => {
    fetchContacts(true); // Reset on search change
  }, [searchQuery]);

  const fetchContacts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPagination({ total: 0, limit: 50, skip: 0, hasMore: false });
      } else {
        setLoadingMore(true);
      }

      const skip = reset ? 0 : pagination.skip + pagination.limit;
      const url = searchQuery
        ? `/api/crm/contacts?search=${encodeURIComponent(searchQuery)}&limit=${pagination.limit}&skip=${skip}`
        : `/api/crm/contacts?limit=${pagination.limit}&skip=${skip}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setContacts(data.contacts);
        } else {
          setContacts(prev => [...prev, ...data.contacts]);
        }
        setPagination({
          total: data.pagination.total,
          limit: data.pagination.limit,
          skip: skip,
          hasMore: data.pagination.hasMore
        });
      }
    } catch (error) {
      console.error('[Contacts] Fetch error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };


  const deleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(`/api/crm/contacts?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchContacts(true); // Reset to page 1 after deletion
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('[Contacts] Delete error:', error);
      alert('Failed to delete contact');
    }
  };

  // Helper: Calculate days since contact was imported/created
  const getDaysSinceImport = (contact: Contact): number => {
    const dateToUse = contact.importedAt || contact.createdAt;
    const importDate = new Date(dateToUse);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - importDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper: Get contact age category
  const getContactAgeCategory = (contact: Contact): 'recent' | 'old' | 'ancient' => {
    const days = getDaysSinceImport(contact);
    if (days <= 30) return 'recent';  // 0-30 days
    if (days <= 365) return 'old';     // 31-365 days (1 year)
    return 'ancient';                   // 365+ days
  };

  // Filter contacts by age
  const filteredContacts = contacts.filter(contact => {
    // Age filter
    if (contactAgeFilter !== 'all' && getContactAgeCategory(contact) !== contactAgeFilter) {
      return false;
    }

    // Apply new filters
    if (filterBy === 'no-email') {
      return !contact.email && (!contact.alternateEmails || contact.alternateEmails.length === 0);
    } else if (filterBy === 'no-phone') {
      return !contact.phone || contact.phone.trim() === '';
    } else if (filterBy === 'no-address') {
      return !contact.address || (!contact.address.street && !contact.address.city);
    } else if (filterBy === 'buyers') {
      return contact.interests?.buying === true;
    } else if (filterBy === 'sellers') {
      return contact.interests?.selling === true;
    }

    return true;
  });

  // Sort contacts
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    switch (sortBy) {
      case 'a-z':
        return `${a.firstName} ${a.lastName}`.toLowerCase().localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase());
      case 'z-a':
        return `${b.firstName} ${b.lastName}`.toLowerCase().localeCompare(`${a.firstName} ${a.lastName}`.toLowerCase());
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Toggle individual contact selection
  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContactIds(newSelected);
  };

  // Toggle select all (for sorted contacts)
  const toggleSelectAll = () => {
    if (selectedContactIds.size === sortedContacts.length) {
      // Deselect all
      setSelectedContactIds(new Set());
    } else {
      // Select all sorted contacts
      const allIds = new Set(sortedContacts.map(c => c._id));
      setSelectedContactIds(allIds);
    }
  };

  // Bulk delete selected contacts
  const bulkDeleteContacts = async () => {
    if (selectedContactIds.size === 0) {
      alert('No contacts selected');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedContactIds.size} contact${selectedContactIds.size > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);

    try {
      // Use bulk delete API
      const ids = Array.from(selectedContactIds).join(',');
      const response = await fetch(`/api/crm/contacts?ids=${ids}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      // Clear selection and refresh
      setSelectedContactIds(new Set());
      await fetchContacts(true);

      alert(data.message || `Successfully deleted ${data.deletedCount} contact${data.deletedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('[Contacts] Bulk delete error:', error);
      alert('Failed to delete contacts. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all contacts on current page
  const deleteCurrentPage = async () => {
    if (sortedContacts.length === 0) {
      alert('No contacts to delete on this page');
      return;
    }

    const confirmMessage = `Are you sure you want to delete all ${sortedContacts.length} contact${sortedContacts.length > 1 ? 's' : ''} on this page? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);

    try {
      const ids = sortedContacts.map(c => c._id).join(',');
      const response = await fetch(`/api/crm/contacts?ids=${ids}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      setSelectedContactIds(new Set());
      await fetchContacts(true);

      alert(data.message || `Successfully deleted ${data.deletedCount} contact${data.deletedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('[Contacts] Delete page error:', error);
      alert('Failed to delete contacts. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete ALL contacts
  const deleteAllContacts = async () => {
    const confirmMessage = `⚠️ WARNING: Are you sure you want to delete ALL ${pagination.total} contact${pagination.total !== 1 ? 's' : ''} in your database? This action cannot be undone and will permanently delete everything.`;
    if (!confirm(confirmMessage)) return;

    const doubleConfirm = confirm('This is your final warning. Click OK to permanently delete ALL contacts.');
    if (!doubleConfirm) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/crm/contacts?deleteAll=true', {
        method: 'DELETE'
      });

      const data = await response.json();

      setSelectedContactIds(new Set());
      setContacts([]);
      setPagination({ total: 0, limit: 50, skip: 0, hasMore: false });

      alert(data.message || `Successfully deleted all contacts`);
    } catch (error) {
      console.error('[Contacts] Delete all error:', error);
      alert('Failed to delete all contacts. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Header with Search and Add Button */}
      <div className="mb-6 flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isLight ? 'text-slate-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search contacts by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          />
        </div>

        {/* Import Button */}
        <button
          onClick={() => setShowSyncModal(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all border ${
            isLight
              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Download className="w-4 h-4" />
          Import
        </button>

        {/* Add Contact Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Filter and Sort Bar */}
      <div className={`mb-4 flex flex-wrap items-center gap-3 p-4 rounded-lg border ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-gray-400'}`} />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-gray-900 border-gray-600 text-gray-100'
            }`}
          >
            <option value="all">All Contacts</option>
            <option value="no-email">No Email</option>
            <option value="no-phone">No Phone</option>
            <option value="no-address">No Address</option>
            <option value="buyers">Buyers</option>
            <option value="sellers">Sellers</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-gray-900 border-gray-600 text-gray-100'
            }`}
          >
            <option value="a-z">A-Z</option>
            <option value="z-a">Z-A</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Results Count */}
        <div className={`ml-auto text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
          Showing {sortedContacts.length} of {pagination.total} contacts
        </div>
      </div>

      {/* Stats Bar */}
      <div className={`mb-4 p-4 rounded-lg border ${
        isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Total Contacts:
              </span>
              <span className={`ml-2 text-lg font-bold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {pagination.total.toLocaleString()}
              </span>
            </div>
            <div>
              <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Showing:
              </span>
              <span className={`ml-2 text-lg font-bold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {contacts.length.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar & Filters */}
      <div className={`mb-4 flex flex-wrap items-center gap-3 p-4 rounded-lg border ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-800/50 border-gray-700'
      }`}>
        {/* Select All Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sortedContacts.length > 0 && selectedContactIds.size === sortedContacts.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
            Select Page {sortedContacts.length > 0 && `(${sortedContacts.length})`}
          </span>
        </label>

        {/* Selected Count */}
        {selectedContactIds.size > 0 && (
          <span className={`text-sm font-bold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
            {selectedContactIds.size} selected
          </span>
        )}

        {/* Delete Selected Button */}
        {selectedContactIds.size > 0 && (
          <button
            onClick={bulkDeleteContacts}
            disabled={isDeleting}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isLight
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : `Delete Selected`}
          </button>
        )}

        {/* Delete Current Page Button */}
        <button
          onClick={deleteCurrentPage}
          disabled={isDeleting || sortedContacts.length === 0}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isLight
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Trash2 className="w-4 h-4" />
          Delete Page ({sortedContacts.length})
        </button>

        {/* Delete ALL Button */}
        <button
          onClick={deleteAllContacts}
          disabled={isDeleting || pagination.total === 0}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isLight
              ? 'bg-red-900 text-white hover:bg-red-950'
              : 'bg-red-900 text-white hover:bg-red-950'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Trash2 className="w-4 h-4" />
          Delete ALL ({pagination.total.toLocaleString()})
        </button>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Contact Age Filter */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
            Filter:
          </span>
          <select
            value={contactAgeFilter}
            onChange={(e) => {
              setContactAgeFilter(e.target.value);
              setSelectedContactIds(new Set());  // Clear selection when filter changes
            }}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-700 border-gray-600 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          >
            <option value="all">All Contacts</option>
            <option value="recent">Recent (0-30 days)</option>
            <option value="old">Old (31-365 days)</option>
            <option value="ancient">Ancient (1+ year)</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-700 border-gray-600 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="a-z">A-Z (First Name)</option>
            <option value="z-a">Z-A (First Name)</option>
          </select>
        </div>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className={`text-center py-12 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className={`text-center py-12 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No contacts found</p>
          <p className="text-sm mt-1">Add your first contact to get started</p>
        </div>
      ) : sortedContacts.length === 0 ? (
        <div className={`text-center py-12 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No contacts match the selected filter</p>
          <p className="text-sm mt-1">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedContacts.map((contact) => {
            const isExpanded = expandedContactId === contact._id;
            const ageCategory = getContactAgeCategory(contact);
            const days = getDaysSinceImport(contact);

            return (
              <div
                key={contact._id}
                className={`rounded-lg border transition-all ${
                  selectedContactIds.has(contact._id)
                    ? isLight
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-emerald-900/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-blue-300'
                    : 'bg-gray-800 border-gray-700 hover:border-emerald-500/50'
                }`}
              >
                {/* Collapsed Header - Click to Expand */}
                <div
                  onClick={() => setExpandedContactId(isExpanded ? null : contact._id)}
                  className="p-4 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Checkbox - Stop propagation so it doesn't trigger expand */}
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact._id)}
                      onChange={() => toggleContactSelection(contact._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    {/* Name and Quick Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className={`text-base font-semibold ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          {contact.firstName} {contact.lastName}
                        </h3>

                        {/* Status Badge */}
                        {contact.status && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            contact.status === 'client'
                              ? isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400'
                              : contact.status === 'qualified'
                              ? isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                              : isLight ? 'bg-slate-100 text-slate-600' : 'bg-gray-700 text-gray-300'
                          }`}>
                            {contact.status}
                          </span>
                        )}

                        {/* Age Badge */}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          ageCategory === 'recent'
                            ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/30 text-emerald-400'
                            : ageCategory === 'old'
                            ? isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-900/30 text-amber-400'
                            : isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {days}d
                        </span>
                      </div>

                      {/* Quick Contact Info */}
                      <div className={`flex items-center gap-4 mt-1 text-sm ${
                        isLight ? 'text-slate-600' : 'text-gray-400'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </span>
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tags Preview */}
                    {contact.tags && contact.tags.length > 0 && !isExpanded && (
                      <div className="flex items-center gap-1 flex-wrap max-w-xs">
                        {contact.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              isLight ? 'bg-slate-100 text-slate-600' : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 3 && (
                          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                            +{contact.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact(contact);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          isLight ? 'text-blue-600 hover:bg-blue-50' : 'text-emerald-400 hover:bg-emerald-900/20'
                        }`}
                        title="Send Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact(contact);
                          setShowAddModal(true);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-gray-700'
                        }`}
                        title="Edit Contact"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteContact(contact._id);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                        }`}
                        title="Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={`px-4 pb-4 border-t ${
                    isLight ? 'border-slate-200' : 'border-gray-700'
                  }`}>
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Contact Information */}
                      <div>
                        <h4 className={`text-sm font-semibold mb-3 ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          Contact Information
                        </h4>
                        <div className={`space-y-2 text-sm ${
                          isLight ? 'text-slate-600' : 'text-gray-400'
                        }`}>
                          <div>
                            <span className="font-medium">Phone:</span>{' '}
                            <a href={`tel:${contact.phone}`} className={isLight ? 'text-blue-600 hover:underline' : 'text-emerald-400 hover:underline'}>
                              {contact.phone}
                            </a>
                            {contact.preferences?.smsOptIn && (
                              <span className="ml-2 text-xs text-green-500">(SMS OK)</span>
                            )}
                          </div>

                          {contact.alternatePhones && contact.alternatePhones.length > 0 && (
                            <div>
                              <span className="font-medium">Alt Phones:</span>
                              <div className="ml-4 space-y-1">
                                {contact.alternatePhones.map((phone, idx) => (
                                  <div key={idx}>
                                    <a href={`tel:${phone}`} className={isLight ? 'text-blue-600 hover:underline' : 'text-emerald-400 hover:underline'}>
                                      {phone}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {contact.email && (
                            <div>
                              <span className="font-medium">Email:</span>{' '}
                              <a href={`mailto:${contact.email}`} className={isLight ? 'text-blue-600 hover:underline' : 'text-emerald-400 hover:underline'}>
                                {contact.email}
                              </a>
                            </div>
                          )}

                          {contact.alternateEmails && contact.alternateEmails.length > 0 && (
                            <div>
                              <span className="font-medium">Alt Emails:</span>
                              <div className="ml-4 space-y-1">
                                {contact.alternateEmails.map((email, idx) => (
                                  <div key={idx}>
                                    <a href={`mailto:${email}`} className={isLight ? 'text-blue-600 hover:underline' : 'text-emerald-400 hover:underline'}>
                                      {email}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {contact.website && (
                            <div>
                              <span className="font-medium">Website:</span>{' '}
                              <a href={contact.website} target="_blank" rel="noopener noreferrer" className={isLight ? 'text-blue-600 hover:underline' : 'text-emerald-400 hover:underline'}>
                                {contact.website}
                              </a>
                            </div>
                          )}

                          {contact.birthday && (
                            <div>
                              <span className="font-medium">Birthday:</span>{' '}
                              {new Date(contact.birthday).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address & Organization */}
                      <div>
                        <h4 className={`text-sm font-semibold mb-3 ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          Address & Organization
                        </h4>
                        <div className={`space-y-2 text-sm ${
                          isLight ? 'text-slate-600' : 'text-gray-400'
                        }`}>
                          {contact.address && (
                            <div>
                              <span className="font-medium">Address:</span>
                              <div className="ml-4">
                                {contact.address.street && <div>{contact.address.street}</div>}
                                {(contact.address.city || contact.address.state || contact.address.zip) && (
                                  <div>
                                    {contact.address.city && `${contact.address.city}, `}
                                    {contact.address.state} {contact.address.zip}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {contact.organization && (
                            <div>
                              <span className="font-medium">Company:</span> {contact.organization}
                            </div>
                          )}

                          {contact.jobTitle && (
                            <div>
                              <span className="font-medium">Title:</span> {contact.jobTitle}
                            </div>
                          )}

                          {contact.department && (
                            <div>
                              <span className="font-medium">Department:</span> {contact.department}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags & Labels */}
                      <div>
                        <h4 className={`text-sm font-semibold mb-3 ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          Tags & Categories
                        </h4>
                        <div className="space-y-3">
                          {contact.tags && contact.tags.length > 0 && (
                            <div>
                              <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                                Tags:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contact.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                                    }`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {contact.labels && contact.labels.length > 0 && (
                            <div>
                              <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                                Labels:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contact.labels.map((label, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400'
                                    }`}
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes - Full Width */}
                      {contact.notes && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <h4 className={`text-sm font-semibold mb-2 ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}>
                            Notes
                          </h4>
                          <p className={`text-sm ${
                            isLight ? 'text-slate-600' : 'text-gray-400'
                          }`}>
                            {contact.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Button */}
          {!loading && pagination.hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchContacts(false)}
                disabled={loadingMore}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  isLight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingMore ? 'Loading...' : `Load More (${pagination.total - contacts.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showAddModal && (
        <ContactFormModal
          isLight={isLight}
          contact={selectedContact}
          onClose={() => {
            setShowAddModal(false);
            setSelectedContact(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setSelectedContact(null);
            fetchContacts();
          }}
        />
      )}

      {/* Contact Sync Modal */}
      {showSyncModal && (
        <ContactSyncModal
          isLight={isLight}
          onClose={() => setShowSyncModal(false)}
          onSuccess={() => {
            setShowSyncModal(false);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}

// Contact Form Modal Component
function ContactFormModal({
  isLight,
  contact,
  onClose,
  onSuccess,
}: {
  isLight: boolean;
  contact: Contact | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    notes: contact?.notes || '',
    status: contact?.status || 'new',
    tags: contact?.tags?.join(', ') || '',
    smsOptIn: contact?.preferences?.smsOptIn || false,
    emailOptIn: contact?.preferences?.emailOptIn || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...(contact?._id && { _id: contact._id }),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone,
        notes: formData.notes || undefined,
        status: formData.status,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        preferences: {
          smsOptIn: formData.smsOptIn,
          emailOptIn: formData.emailOptIn,
        },
      };

      const response = await fetch('/api/crm/contacts', {
        method: contact ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('[Contact Form] Save error:', error);
      alert('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
        isLight ? 'bg-white' : 'bg-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <h2 className={`text-2xl font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {contact ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              isLight
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                isLight ? 'text-slate-700' : 'text-gray-300'
              }`}>
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-gray-800 border-gray-700 text-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                isLight ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-gray-800 border-gray-700 text-white'
                }`}
              />
            </div>
          </div>

          {/* Contact Fields */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isLight ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Phone Number * (E.164 format: +17605551234)
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+17605551234"
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isLight ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            />
          </div>

          {/* Status */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isLight ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="nurturing">Nurturing</option>
              <option value="client">Client</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isLight ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="buyer, investor, luxury"
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            />
          </div>

          {/* Communication Preferences */}
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              isLight ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Communication Preferences
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.smsOptIn}
                  onChange={(e) => setFormData({ ...formData, smsOptIn: e.target.checked })}
                  className="rounded"
                />
                <span className={`text-sm ${
                  isLight ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  SMS Opt-In
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emailOptIn}
                  onChange={(e) => setFormData({ ...formData, emailOptIn: e.target.checked })}
                  className="rounded"
                />
                <span className={`text-sm ${
                  isLight ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  Email Opt-In
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isLight ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isLight
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              } disabled:opacity-50`}
            >
              {saving ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
