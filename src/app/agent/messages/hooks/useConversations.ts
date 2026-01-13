/**
 * Hook for managing conversations state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { Conversation } from '../types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/sms/conversations', {
        credentials: 'include',
      });
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

  // Apply filters when conversations or search query changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return {
    conversations,
    filteredConversations,
    searchQuery,
    setSearchQuery,
    fetchConversations,
  };
}
