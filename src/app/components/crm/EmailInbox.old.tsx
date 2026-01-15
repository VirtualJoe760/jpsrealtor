'use client';

import { useState, useEffect, useMemo } from 'react';
import { Mail, Paperclip, ChevronDown, ChevronUp, RefreshCw, Star, Archive, Trash2, Plus, Inbox, Send, AlertOctagon, Forward, MailOpen, Tag, User, Search, Filter, SortAsc, SortDesc, X, Check, Clock, Tags } from 'lucide-react';
import ComposePanel from './ComposePanel';
import Image from 'next/image';

interface Email {
  id: string;
  to: string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  created_at: string;
  attachments?: {
    filename: string;
    content_type: string;
    size: number;
  }[];
  error?: string;
  errorDetails?: any;
  statusCode?: number;
}

interface EmailMetadata {
  resendEmailId: string;
  isRead: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  tags: string[];
  cachedSenderName?: string;
  cachedSenderEmail?: string;
  cachedSenderPhoto?: string;
  contactId?: any;
}

interface EmailInboxProps {
  isLight: boolean;
}

type FolderType = 'inbox' | 'sent';
type SentSubfolder = 'all' | 'transactional' | 'marketing';

export default function EmailInbox({ isLight }: EmailInboxProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailMetadata, setEmailMetadata] = useState<Record<string, EmailMetadata>>({});
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [expandedEmailContent, setExpandedEmailContent] = useState<{ [key: string]: Email }>({});
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(50);
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [sentSubfolder, setSentSubfolder] = useState<SentSubfolder>('all');

  // Compose panel state
  const [showComposePanel, setShowComposePanel] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<Email | undefined>();
  const [forwardEmail, setForwardEmail] = useState<Email | undefined>();

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'unread' | 'favorites' | 'attachments'>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Bulk actions state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Tag management state
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagModalEmailId, setTagModalEmailId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([
    'urgent', 'follow-up', 'lead', 'client', 'important', 'waiting', 'review'
  ]);

  const folders = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox },
    { id: 'sent' as const, label: 'Sent', icon: Send },
  ];

  const sentSubfolders = [
    { id: 'all' as const, label: 'All Sent' },
    { id: 'transactional' as const, label: 'Transactional', domain: 'jpsrealtor.com' },
    { id: 'marketing' as const, label: 'Marketing', domain: 'josephsardella.com' },
  ];

  const fetchEmailMetadata = async (emailIds: string[]) => {
    if (emailIds.length === 0) return;

    try {
      const response = await fetch(`/api/email-metadata?emailIds=${emailIds.join(',')}`);
      const data = await response.json();

      if (response.ok && data.metadata) {
        setEmailMetadata(data.metadata);
      }
    } catch (error) {
      console.error('[EmailInbox] Failed to fetch metadata:', error);
    }
  };

  const updateEmailMetadata = async (emailId: string, updates: Partial<EmailMetadata>, senderEmail?: string) => {
    try {
      const response = await fetch('/api/email-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resendEmailId: emailId,
          folder: activeFolder,
          senderEmail,
          ...updates,
        }),
      });

      const data = await response.json();

      if (response.ok && data.metadata) {
        setEmailMetadata(prev => ({
          ...prev,
          [emailId]: data.metadata,
        }));
      }
    } catch (error) {
      console.error('[EmailInbox] Failed to update metadata:', error);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        folder: activeFolder,
      });

      // If on sent tab and a subfolder is selected, add domain filter
      if (activeFolder === 'sent' && sentSubfolder !== 'all') {
        const subfolderData = sentSubfolders.find(f => f.id === sentSubfolder);
        if (subfolderData?.domain) {
          params.append('domain', subfolderData.domain);
        }
      }

      const response = await fetch(`/api/resend/inbox?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch emails');
      } else {
        const emailList = data.data || [];
        console.log('[EmailInbox] Fetched emails:', emailList.length);
        if (emailList.length > 0) {
          console.log('[EmailInbox] Sample email structure:', emailList[0]);
        }
        setEmails(emailList);

        // Fetch metadata for all emails
        const emailIds = emailList.map((e: Email) => e.id);
        if (emailIds.length > 0) {
          await fetchEmailMetadata(emailIds);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [activeFolder, sentSubfolder]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEmailPreview = (email: Email) => {
    if (email.text) {
      return email.text.substring(0, 100).replace(/\n/g, ' ');
    }
    if (email.html) {
      const stripped = email.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      return stripped.substring(0, 100);
    }
    return 'No preview available';
  };

  const fetchEmailContent = async (emailId: string) => {
    // Validate email ID
    if (!emailId) {
      console.error('[EmailInbox] No email ID provided');
      return;
    }

    // If we already have the content, don't fetch again
    if (expandedEmailContent[emailId]) {
      return;
    }

    console.log('[EmailInbox] Fetching email content for ID:', emailId);
    console.log('[EmailInbox] Current folder:', activeFolder);
    setLoadingEmail(emailId);

    try {
      // Pass the folder parameter so the API knows which endpoint to use
      const response = await fetch(`/api/resend/email/${emailId}?folder=${activeFolder}`);
      const data = await response.json();

      console.log('[EmailInbox] API Response Status:', response.status);
      console.log('[EmailInbox] API Response Data:', JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('[EmailInbox] Successfully fetched email content');
        console.log('[EmailInbox] Email has html?', !!data.html);
        console.log('[EmailInbox] Email has text?', !!data.text);
        setExpandedEmailContent(prev => ({
          ...prev,
          [emailId]: data
        }));
      } else {
        console.error('[EmailInbox] Failed to fetch email content:', data.error);
        console.error('[EmailInbox] Error details:', data.details);
        console.error('[EmailInbox] Status code:', data.statusCode);
        // Store error in expanded content so we can display it
        setExpandedEmailContent(prev => ({
          ...prev,
          [emailId]: {
            id: emailId,
            error: data.error || 'Failed to fetch email',
            errorDetails: data.details,
            statusCode: data.statusCode,
            to: [],
            from: '',
            subject: '',
            created_at: new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error('[EmailInbox] Error fetching email content:', error);
      // Store error in expanded content
      setExpandedEmailContent(prev => ({
        ...prev,
        [emailId]: {
          id: emailId,
          error: 'Network error occurred',
          errorDetails: error instanceof Error ? error.message : String(error),
          to: [],
          from: '',
          subject: '',
          created_at: new Date().toISOString()
        }
      }));
    } finally {
      setLoadingEmail(null);
    }
  };

  const toggleEmail = async (emailId: string, email: Email) => {
    const isCurrentlyExpanded = expandedEmailId === emailId;

    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedEmailId(null);
    } else {
      // Expand and fetch content
      setExpandedEmailId(emailId);
      await fetchEmailContent(emailId);

      // Mark as read if not already
      const metadata = emailMetadata[emailId];
      if (!metadata?.isRead) {
        await updateEmailMetadata(emailId, { isRead: true }, email.from);
      }
    }
  };

  const handleToggleFavorite = async (emailId: string, email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    const metadata = emailMetadata[emailId];
    const newFavoriteState = !metadata?.isFavorite;
    await updateEmailMetadata(emailId, { isFavorite: newFavoriteState }, email.from);
  };

  const handleToggleRead = async (emailId: string, email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    const metadata = emailMetadata[emailId];
    const newReadState = !metadata?.isRead;
    await updateEmailMetadata(emailId, { isRead: newReadState }, email.from);
  };

  const handleReply = (email: Email) => {
    const fullEmail = expandedEmailContent[email.id] || email;
    setReplyToEmail(fullEmail);
    setForwardEmail(undefined);
    setShowComposePanel(true);
  };

  const handleForward = (email: Email) => {
    const fullEmail = expandedEmailContent[email.id] || email;
    setForwardEmail(fullEmail);
    setReplyToEmail(undefined);
    setShowComposePanel(true);
  };

  const handleNewCompose = () => {
    setReplyToEmail(undefined);
    setForwardEmail(undefined);
    setShowComposePanel(true);
  };

  const handleCloseCompose = () => {
    setShowComposePanel(false);
    setReplyToEmail(undefined);
    setForwardEmail(undefined);
  };

  // Clean up sent email HTML to remove template wrapper
  const cleanSentEmailHtml = (html: string): string => {
    if (!html) return html;

    // Remove the wrapper template that's only meant for recipients
    // Extract content from .message-body div if it exists
    const messageBodyMatch = html.match(/<div class="message-body"[^>]*>([\s\S]*?)<\/div>/);
    if (messageBodyMatch) {
      return messageBodyMatch[1];
    }

    // Remove header, footer, and wrapper divs
    let cleaned = html;

    // Remove header section
    cleaned = cleaned.replace(/<div class="header"[^>]*>[\s\S]*?<\/div>/gi, '');

    // Remove footer section
    cleaned = cleaned.replace(/<div class="footer"[^>]*>[\s\S]*?<\/div>/gi, '');

    // Remove standalone h2 headers like "Message from Joseph Sardella"
    cleaned = cleaned.replace(/<h2[^>]*>Message from[^<]*<\/h2>/gi, '');

    // Remove hr tags that were part of template
    cleaned = cleaned.replace(/<hr[^>]*>/gi, '');

    return cleaned;
  };

  // Bulk selection handlers
  const toggleEmailSelection = (emailId: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  const selectAllEmails = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const bulkMarkAsRead = async (read: boolean) => {
    try {
      await fetch('/api/email-metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
          updates: { isRead: read },
        }),
      });

      // Refresh metadata
      await fetchEmailMetadata(Array.from(selectedEmails));
      setSelectedEmails(new Set());
    } catch (error) {
      console.error('Bulk mark as read failed:', error);
    }
  };

  const bulkAddTag = async (tag: string) => {
    try {
      await fetch('/api/email-metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
          updates: { addTags: [tag] },
        }),
      });

      await fetchEmailMetadata(Array.from(selectedEmails));
      setSelectedEmails(new Set());
    } catch (error) {
      console.error('Bulk add tag failed:', error);
    }
  };

  const bulkArchive = async () => {
    try {
      await fetch('/api/email-metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
          updates: { isArchived: true },
        }),
      });

      await fetchEmails();
      setSelectedEmails(new Set());
    } catch (error) {
      console.error('Bulk archive failed:', error);
    }
  };

  const bulkDelete = async () => {
    try {
      await fetch('/api/email-metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
          updates: { isDeleted: true },
        }),
      });

      await fetchEmails();
      setSelectedEmails(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  // Tag management
  const handleAddTag = async (emailId: string, tag: string) => {
    const metadata = emailMetadata[emailId];
    const currentTags = metadata?.tags || [];

    if (!currentTags.includes(tag)) {
      const email = emails.find(e => e.id === emailId);
      await updateEmailMetadata(emailId, {
        tags: [...currentTags, tag]
      }, email?.from);
    }
  };

  const handleRemoveTag = async (emailId: string, tag: string) => {
    const metadata = emailMetadata[emailId];
    const currentTags = metadata?.tags || [];
    const email = emails.find(e => e.id === emailId);

    await updateEmailMetadata(emailId, {
      tags: currentTags.filter(t => t !== tag)
    }, email?.from);
  };

  const openTagModal = (emailId: string) => {
    setTagModalEmailId(emailId);
    setShowTagModal(true);
  };

  // Filter, sort, search
  const filteredAndSortedEmails = useMemo(() => {
    let filtered = [...emails];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(email => {
        const metadata = emailMetadata[email.id];
        return (
          email.subject.toLowerCase().includes(query) ||
          email.from.toLowerCase().includes(query) ||
          metadata?.cachedSenderName?.toLowerCase().includes(query) ||
          email.to.some(t => t.toLowerCase().includes(query))
        );
      });
    }

    // Apply filters
    if (filterBy === 'unread') {
      filtered = filtered.filter(email => !emailMetadata[email.id]?.isRead);
    } else if (filterBy === 'favorites') {
      filtered = filtered.filter(email => emailMetadata[email.id]?.isFavorite);
    } else if (filterBy === 'attachments') {
      filtered = filtered.filter(email => email.attachments && email.attachments.length > 0);
    }

    // Apply tag filters
    if (filterTags.length > 0) {
      filtered = filtered.filter(email => {
        const metadata = emailMetadata[email.id];
        return metadata?.tags?.some(tag => filterTags.includes(tag));
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'sender') {
        const aName = emailMetadata[a.id]?.cachedSenderName || a.from;
        const bName = emailMetadata[b.id]?.cachedSenderName || b.from;
        comparison = aName.localeCompare(bName);
      } else if (sortBy === 'subject') {
        comparison = a.subject.localeCompare(b.subject);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [emails, emailMetadata, searchQuery, filterBy, filterTags, sortBy, sortOrder]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search, Filter, Sort Bar with Actions */}
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg flex-shrink-0 px-4 md:px-0 mb-4 ${
        isLight ? 'bg-white/30' : 'bg-neutral-900/30'
      }`}>
        {/* Search */}
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isLight ? 'text-slate-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all text-sm sm:text-base ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-gray-900 border-gray-600 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-gray-900 border-gray-600 text-gray-100'
            }`}
          >
            <option value="date">Date</option>
            <option value="sender">Sender</option>
            <option value="subject">Subject</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className={`p-2 rounded-lg transition-all ${
              isLight
                ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-gray-900 border border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>

        {/* Filter */}
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as any)}
          className={`px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm ${
            isLight
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-gray-900 border-gray-600 text-gray-100'
          }`}
        >
          <option value="all">All Emails</option>
          <option value="unread">Unread</option>
          <option value="favorites">Favorites</option>
          <option value="attachments">Has Attachments</option>
        </select>

        {/* Tag Filters - Hide on very small screens */}
        <div className="hidden sm:flex items-center gap-2">
          <Filter className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-gray-400'}`} />
          <div className="flex flex-wrap gap-1">
            {availableTags.slice(0, 4).map((tag) => {
              const isActive = filterTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (isActive) {
                      setFilterTags(filterTags.filter(t => t !== tag));
                    } else {
                      setFilterTags([...filterTags, tag]);
                    }
                  }}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? isLight
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : isLight
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={handleNewCompose}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Compose</span>
        </button>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm ${
            isLight
              ? 'text-slate-700 hover:bg-slate-100'
              : 'text-gray-300 hover:bg-gray-700'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedEmails.size > 0 && (
        <div className={`flex items-center justify-between p-4 rounded-lg flex-shrink-0 px-4 md:px-0 ${
          isLight
            ? 'bg-white/30'
            : 'bg-neutral-900/30'
        }`}>
          <span className={`text-sm font-medium ${isLight ? 'text-blue-900' : 'text-emerald-300'}`}>
            {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkMarkAsRead(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <MailOpen className="w-4 h-4" />
              Mark Read
            </button>
            <button
              onClick={() => bulkMarkAsRead(false)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLight
                  ? 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'
                  : 'bg-gray-800 border border-emerald-600 text-emerald-400 hover:bg-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              Mark Unread
            </button>
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isLight
                    ? 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'
                    : 'bg-gray-800 border border-emerald-600 text-emerald-400 hover:bg-gray-700'
                }`}
              >
                <Tags className="w-4 h-4" />
                Tag
                <ChevronDown className="w-3 h-3" />
              </button>
              {showBulkActions && (
                <div className={`absolute top-full mt-1 right-0 w-48 rounded-lg shadow-xl border z-10 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
                }`}>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        bulkAddTag(tag);
                        setShowBulkActions(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        isLight ? 'hover:bg-slate-100 text-slate-900' : 'hover:bg-gray-700 text-gray-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={bulkArchive}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLight
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={bulkDelete}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLight
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-red-400 hover:bg-red-900/20'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedEmails(new Set())}
              className={`p-1.5 rounded-lg transition-all ${
                isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Folder Tabs */}
      <div className={`flex items-center gap-2 border-b flex-shrink-0 px-4 md:px-0 ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
        {folders.map((folder) => {
          const Icon = folder.icon;
          const active = activeFolder === folder.id;

          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                active
                  ? isLight
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-emerald-500 text-emerald-400 font-semibold'
                  : `border-transparent ${
                      isLight
                        ? 'text-slate-600 hover:text-gray-900 hover:border-gray-300'
                        : 'text-gray-400 hover:text-white hover:border-gray-700'
                    }`
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{folder.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sent Subfolders */}
      {activeFolder === 'sent' && (
        <div className={`flex items-center gap-2 px-4 py-2 flex-shrink-0 ${isLight ? 'bg-white/30' : 'bg-neutral-900/30'}`}>
          {sentSubfolders.map((subfolder) => {
            const active = sentSubfolder === subfolder.id;

            return (
              <button
                key={subfolder.id}
                onClick={() => setSentSubfolder(subfolder.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  active
                    ? isLight
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-emerald-600 text-white font-medium'
                    : isLight
                      ? 'text-slate-600 hover:bg-slate-200'
                      : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                {subfolder.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`p-4 rounded-lg flex-shrink-0 px-4 md:px-0 ${
          isLight
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-red-900/20 border border-red-800 text-red-400'
        }`}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Email List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0">
      {loading && emails.length === 0 ? (
        <div className={`text-center py-12 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Loading emails...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className={`text-center py-12 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No emails found</p>
        </div>
      ) : (
        <div className={`rounded-lg ${isLight ? 'bg-white/30' : 'bg-neutral-900/30'}`}>
          {/* Select All Checkbox */}
          {filteredAndSortedEmails.length > 0 && (
            <div className={`px-6 py-3 border-b flex items-center gap-3 ${
              isLight ? 'border-slate-200/30' : 'border-gray-700/30'
            }`}>
              <input
                type="checkbox"
                checked={selectedEmails.size === filteredAndSortedEmails.length && filteredAndSortedEmails.length > 0}
                onChange={selectAllEmails}
                className="w-4 h-4 rounded"
              />
              <span className={`text-sm font-medium ${
                isLight ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Select All
              </span>
            </div>
          )}

          {filteredAndSortedEmails.map((email, index) => {
            const isExpanded = expandedEmailId === email.id;
            const metadata = emailMetadata[email.id];
            const isUnread = !metadata?.isRead;
            const isFavorited = metadata?.isFavorite;
            const isSelected = selectedEmails.has(email.id);

            return (
              <div key={email.id}>
                {/* Email Row */}
                <div
                  className={`${
                    isLight
                      ? 'hover:bg-slate-50 border-slate-200'
                      : 'hover:bg-gray-700/50 border-gray-700'
                  } ${index !== 0 ? 'border-t' : ''} ${isExpanded ? (isLight ? 'bg-slate-50' : 'bg-gray-700/30') : ''} ${isUnread ? (isLight ? 'bg-blue-50/30' : 'bg-emerald-900/10') : ''} ${isSelected ? (isLight ? 'bg-blue-100/50' : 'bg-emerald-900/30') : ''}`}
                >
                  {/* Collapsed View - Desktop */}
                  <div className="hidden md:flex w-full px-6 py-4 items-center gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEmailSelection(email.id)}
                      className="w-4 h-4 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Star/Favorite */}
                    <button
                      onClick={(e) => handleToggleFavorite(email.id, email, e)}
                      className="flex-shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 transition-all ${
                          isFavorited
                            ? 'fill-yellow-400 text-yellow-400'
                            : isLight
                              ? 'text-slate-400 hover:text-yellow-500'
                              : 'text-gray-500 hover:text-yellow-400'
                        }`}
                      />
                    </button>

                    {/* Profile Photo */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
                      isLight ? 'bg-slate-200' : 'bg-gray-700'
                    }`}>
                      {metadata?.cachedSenderPhoto ? (
                        <Image
                          src={metadata.cachedSenderPhoto}
                          alt={metadata.cachedSenderName || 'Sender'}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className={`w-5 h-5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                      )}
                    </div>

                    {/* From/Sender Name + Subject (double-line) */}
                    <button
                      onClick={() => toggleEmail(email.id, email)}
                      className="flex-1 flex items-center gap-4 text-left min-w-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${
                          isUnread ? 'font-bold' : 'font-semibold'
                        } ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          {metadata?.cachedSenderName ||
                           (email.from.includes('<')
                              ? email.from.split('<')[0].trim()
                              : email.from.split('@')[0])}
                        </p>
                        <p className={`text-xs truncate ${
                          isLight ? 'text-slate-600' : 'text-gray-400'
                        }`}>
                          {email.subject}
                        </p>
                      </div>

                      {/* Preview - Desktop only */}
                      <div className="flex-1 min-w-0">
                        {!isExpanded && (
                          <p className={`text-sm truncate ${
                            isUnread ? 'font-medium' : ''
                          } ${
                            isLight ? 'text-slate-600' : 'text-gray-400'
                          }`}>
                            {getEmailPreview(email)}
                          </p>
                        )}
                      </div>

                      {/* Attachment & Tags Indicators */}
                      <div className="flex items-center gap-2">
                        {metadata?.tags && metadata.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {metadata.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  isLight
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-emerald-900/30 text-emerald-400'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className={`w-4 h-4 flex-shrink-0 ${
                            isLight ? 'text-slate-400' : 'text-gray-500'
                          }`} />
                        )}
                      </div>

                      {/* Date */}
                      <div className={`w-20 flex-shrink-0 text-right text-xs ${
                        isLight ? 'text-slate-500' : 'text-gray-400'
                      }`}>
                        {formatDate(email.created_at)}
                      </div>

                      {/* Expand Icon */}
                      {isExpanded ? (
                        <ChevronUp className={`w-4 h-4 flex-shrink-0 ${
                          isLight ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 ${
                          isLight ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                      )}
                    </button>

                    {/* Mark as Read/Unread Button */}
                    <button
                      onClick={(e) => handleToggleRead(email.id, email, e)}
                      className={`flex-shrink-0 p-1.5 rounded hover:bg-opacity-10 ${
                        isLight ? 'hover:bg-slate-400' : 'hover:bg-gray-400'
                      }`}
                      title={isUnread ? 'Mark as read' : 'Mark as unread'}
                    >
                      <MailOpen className={`w-4 h-4 ${
                        isUnread
                          ? isLight ? 'text-blue-600' : 'text-emerald-500'
                          : isLight ? 'text-slate-400' : 'text-gray-500'
                      }`} />
                    </button>
                  </div>

                  {/* Collapsed View - Mobile (Optimized) */}
                  <button
                    onClick={() => toggleEmail(email.id, email)}
                    className="md:hidden w-full px-4 py-3 flex items-start gap-3 text-left"
                  >
                    {/* Profile Photo */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
                      isLight ? 'bg-slate-200' : 'bg-gray-700'
                    }`}>
                      {metadata?.cachedSenderPhoto ? (
                        <Image
                          src={metadata.cachedSenderPhoto}
                          alt={metadata.cachedSenderName || 'Sender'}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className={`w-5 h-5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                      )}
                    </div>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                      {/* Sender Name & Date */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm truncate ${
                          isUnread ? 'font-bold' : 'font-semibold'
                        } ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          {metadata?.cachedSenderName ||
                           (email.from.includes('<')
                              ? email.from.split('<')[0].trim()
                              : email.from.split('@')[0])}
                        </p>
                        <span className={`text-xs flex-shrink-0 ${
                          isLight ? 'text-slate-500' : 'text-gray-400'
                        }`}>
                          {formatDate(email.created_at)}
                        </span>
                      </div>

                      {/* Subject */}
                      <p className={`text-sm truncate mb-1 ${
                        isUnread ? 'font-semibold' : ''
                      } ${
                        isLight ? 'text-slate-700' : 'text-gray-300'
                      }`}>
                        {email.subject}
                      </p>

                      {/* Icons (attachment, tags, star) */}
                      <div className="flex items-center gap-2">
                        {isFavorited && (
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className={`w-3.5 h-3.5 ${
                            isLight ? 'text-slate-400' : 'text-gray-500'
                          }`} />
                        )}
                        {metadata?.tags && metadata.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {metadata.tags.slice(0, 1).map((tag) => (
                              <span
                                key={tag}
                                className={`px-1.5 py-0.5 rounded-full text-xs ${
                                  isLight
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-emerald-900/30 text-emerald-400'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {isUnread && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                        isLight ? 'bg-blue-600' : 'bg-emerald-500'
                      }`} />
                    )}
                  </button>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className={`px-6 pb-6 border-t ${
                      isLight ? 'border-slate-200' : 'border-gray-700'
                    }`}>
                      {/* Loading State */}
                      {loadingEmail === email.id ? (
                        <div className="py-8 text-center">
                          <RefreshCw className={`w-6 h-6 animate-spin mx-auto mb-2 ${
                            isLight ? 'text-blue-600' : 'text-emerald-500'
                          }`} />
                          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                            Loading email content...
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Email Header Details */}
                          <div className="mt-4 mb-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className={`text-sm font-semibold w-16 flex-shrink-0 ${
                                isLight ? 'text-slate-500' : 'text-gray-400'
                              }`}>
                                From:
                              </span>
                              <span className={`text-sm ${
                                isLight ? 'text-slate-900' : 'text-gray-200'
                              }`}>
                                {expandedEmailContent[email.id]?.from || email.from}
                              </span>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className={`text-sm font-semibold w-16 flex-shrink-0 ${
                                isLight ? 'text-slate-500' : 'text-gray-400'
                              }`}>
                                To:
                              </span>
                              <span className={`text-sm ${
                                isLight ? 'text-slate-900' : 'text-gray-200'
                              }`}>
                                {(expandedEmailContent[email.id]?.to || email.to).join(', ')}
                              </span>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className={`text-sm font-semibold w-16 flex-shrink-0 ${
                                isLight ? 'text-slate-500' : 'text-gray-400'
                              }`}>
                                Date:
                              </span>
                              <span className={`text-sm ${
                                isLight ? 'text-slate-900' : 'text-gray-200'
                              }`}>
                                {formatFullDate(email.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Attachments */}
                          {(expandedEmailContent[email.id]?.attachments || email.attachments) &&
                           (expandedEmailContent[email.id]?.attachments || email.attachments)!.length > 0 && (
                            <div className="mb-4">
                              <p className={`text-sm font-semibold mb-2 ${
                                isLight ? 'text-slate-700' : 'text-gray-300'
                              }`}>
                                Attachments ({(expandedEmailContent[email.id]?.attachments || email.attachments)!.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(expandedEmailContent[email.id]?.attachments || email.attachments)!.map((attachment, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                      isLight ? 'bg-slate-100 border border-slate-200' : 'bg-gray-700 border border-gray-600'
                                    }`}
                                  >
                                    <Paperclip className="w-4 h-4" />
                                    <span className="text-sm">{attachment.filename}</span>
                                    <span className={`text-xs ${
                                      isLight ? 'text-slate-500' : 'text-gray-400'
                                    }`}>
                                      ({(attachment.size / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Email Body */}
                          <div className={`mt-4 p-4 rounded-lg ${
                            isLight ? 'bg-white/30' : 'bg-neutral-900/30'
                          }`}>
                            {(() => {
                              const fullEmail = expandedEmailContent[email.id];

                              // Check for error first
                              if (fullEmail?.error) {
                                return (
                                  <div className={`p-4 rounded-lg ${
                                    isLight
                                      ? 'bg-red-50 border border-red-200'
                                      : 'bg-red-900/20 border border-red-800'
                                  }`}>
                                    <div className="flex items-start gap-3 mb-3">
                                      <AlertOctagon className={`w-5 h-5 flex-shrink-0 ${
                                        isLight ? 'text-red-600' : 'text-red-400'
                                      }`} />
                                      <div className="flex-1">
                                        <p className={`font-semibold mb-2 ${
                                          isLight ? 'text-red-800' : 'text-red-300'
                                        }`}>
                                          {fullEmail.error}
                                        </p>
                                        {fullEmail.statusCode && (
                                          <p className={`text-sm mb-2 ${
                                            isLight ? 'text-red-700' : 'text-red-400'
                                          }`}>
                                            Status Code: {fullEmail.statusCode}
                                          </p>
                                        )}
                                        {fullEmail.errorDetails && (
                                          <details className="mt-2">
                                            <summary className={`text-sm font-medium cursor-pointer ${
                                              isLight ? 'text-red-700' : 'text-red-400'
                                            }`}>
                                              Error Details
                                            </summary>
                                            <pre className={`mt-2 p-3 rounded text-xs overflow-auto ${
                                              isLight ? 'bg-red-100 text-red-900' : 'bg-red-950/50 text-red-200'
                                            }`}>
                                              {typeof fullEmail.errorDetails === 'string'
                                                ? fullEmail.errorDetails
                                                : JSON.stringify(fullEmail.errorDetails, null, 2)}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const emailHtml = fullEmail?.html || email.html;
                              const emailText = fullEmail?.text || email.text;

                              if (emailHtml) {
                                // Clean HTML for sent emails only to remove template wrapper
                                const displayHtml = activeFolder === 'sent'
                                  ? cleanSentEmailHtml(emailHtml)
                                  : emailHtml;

                                return (
                                  <div
                                    className={`prose prose-sm max-w-none ${
                                      isLight ? 'prose-slate' : 'prose-invert'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                                  />
                                );
                              } else if (emailText) {
                                return (
                                  <p className={`whitespace-pre-wrap text-sm ${
                                    isLight ? 'text-slate-700' : 'text-gray-300'
                                  }`}>
                                    {emailText}
                                  </p>
                                );
                              } else {
                                return (
                                  <p className={`text-sm italic ${
                                    isLight ? 'text-slate-500' : 'text-gray-500'
                                  }`}>
                                    No content available
                                  </p>
                                );
                              }
                            })()}
                          </div>
                        </>
                      )}

                      {/* Tags Section */}
                      {metadata?.tags && metadata.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Tag className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-gray-400'}`} />
                          {metadata.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                isLight
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-900/30 text-emerald-400'
                              }`}
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(email.id, tag)}
                                className="hover:opacity-70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => handleReply(email)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isLight
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <Mail className="w-4 h-4" />
                          Reply
                        </button>
                        <button
                          onClick={() => handleForward(email)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isLight
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                          }`}
                        >
                          <Forward className="w-4 h-4" />
                          Forward
                        </button>
                        <button
                          onClick={() => openTagModal(email.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isLight
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                          }`}
                        >
                          <Tags className="w-4 h-4" />
                          Tags
                        </button>
                        <button
                          onClick={() => updateEmailMetadata(email.id, { isArchived: true }, email.from)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isLight
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                        <button
                          onClick={() => updateEmailMetadata(email.id, { isDeleted: true }, email.from)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isLight
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-red-400 hover:bg-red-900/20'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Tag Management Modal */}
      {showTagModal && tagModalEmailId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${isLight ? 'bg-white/30 backdrop-blur-md' : 'bg-neutral-900/30 backdrop-blur-md'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              isLight ? 'border-slate-200' : 'border-gray-700'
            }`}>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Manage Tags
              </h3>
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setTagModalEmailId(null);
                  setNewTagInput('');
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-gray-700 text-gray-400'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Tags */}
              {emailMetadata[tagModalEmailId]?.tags && emailMetadata[tagModalEmailId].tags.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    Current Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {emailMetadata[tagModalEmailId].tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                          isLight
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-900/30 text-emerald-400'
                        }`}
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tagModalEmailId, tag)}
                          className="hover:opacity-70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Tag */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isLight ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  Add Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTagInput.trim()) {
                        handleAddTag(tagModalEmailId, newTagInput.trim().toLowerCase());
                        setNewTagInput('');
                      }
                    }}
                    placeholder="Type a tag name..."
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        : 'bg-gray-900 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (newTagInput.trim()) {
                        handleAddTag(tagModalEmailId, newTagInput.trim().toLowerCase());
                        setNewTagInput('');
                      }
                    }}
                    disabled={!newTagInput.trim()}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      newTagInput.trim()
                        ? isLight
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500'
                    }`}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Preset Tags */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isLight ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  Quick Add
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags
                    .filter(tag => !emailMetadata[tagModalEmailId]?.tags?.includes(tag))
                    .map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tagModalEmailId, tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isLight
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Email Panel */}
      {showComposePanel && (
        <ComposePanel
          isLight={isLight}
          onClose={handleCloseCompose}
          onSend={() => {
            fetchEmails(); // Refresh emails after sending
          }}
          replyTo={replyToEmail}
          forwardEmail={forwardEmail}
        />
      )}
    </div>
  );
}
