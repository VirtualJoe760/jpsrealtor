'use client';

/**
 * SMS Messages Page
 * Refactored - Main orchestration component
 */

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Users } from 'lucide-react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { useSocket } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';
import ServiceWorkerRegistration from '@/app/components/ServiceWorkerRegistration';
import PushNotificationPrompt, { PushNotificationStatus } from '@/app/components/PushNotificationPrompt';
import AgentNav from '@/app/components/AgentNav';

// Hooks
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useContacts } from './hooks/useContacts';

// Components
import ConversationList from '@/components/crm/messages/ConversationList';
import MessageThread from '@/components/crm/messages/MessageThread';
import ContactsModal from '@/components/crm/messages/ContactsModal';
import ContactEditModal from '@/components/crm/messages/ContactEditModal';
import ComposeView from '@/components/crm/messages/ComposeView';

// Types
import { Conversation, Contact, MobileView } from './types';

// Utils
import { playNotificationSound, showBrowserNotification } from './utils/messageUtils';
import { createNewConversation, findExistingConversation } from './utils/conversationUtils';

export default function MessagesPage() {
  // Session and WebSocket
  const { data: session } = useSession();
  const { socket, connected } = useSocket(session?.user?.id);

  // Theme
  const { currentTheme } = useTheme();
  const { border, cardBg, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  // Custom Hooks
  const { conversations, filteredConversations, searchQuery, setSearchQuery, fetchConversations } = useConversations();
  const { contacts, contactSearch, setContactSearch, filteredContacts, fetchContacts } = useContacts();

  // UI State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showComposeView, setShowComposeView] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  // Messages hook
  const {
    messages,
    setMessages,
    loading,
    syncing,
    sending,
    fetchMessages,
    syncTwilioMessages,
    sendMessage,
    sendOptInRequest,
  } = useMessages(selectedConversation, fetchConversations);

  // Fetch data on mount
  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, [fetchConversations, fetchContacts]);

  // Fetch and sync messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
      setTimeout(() => {
        syncTwilioMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
      }, 500);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages, syncTwilioMessages, setMessages]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // WebSocket: Listen for real-time updates
  useEffect(() => {
    if (!socket || !connected) return;

    console.log('[Messages] Setting up WebSocket listeners');

    socket.on('message:new', (message: any) => {
      console.log('[Messages] 🎉 RECEIVED NEW MESSAGE VIA WEBSOCKET!');
      console.log('[Messages] Message ID:', message._id);
      console.log('[Messages] Message data:', message);
      console.log('[Messages] Current messages count before:', messages.length);

      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) {
          console.log('[Messages] ⚠️ Message already exists, skipping');
          return prev;
        }

        if (message.direction === 'inbound') {
          console.log('[Messages] Playing notification sound and showing browser notification');
          playNotificationSound();
          showBrowserNotification(message, conversations);
        }

        console.log('[Messages] ✅ Adding message to state');
        return [...prev, message];
      });
      fetchConversations();
    });

    socket.on('message:status', ({ messageId, status }: { messageId: string, status: string }) => {
      console.log('[Messages] Status update via WebSocket:', messageId, status);
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, status } : m
      ));
    });

    socket.on('conversation:update', () => {
      console.log('[Messages] Conversation update via WebSocket');
      fetchConversations();
    });

    return () => {
      console.log('[Messages] Cleaning up WebSocket listeners');
      socket.off('message:new');
      socket.off('message:status');
      socket.off('conversation:update');
    };
  }, [socket, connected, fetchConversations, conversations, setMessages]);

  // Handlers
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMobileView('thread');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const startNewConversation = (contact: Contact) => {
    const existing = findExistingConversation(contact.phone, conversations);

    if (existing) {
      handleSelectConversation(existing);
    } else {
      const newConv = createNewConversation(contact);
      handleSelectConversation(newConv);
      setMessages([]);
    }
  };

  const handleSendOptIn = () => {
    if (selectedConversation) {
      sendOptInRequest(selectedConversation.phoneNumber, selectedConversation.contactId);
    }
  };

  const handleEditContact = () => {
    setShowEditContactModal(true);
  };

  const handleSaveContact = (updatedContact: any) => {
    // Refresh conversations to get updated contact info
    fetchConversations();

    // Update selected conversation with new contact info
    if (selectedConversation) {
      setSelectedConversation({
        ...selectedConversation,
        contactId: updatedContact._id,
        contactName: `${updatedContact.firstName} ${updatedContact.lastName}`,
        contactInfo: {
          firstName: updatedContact.firstName,
          lastName: updatedContact.lastName,
          email: updatedContact.email,
          status: updatedContact.status,
          tags: updatedContact.tags,
          smsOptIn: updatedContact.preferences?.smsOptIn || false,
        },
      });
    }
  };

  const handleOpenCompose = () => {
    setShowComposeView(true);
    setMobileView('thread');
  };

  const handleCloseCompose = () => {
    setShowComposeView(false);
    setMobileView('list');
  };

  const handleComposeMessage = async (recipients: Contact[], message: string) => {
    // Send message to each recipient
    for (const recipient of recipients) {
      try {
        await fetch('/api/crm/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipient.phone,
            message: message,
            contactId: recipient._id || undefined,
          }),
        });
      } catch (error) {
        console.error(`[Messages] Error sending to ${recipient.phone}:`, error);
      }
    }

    // Close compose view and refresh conversations
    handleCloseCompose();
    fetchConversations();

    // If only one recipient, open that conversation
    if (recipients.length === 1) {
      const recipient = recipients[0];
      const existing = findExistingConversation(recipient.phone, conversations);
      if (existing) {
        handleSelectConversation(existing);
      } else {
        const newConv = createNewConversation(recipient);
        handleSelectConversation(newConv);
      }
    }
  };

  return (
    <>
      <ServiceWorkerRegistration />

      <div className="fixed inset-0 md:relative md:inset-auto md:h-screen flex flex-col md:p-4 md:py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0">
          <div className="flex-shrink-0">
            <AgentNav />

            {session?.user?.id && (
              <div className="px-4 md:px-0 space-y-2">
                <PushNotificationPrompt userId={session.user.id} />
                <PushNotificationStatus userId={session.user.id} />
              </div>
            )}
          </div>

          {/* Header - Hidden on mobile when viewing thread */}
          <div className={`${mobileView === 'thread' ? 'hidden' : 'flex'} md:flex px-4 md:px-0 mb-3 items-center justify-between gap-3 flex-shrink-0`}>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-2xl sm:text-3xl font-bold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Messages
              </h1>
              {connected ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                  <Wifi className="w-3 h-3" />
                  <span className="hidden sm:inline">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Connecting...</span>
                </div>
              )}
            </div>
            <button
              onClick={handleOpenCompose}
              className={`hidden sm:flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all shadow-lg ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>New Message</span>
            </button>
          </div>

          {/* Main grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 md:gap-4 md:gap-6 flex-1 overflow-hidden bg-transparent">
            <ConversationList
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              contacts={contacts}
              onNewConversation={handleOpenCompose}
              mobileView={mobileView}
              isLight={isLight}
              border={border}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            {showComposeView ? (
              <ComposeView
                contacts={contacts}
                onBack={handleCloseCompose}
                onSendMessage={handleComposeMessage}
                isLight={isLight}
                border={border}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            ) : (
              <MessageThread
                conversation={selectedConversation}
                messages={messages}
                loading={loading}
                syncing={syncing}
                sending={sending}
                onSendMessage={sendMessage}
                onSendOptIn={handleSendOptIn}
                onEditContact={handleEditContact}
                onBack={handleBackToList}
                mobileView={mobileView}
                isLight={isLight}
                border={border}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            )}
          </div>
        </div>
      </div>

      <ContactsModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={filteredContacts}
        searchQuery={contactSearch}
        onSearchChange={setContactSearch}
        onSelectContact={(contact) => {
          startNewConversation(contact);
          setShowContactsModal(false);
        }}
      />

      {selectedConversation && (
        <ContactEditModal
          isOpen={showEditContactModal}
          onClose={() => setShowEditContactModal(false)}
          conversation={selectedConversation}
          onSave={handleSaveContact}
          isLight={isLight}
        />
      )}
    </>
  );
}
