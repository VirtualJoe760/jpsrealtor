'use client';

import { useState, useEffect } from 'react';
import { Mail, Paperclip, ChevronDown, ChevronUp, RefreshCw, Star, Archive, Trash2, Plus, Inbox, Send, AlertOctagon, Building2, TrendingUp } from 'lucide-react';
import ComposePanel from './ComposePanel';

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
}

interface EmailInboxProps {
  isLight: boolean;
}

type FolderType = 'inbox' | 'sent';
type SentSubfolder = 'all' | 'transactional' | 'marketing';

export default function EmailInbox({ isLight }: EmailInboxProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(50);
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [sentSubfolder, setSentSubfolder] = useState<SentSubfolder>('all');

  // Compose panel state
  const [showComposePanel, setShowComposePanel] = useState(false);

  const folders = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox },
    { id: 'sent' as const, label: 'Sent', icon: Send },
  ];

  const sentSubfolders = [
    { id: 'all' as const, label: 'All Sent' },
    { id: 'transactional' as const, label: 'Transactional', domain: 'jpsrealtor.com' },
    { id: 'marketing' as const, label: 'Marketing', domain: 'josephsardella.com' },
  ];

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
        setEmails(data.data || []);
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

  const toggleEmail = (emailId: string) => {
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Email
          </h2>
          <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            {emails.length} {emails.length === 1 ? 'email' : 'emails'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowComposePanel(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Compose</span>
          </button>
          <button
            onClick={fetchEmails}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isLight
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-gray-300 hover:bg-gray-700'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className={`flex items-center gap-2 border-b ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
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
        <div className={`flex items-center gap-2 px-4 py-2 ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
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
        <div className={`p-4 rounded-lg ${
          isLight
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-red-900/20 border border-red-800 text-red-400'
        }`}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Email List */}
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
        <div className={`rounded-lg border ${isLight ? 'border-slate-200 bg-white' : 'border-gray-700 bg-gray-800'}`}>
          {emails.map((email, index) => {
            const isExpanded = expandedEmailId === email.id;

            return (
              <div key={email.id}>
                {/* Email Row */}
                <div
                  className={`${
                    isLight
                      ? 'hover:bg-slate-50 border-slate-200'
                      : 'hover:bg-gray-700/50 border-gray-700'
                  } ${index !== 0 ? 'border-t' : ''} ${isExpanded ? (isLight ? 'bg-slate-50' : 'bg-gray-700/30') : ''}`}
                >
                  {/* Collapsed View */}
                  <button
                    onClick={() => toggleEmail(email.id)}
                    className="w-full px-6 py-4 flex items-center gap-4 text-left transition-colors"
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Star */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add star logic here
                      }}
                      className={`cursor-pointer ${isLight ? 'text-slate-400 hover:text-yellow-500' : 'text-gray-500 hover:text-yellow-400'}`}
                    >
                      <Star className="w-4 h-4" />
                    </span>

                    {/* From */}
                    <div className="w-48 flex-shrink-0">
                      <p className={`text-sm font-semibold truncate ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {email.from.includes('<')
                          ? email.from.split('<')[0].trim()
                          : email.from.split('@')[0]}
                      </p>
                    </div>

                    {/* Subject + Preview */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        isLight ? 'text-slate-900' : 'text-gray-200'
                      }`}>
                        <span className="font-semibold">{email.subject}</span>
                        {!isExpanded && (
                          <span className={isLight ? 'text-slate-600 ml-2' : 'text-gray-400 ml-2'}>
                            - {getEmailPreview(email)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Attachment Indicator */}
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip className={`w-4 h-4 flex-shrink-0 ${
                        isLight ? 'text-slate-400' : 'text-gray-500'
                      }`} />
                    )}

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

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className={`px-6 pb-6 border-t ${
                      isLight ? 'border-slate-200' : 'border-gray-700'
                    }`}>
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
                            {email.from}
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
                            {email.to.join(', ')}
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
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mb-4">
                          <p className={`text-sm font-semibold mb-2 ${
                            isLight ? 'text-slate-700' : 'text-gray-300'
                          }`}>
                            Attachments ({email.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {email.attachments.map((attachment, i) => (
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
                        isLight ? 'bg-white border border-slate-200' : 'bg-gray-800 border border-gray-700'
                      }`}>
                        {email.html ? (
                          <div
                            className={`prose prose-sm max-w-none ${
                              isLight ? 'prose-slate' : 'prose-invert'
                            }`}
                            dangerouslySetInnerHTML={{ __html: email.html }}
                          />
                        ) : (
                          <p className={`whitespace-pre-wrap text-sm ${
                            isLight ? 'text-slate-700' : 'text-gray-300'
                          }`}>
                            {email.text || 'No content'}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4">
                        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isLight
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}>
                          <Mail className="w-4 h-4" />
                          Reply
                        </button>
                        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isLight
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}>
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isLight
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-red-400 hover:bg-red-900/20'
                        }`}>
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

      {/* Compose Email Panel */}
      {showComposePanel && (
        <ComposePanel
          isLight={isLight}
          onClose={() => setShowComposePanel(false)}
          onSend={() => {
            fetchEmails(); // Refresh emails after sending
          }}
        />
      )}
    </div>
  );
}
