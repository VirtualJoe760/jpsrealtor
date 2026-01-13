'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Phone, Mail, Edit, Trash2, X, MessageSquare, Download, Filter, SortAsc, SortDesc, Grid3x3, List, Tag, UserCheck, UserX, Star, Heart, Zap, Archive } from 'lucide-react';
import ContactSyncModal from './ContactSyncModal';
import ContactViewPanel from './ContactViewPanel';
import { useRouter } from 'next/navigation';

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

interface Tag {
  name: string;
  color: string;
  contactCount: number;
}

interface ContactStats {
  total: number;
  byStatus: Record<string, number>;
}

interface ContactsTabProps {
  isLight: boolean;
}

export default function ContactsTab({ isLight }: ContactsTabProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<ContactStats>({ total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactAgeFilter, setContactAgeFilter] = useState<string>('all');  // all, recent, old, ancient
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [panelContact, setPanelContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0, hasMore: false });
  const [sortBy, setSortBy] = useState<string>('a-z'); // Changed default to a-z
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'no-email' | 'no-phone' | 'no-address' | 'buyers' | 'sellers'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card'); // New: card or list view
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // New: filter by tag
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // New: filter by status

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('contactsPageState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.searchQuery) setSearchQuery(state.searchQuery);
        if (state.viewMode) setViewMode(state.viewMode);
        if (state.selectedTag) setSelectedTag(state.selectedTag);
        if (state.selectedStatus) setSelectedStatus(state.selectedStatus);
        if (state.sortBy) setSortBy(state.sortBy);
        if (state.filterBy) setFilterBy(state.filterBy);
        if (state.contactAgeFilter) setContactAgeFilter(state.contactAgeFilter);

        // Restore scroll position after a short delay to ensure content is loaded
        if (state.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, state.scrollPosition);
          }, 100);
        }
      } catch (error) {
        console.error('[ContactsTab] Error restoring state:', error);
      }
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      searchQuery,
      viewMode,
      selectedTag,
      selectedStatus,
      sortBy,
      filterBy,
      contactAgeFilter,
      scrollPosition: window.scrollY,
    };
    sessionStorage.setItem('contactsPageState', JSON.stringify(stateToSave));
  }, [searchQuery, viewMode, selectedTag, selectedStatus, sortBy, filterBy, contactAgeFilter]);

  // Save scroll position before navigation
  useEffect(() => {
    const handleScroll = () => {
      const savedState = sessionStorage.getItem('contactsPageState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          state.scrollPosition = window.scrollY;
          sessionStorage.setItem('contactsPageState', JSON.stringify(state));
        } catch (error) {
          console.error('[ContactsTab] Error saving scroll position:', error);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch tags and stats on mount
  useEffect(() => {
    fetchTags();
    fetchStats();
  }, []);

  // Fetch contacts when filters change
  useEffect(() => {
    fetchContacts(true);
  }, [searchQuery, selectedTag, selectedStatus]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/crm/contacts/tags');
      const data = await response.json();
      console.log('[ContactsTab] Tags API response:', data);
      if (data.success) {
        console.log('[ContactsTab] Setting tags:', data.tags);
        setTags(data.tags || []);
      } else {
        console.error('[ContactsTab] Tags API error:', data.error);
      }
    } catch (error) {
      console.error('[Contacts] Error fetching tags:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/crm/contacts/stats');
      const data = await response.json();
      console.log('[ContactsTab] Stats API response:', data);
      if (data.success) {
        console.log('[ContactsTab] Setting stats:', data.stats);
        setStats(data.stats);
      } else {
        console.error('[ContactsTab] Stats API error:', data.error);
      }
    } catch (error) {
      console.error('[Contacts] Error fetching stats:', error);
    }
  };

  const fetchContacts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPagination({ total: 0, limit: 50, skip: 0, hasMore: false });
      } else {
        setLoadingMore(true);
      }

      const skip = reset ? 0 : pagination.skip + pagination.limit;

      // Build URL with optional filters
      let url = `/api/crm/contacts?limit=${pagination.limit}&skip=${skip}`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }
      if (selectedStatus) {
        url += `&status=${selectedStatus}`;
      }

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
        fetchStats(); // Refresh stats
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
      case 'status':
        const statusPriority: { [key: string]: number } = {
          'uncontacted': 0,
          'contacted': 1,
          'qualified': 2,
          'nurturing': 3,
          'client': 4,
          'inactive': 5,
        };
        return (statusPriority[a.status || 'uncontacted'] || 99) - (statusPriority[b.status || 'uncontacted'] || 99);
      case 'a-z':
        return `${a.firstName} ${a.lastName}`.toLowerCase().localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase());
      case 'z-a':
        return `${b.firstName} ${b.lastName}`.toLowerCase().localeCompare(`${a.firstName} ${b.lastName}`.toLowerCase());
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
      fetchStats(); // Refresh stats

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
      fetchStats(); // Refresh stats

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
      fetchStats(); // Refresh stats

      alert(data.message || `Successfully deleted all contacts`);
    } catch (error) {
      console.error('[Contacts] Delete all error:', error);
      alert('Failed to delete all contacts. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with Search and View Controls */}
      <div className="mb-6 px-4 md:px-0 flex-shrink-0">
        {/* Single Row: Import Button, Search, and View Toggle */}
        <div className="flex items-center gap-3">
          {/* Import Button */}
          <button
            onClick={() => setShowSyncModal(true)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isLight ? 'text-slate-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all text-sm sm:text-base ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
          </div>

          {/* View Toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border ${
            isLight ? 'bg-white border-slate-300' : 'bg-gray-800 border-gray-700'
          }`}>
            <button
              onClick={() => {
                setViewMode('card');
                setSelectedTag(null);
                setSelectedStatus(null);
              }}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-all text-xs sm:text-sm ${
                viewMode === 'card'
                  ? isLight
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="hidden xs:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-all text-xs sm:text-sm ${
                viewMode === 'list'
                  ? isLight
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden xs:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Toolbar - Only in List View */}
      {viewMode === 'list' && (
        <div className={`mb-4 flex flex-wrap items-center gap-3 p-3 rounded-lg border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-800/50 border-gray-700'
        }`}>
          {/* Select Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sortedContacts.length > 0 && selectedContactIds.size === sortedContacts.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              Select ({sortedContacts.length})
            </span>
          </label>

          {/* Filter & Sort */}
          <div className="flex items-center gap-2">
            {/* Filter by Age */}
            <select
              value={contactAgeFilter}
              onChange={(e) => {
                setContactAgeFilter(e.target.value);
                setSelectedContactIds(new Set());
              }}
              className={`px-2 py-1 rounded border text-xs ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-700 border-gray-600 text-white'
              }`}
            >
              <option value="all">All Ages</option>
              <option value="recent">Recent (0-30d)</option>
              <option value="old">Old (31-365d)</option>
              <option value="ancient">Ancient (1y+)</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-2 py-1 rounded border text-xs ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-700 border-gray-600 text-white'
              }`}
            >
              <option value="status">Priority (Uncontacted First)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="a-z">A-Z (First Name)</option>
              <option value="z-a">Z-A (First Name)</option>
            </select>
          </div>

          {/* Delete Buttons - Show when items selected */}
          {selectedContactIds.size > 0 && (
            <button
              onClick={bulkDeleteContacts}
              disabled={isDeleting}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ml-auto ${
                isLight
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50`}
            >
              <Trash2 className="w-3 h-3" />
              {isDeleting ? 'Deleting...' : `Delete (${selectedContactIds.size})`}
            </button>
          )}
        </div>
      )}

      {/* Card View - Organized by Sections */}
      {viewMode === 'card' && (
        <div className="space-y-8">
          {/* Contacts Section */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus(null);
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Users className={`w-8 h-8 ${isLight ? 'text-blue-600' : 'text-emerald-500'}`} />
                </div>
                <p className={`text-3xl font-bold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                  {stats.total}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  View all contacts
                </p>
              </button>

              {/* Tag Cards - Inline with Contacts Card */}
              {tags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => {
                    setViewMode('list');
                    setSelectedTag(tag.name);
                    setSelectedStatus(null);
                  }}
                  className={`p-6 rounded-lg transition-all text-left ${
                    isLight
                      ? 'bg-white/30'
                      : 'bg-neutral-900/30'
                  }`}
                  style={{
                    borderColor: selectedTag === tag.name ? tag.color : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Tag className="w-8 h-8" style={{ color: tag.color }} />
                  </div>
                  <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {tag.name}
                  </h3>
                  <p className="text-3xl font-bold" style={{ color: tag.color }}>
                    {tag.contactCount}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* By Status Section */}
          <div>
            <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              By Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Uncontacted */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus('uncontacted');
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <UserX className={`w-8 h-8 ${isLight ? 'text-slate-600' : 'text-gray-400'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Uncontacted
                </h3>
                <p className={`text-3xl font-bold ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  {stats.byStatus.uncontacted || 0}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Not yet reached out
                </p>
              </button>

              {/* Contacted */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus('contacted');
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Phone className={`w-8 h-8 ${isLight ? 'text-yellow-600' : 'text-yellow-400'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Contacted
                </h3>
                <p className={`text-3xl font-bold ${isLight ? 'text-yellow-600' : 'text-yellow-400'}`}>
                  {stats.byStatus.contacted || 0}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Initial contact made
                </p>
              </button>

              {/* Qualified */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus('qualified');
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Star className={`w-8 h-8 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Qualified
                </h3>
                <p className={`text-3xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                  {stats.byStatus.qualified || 0}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Potential opportunities
                </p>
              </button>

              {/* Nurturing */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus('nurturing');
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Heart className={`w-8 h-8 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Nurturing
                </h3>
                <p className={`text-3xl font-bold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                  {stats.byStatus.nurturing || 0}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Building relationships
                </p>
              </button>

              {/* Client */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus('client');
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <UserCheck className={`w-8 h-8 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Client
                </h3>
                <p className={`text-3xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                  {stats.byStatus.client || 0}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Active clients
                </p>
              </button>

              {/* Inactive */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedTag(null);
                  setSelectedStatus('inactive');
                }}
                className={`p-6 rounded-lg transition-all text-left ${
                  isLight
                    ? 'bg-white/30'
                    : 'bg-neutral-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Archive className={`w-8 h-8 ${isLight ? 'text-red-600' : 'text-red-400'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Inactive
                </h3>
                <p className={`text-3xl font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                  {stats.byStatus.inactive || 0}
                </p>
                <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  No longer active
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View - Contacts List */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6">
          {/* Breadcrumb for filtered view */}
          {(selectedTag || selectedStatus) && (
            <div className={`mb-4 flex items-center gap-2 text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              <button
                onClick={() => {
                  setViewMode('card');
                  setSelectedTag(null);
                  setSelectedStatus(null);
                }}
                className={`hover:underline ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}
              >
                {selectedStatus ? 'All Status' : 'All Tags'}
              </button>
              <span>/</span>
              <span className="font-medium">
                {selectedTag
                  ? selectedTag
                  : selectedStatus ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1) : ''
                }
              </span>
            </div>
          )}

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
            const ageCategory = getContactAgeCategory(contact);
            const days = getDaysSinceImport(contact);

            return (
              <div
                key={contact._id}
                className={`rounded-lg border transition-all ${
                  selectedContactIds.has(contact._id)
                    ? isLight
                      ? 'bg-blue-50 border-blue-300 shadow-xl'
                      : 'bg-emerald-900/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-blue-300 shadow-lg hover:shadow-xl'
                    : 'bg-gray-800 border-gray-700 hover:border-emerald-500/50'
                }`}
              >
                {/* Contact Header - Click to Open Panel */}
                <div
                  onClick={() => {
                    setPanelContact(contact);
                    setIsPanelOpen(true);
                  }}
                  className="p-3 sm:p-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox - Stop propagation so it doesn't trigger expand */}
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact._id)}
                      onChange={() => toggleContactSelection(contact._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    {/* Name and Quick Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`text-sm sm:text-base font-semibold ${
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
                              : contact.status === 'contacted'
                              ? isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400'
                              : contact.status === 'nurturing'
                              ? isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400'
                              : contact.status === 'inactive'
                              ? isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-400'
                              : isLight ? 'bg-slate-100 text-slate-600' : 'bg-gray-700 text-gray-300'
                          }`}>
                            {contact.status}
                          </span>
                        )}

                        {/* Age Badge - Hidden on very small screens */}
                        <span className={`hidden xs:inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
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
                      <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm ${
                        isLight ? 'text-slate-600' : 'text-gray-400'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span className="truncate">{contact.phone}</span>
                        </span>
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{contact.email}</span>
                          </span>
                        )}
                      </div>

                      {/* Tags Preview - Hidden on mobile, shown on tablet+ */}
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="hidden md:flex items-center gap-1 flex-wrap mt-2">
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
                    </div>

                    {/* Quick Actions */}
                    <div className="flex sm:items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agent/messages?contactId=${contact._id}&phone=${encodeURIComponent(contact.phone)}&name=${encodeURIComponent(`${contact.firstName} ${contact.lastName}`)}`);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          isLight ? 'text-blue-600 hover:bg-blue-50' : 'text-emerald-400 hover:bg-emerald-900/20'
                        }`}
                        title="Send Message"
                      >
                        <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact(contact);
                          setShowAddModal(true);
                        }}
                        className={`hidden sm:block p-2 rounded-lg transition-all ${
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
        </div>
      )}

      {/* Contact View Panel */}
      {panelContact && (
        <ContactViewPanel
          contact={panelContact}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setTimeout(() => setPanelContact(null), 300);
          }}
          onEdit={() => {
            setSelectedContact(panelContact);
            setShowAddModal(true);
            setIsPanelOpen(false);
          }}
          onDelete={() => {
            setIsPanelOpen(false);
            deleteContact(panelContact._id);
          }}
          onMessage={() => {
            setSelectedContact(panelContact);
            setIsPanelOpen(false);
            // Message functionality already exists
          }}
          isLight={isLight}
        />
      )}

      {/* Import Modal */}
      {showSyncModal && (
        <ContactSyncModal
          isLight={isLight}
          onClose={() => setShowSyncModal(false)}
          onSuccess={() => {
            setShowSyncModal(false);
            fetchContacts(true);
            fetchStats(); // Refresh stats after import
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
