'use client';

/**
 * SMS Messages Page
 *
 * Conversation-based inbox for SMS messaging via Twilio
 * Shows conversation threads on left, full conversation on right
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Phone,
  User,
  Check,
  CheckCheck,
  AlertCircle,
  Search,
  X,
  Users,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
} from 'lucide-react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import AgentNav from '@/app/components/AgentNav';

// Types
interface SMSMessage {
  _id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
}

interface Conversation {
  phoneNumber: string;
  contactId?: string;
  contactName?: string | null;
  contactInfo?: {
    firstName: string;
    lastName: string;
    email?: string;
    status?: string;
    tags?: string[];
    smsOptIn: boolean;
  } | null;
  lastMessage: {
    _id: string;
    body: string;
    direction: 'inbound' | 'outbound';
    status: string;
    createdAt: string;
  };
  messageCount: number;
  unreadCount: number;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status?: string;
  tags?: string[];
  preferences?: {
    smsOptIn: boolean;
  };
}

export default function MessagesPage() {
  // Theme
  const { currentTheme } = useTheme();
  const { border, cardBg, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Messages
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list'); // Mobile navigation state

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Opt-in template
  const OPT_IN_TEMPLATE = `Hey this is Joseph Sardella, Your trusted real estate agent! Type "OPT IN" to receive text alerts from me, features like updates on new listings that come on the market, nearby open houses, and much more. Type "STOP" to stop getting messages.`;

  // Fetch functions (memoized to prevent re-creation)
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/sms/conversations');
      const data = await response.json();

      if (data.success) {
        // Only update if conversations actually changed
        setConversations(prev => {
          const prevJson = JSON.stringify(prev);
          const newJson = JSON.stringify(data.conversations);
          return prevJson === newJson ? prev : data.conversations;
        });
      }
    } catch (error) {
      console.error('[Messages] Fetch conversations error:', error);
    }
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/crm/contacts?limit=1000');
      const data = await response.json();

      if (data.success) {
        // Show all contacts with phone numbers
        const phoneContacts = data.contacts.filter((c: Contact) => c.phone);
        setContacts(phoneContacts);
      }
    } catch (error) {
      console.error('[Messages] Fetch contacts error:', error);
    }
  };

  const fetchMessages = useCallback(async (phoneNumber: string, contactId?: string) => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (contactId) {
        params.append('contactId', contactId);
      } else {
        params.append('phoneNumber', phoneNumber);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/crm/sms/messages?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.messages) {
        // Sort by createdAt ascending (oldest first)
        const sortedMessages = [...data.messages].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Only update if messages actually changed
        setMessages(prev => {
          const prevJson = JSON.stringify(prev);
          const newJson = JSON.stringify(sortedMessages);
          if (prevJson === newJson) return prev;
          console.log('[Messages] Loaded', sortedMessages.length, 'messages from database');
          return sortedMessages;
        });
      }
    } catch (error) {
      console.error('[Messages] Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncTwilioMessages = useCallback(async (phoneNumber: string, contactId?: string) => {
    try {
      setSyncing(true);

      const response = await fetch('/api/crm/sms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          contactId,
        }),
      });

      const data = await response.json();

      if (data.success && data.messages) {
        // Sort by createdAt ascending (oldest first)
        const sortedMessages = [...data.messages].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Only update if messages actually changed
        setMessages(prev => {
          const prevJson = JSON.stringify(prev);
          const newJson = JSON.stringify(sortedMessages);
          if (prevJson === newJson) return prev;
          console.log('[Messages] Synced', data.syncedCount, 'new messages from Twilio');
          return sortedMessages;
        });
      }
    } catch (error) {
      console.error('[Messages] Sync error:', error);
    } finally {
      setSyncing(false);
    }
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !messageBody.trim()) return;

    setSending(true);

    try {
      const response = await fetch('/api/crm/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.phoneNumber,
          body: messageBody,
          contactId: selectedConversation.contactId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessageBody('');
        // Refresh messages and conversations
        fetchMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
        fetchConversations();
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('[Messages] Send error:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendOptInRequest = async (phoneNumber: string, contactId?: string) => {
    try {
      setSending(true);

      const response = await fetch('/api/crm/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          body: OPT_IN_TEMPLATE,
          contactId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Opt-in request sent successfully!');
        // Refresh messages if currently viewing this conversation
        if (selectedConversation?.phoneNumber === phoneNumber) {
          fetchMessages(phoneNumber, contactId);
        }
        fetchConversations();
      } else {
        alert(data.error || 'Failed to send opt-in request');
      }
    } catch (error) {
      console.error('[Messages] Opt-in error:', error);
      alert('Failed to send opt-in request');
    } finally {
      setSending(false);
    }
  };

  // Handle conversation selection with mobile view switching
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMobileView('thread'); // Switch to thread view on mobile
  };

  // Handle back to conversation list
  const handleBackToList = () => {
    setMobileView('list');
  };

  const startNewConversation = (contact: Contact) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.phoneNumber === contact.phone);

    if (existing) {
      handleSelectConversation(existing); // Use new handler
    } else {
      // Create new conversation object
      const newConv: Conversation = {
        phoneNumber: contact.phone,
        contactId: contact._id,
        contactName: `${contact.firstName} ${contact.lastName}`,
        contactInfo: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          status: contact.status,
          tags: contact.tags,
          smsOptIn: contact.preferences?.smsOptIn || false,
        },
        lastMessage: {
          _id: '',
          body: '',
          direction: 'outbound',
          status: '',
          createdAt: new Date().toISOString(),
        },
        messageCount: 0,
        unreadCount: 0,
      };

      handleSelectConversation(newConv);
      setMessages([]);
    }

    setShowContactsModal(false);
  };

  const applyFilters = useCallback(() => {
    let filtered = [...conversations];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.contactName?.toLowerCase().includes(query) ||
        conv.phoneNumber.includes(query) ||
        conv.lastMessage.body.toLowerCase().includes(query)
      );
    }

    setFilteredConversations(filtered);
  }, [conversations, searchQuery]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, [fetchConversations]);

  // Apply search filter
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      // Clear messages first for immediate feedback
      setMessages([]);
      // First fetch from database (fast)
      fetchMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
      // Then sync from Twilio in background (slower, but gets any new messages)
      setTimeout(() => {
        syncTwilioMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
      }, 500);
    } else {
      // Clear messages when no conversation selected
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages, syncTwilioMessages]);

  // Auto-scroll to bottom (only when message count changes)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!selectedConversation) return;

    const pollInterval = setInterval(() => {
      // Use fetchMessages for fast polling, sync from Twilio less frequently
      fetchMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedConversation, fetchMessages]);

  // Poll for new conversations every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const filteredContactList = contacts.filter(contact => {
    const query = contactSearch.toLowerCase();
    return (
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(query) ||
      contact.phone.includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Agent Navigation */}
        <AgentNav />

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Messages
              </h1>
              <p className={`text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                SMS conversations via Twilio
              </p>
            </div>
            {/* Desktop Contacts Button */}
            <button
              onClick={() => setShowContactsModal(true)}
              className={`hidden sm:flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all text-sm sm:text-base ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Contacts
            </button>
          </div>
        </div>

        {/* Mobile Floating Contacts Button */}
        <button
          onClick={() => setShowContactsModal(true)}
          className={`sm:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
          aria-label="Open Contacts"
        >
          <Users className="w-6 h-6" />
        </button>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">

          {/* Conversation List */}
          <div className={`col-span-12 md:col-span-4 ${cardBg} rounded-xl shadow-lg border ${border} flex flex-col overflow-hidden ${
            mobileView === 'list' ? 'block' : 'hidden md:flex'
          }`}>
            {/* Search */}
            <div className={`p-4 border-b ${border}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className={`w-full pl-10 pr-3 py-2 rounded-lg border ${border} ${cardBg} ${textPrimary} placeholder-gray-500 text-sm focus:ring-2 ${
                    isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full ${textSecondary} px-4`}>
                  <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm text-center">No conversations yet</p>
                  <p className="text-xs text-center mt-1">Click "Contacts" to start messaging</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.phoneNumber}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-4 border-b ${border} transition-colors ${
                      selectedConversation?.phoneNumber === conv.phoneNumber
                        ? isLight
                          ? 'bg-blue-50'
                          : 'bg-blue-900/20'
                        : isLight
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        conv.contactInfo?.smsOptIn
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      }`}>
                        <User className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-semibold ${textPrimary} truncate`}>
                            {conv.contactName || conv.phoneNumber}
                          </p>
                          <span className={`text-xs ${textSecondary} ml-2`}>
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        </div>

                        <p className={`text-sm ${textSecondary} truncate`}>
                          {conv.lastMessage.direction === 'outbound' && 'You: '}
                          {conv.lastMessage.body}
                        </p>

                        {/* Opt-in status */}
                        {!conv.contactInfo?.smsOptIn && conv.contactName && (
                          <span className={`inline-flex items-center gap-1 mt-1 text-xs ${
                            isLight ? 'text-amber-600' : 'text-amber-400'
                          }`}>
                            <AlertCircle className="w-3 h-3" />
                            No opt-in
                          </span>
                        )}
                      </div>

                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${
                          isLight ? 'bg-blue-600' : 'bg-emerald-600'
                        }`}>
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation View */}
          <div className={`col-span-12 md:col-span-8 ${cardBg} rounded-xl shadow-lg border ${border} flex flex-col overflow-hidden ${
            mobileView === 'thread' ? 'block' : 'hidden md:flex'
          }`}>
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className={`p-4 border-b ${border} ${
                  isLight ? 'bg-gray-50' : 'bg-gray-900/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Mobile Back Button */}
                      <button
                        onClick={handleBackToList}
                        className={`md:hidden p-2 rounded-lg transition-colors ${
                          isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-700'
                        }`}
                        aria-label="Back to conversations"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                        selectedConversation.contactInfo?.smsOptIn
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-bold ${textPrimary}`}>
                          {selectedConversation.contactName || 'Unknown Contact'}
                        </h3>
                        <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
                          <Phone className="w-3 h-3" />
                          {selectedConversation.phoneNumber}
                          {selectedConversation.contactInfo?.smsOptIn ? (
                            <span className={`inline-flex items-center gap-1 ${
                              isLight ? 'text-green-600' : 'text-green-400'
                            }`}>
                              <CheckCircle className="w-3 h-3" />
                              Opted in
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 ${
                              isLight ? 'text-amber-600' : 'text-amber-400'
                            }`}>
                              <XCircle className="w-3 h-3" />
                              No opt-in
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Opt-in request button */}
                    {!selectedConversation.contactInfo?.smsOptIn && (
                      <button
                        onClick={() => sendOptInRequest(selectedConversation.phoneNumber, selectedConversation.contactId)}
                        disabled={sending}
                        className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        Send Opt-in Request
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto p-4 ${
                  isLight ? 'bg-gray-50' : 'bg-gray-900/30'
                }`}>
                  {loading ? (
                    <div className={`flex flex-col items-center justify-center h-full ${textSecondary}`}>
                      <div className={`w-8 h-8 border-3 rounded-full animate-spin mb-3 ${
                        isLight
                          ? 'border-blue-500/30 border-t-blue-500'
                          : 'border-emerald-500/30 border-t-emerald-500'
                      }`}></div>
                      <p className="font-medium">{syncing ? 'Syncing from Twilio...' : 'Loading...'}</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-full ${textSecondary}`}>
                      <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Send your first message below</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOutbound = message.direction === 'outbound';
                        return (
                          <div
                            key={message._id}
                            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOutbound ? 'text-right' : 'text-left'}`}>
                              <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                                isOutbound
                                  ? isLight
                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                    : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
                                  : `${cardBg} border ${border} ${textPrimary}`
                              }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {message.body}
                                </p>
                              </div>

                              <div className={`flex items-center gap-1.5 mt-1 px-1 text-[11px] text-gray-500 ${
                                isOutbound ? 'justify-end' : 'justify-start'
                              }`}>
                                <span>
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isOutbound && (
                                  <>
                                    {message.status === 'delivered' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                    ) : message.status === 'sent' ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : message.status === 'failed' ? (
                                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5" />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className={`p-4 border-t ${border} ${cardBg}`}>
                  <div className="flex gap-3">
                    <textarea
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder="Type your message... (Shift+Enter for new line)"
                      rows={2}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 ${border} ${cardBg} ${textPrimary} placeholder-gray-500 resize-none focus:ring-2 ${
                        isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                      } text-sm`}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageBody.trim()}
                      className={`px-6 py-3 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        isLight
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
                      }`}
                    >
                      {sending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Send</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1.5 px-1">
                    <span>
                      {messageBody.length}/160 characters
                      {messageBody.length > 160 && ` (${Math.ceil(messageBody.length / 160)} segments)`}
                    </span>
                    <span>Press Enter to send</span>
                  </div>
                </form>
              </>
            ) : (
              <div className={`flex-1 flex items-center justify-center ${textSecondary}`}>
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className={`text-lg font-medium ${textPrimary}`}>Select a conversation</p>
                  <p className="text-sm mt-1">Choose a conversation from the list or start a new one</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Contacts Modal */}
      {showContactsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Select Contact
                </h2>
                <button
                  onClick={() => setShowContactsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredContactList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No contacts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContactList.map((contact) => (
                    <button
                      key={contact._id}
                      onClick={() => startNewConversation(contact)}
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
      )}
    </div>
  );
}
