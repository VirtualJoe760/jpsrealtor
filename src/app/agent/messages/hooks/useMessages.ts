/**
 * Hook for managing messages state and operations
 */

import { useState, useCallback } from 'react';
import { SMSMessage, Conversation } from '../types';
import { OPT_IN_TEMPLATE } from '../utils/messageUtils';

export function useMessages(
  selectedConversation: Conversation | null,
  fetchConversations: () => Promise<void>
) {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async (phoneNumber: string, contactId?: string) => {
    try {
      setLoading(true);

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
        const sortedMessages = [...data.messages].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

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
        const sortedMessages = [...data.messages].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

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

  const sendMessage = async (messageBody: string) => {
    if (!selectedConversation || !messageBody.trim()) return;

    const messageText = messageBody;

    // Optimistically add message to UI immediately
    const optimisticMessage: SMSMessage = {
      _id: `temp-${Date.now()}`,
      from: 'me',
      to: selectedConversation.phoneNumber,
      body: messageText,
      direction: 'outbound',
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const response = await fetch('/api/crm/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.phoneNumber,
          body: messageText,
          contactId: selectedConversation.contactId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Replace optimistic message with real one
        fetchMessages(selectedConversation.phoneNumber, selectedConversation.contactId);
        fetchConversations();
        return true;
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        alert(data.error || 'Failed to send message');
        return false;
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      console.error('[Messages] Send error:', error);
      alert('Failed to send message');
      return false;
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

  return {
    messages,
    setMessages,
    loading,
    syncing,
    sending,
    fetchMessages,
    syncTwilioMessages,
    sendMessage,
    sendOptInRequest,
  };
}
