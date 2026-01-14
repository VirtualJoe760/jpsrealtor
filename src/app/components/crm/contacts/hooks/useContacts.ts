// useContacts hook - Handles contact CRUD operations and pagination

import { useState, useCallback } from 'react';
import { Contact, ContactPagination } from '../types';

interface FetchContactsParams {
  reset?: boolean;
  search?: string;
  tag?: string;
  status?: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<ContactPagination>({
    total: 0,
    limit: 50,
    skip: 0,
    hasMore: false
  });

  /**
   * Fetch contacts with optional filters
   */
  const fetchContacts = useCallback(async (params: FetchContactsParams = {}) => {
    const { reset = false, search, tag, status } = params;

    try {
      if (reset) {
        setLoading(true);
        setPagination(prev => ({ ...prev, skip: 0 }));
      } else {
        setLoadingMore(true);
      }

      const skip = reset ? 0 : pagination.skip + pagination.limit;

      // Build query params
      const queryParams = new URLSearchParams({
        limit: pagination.limit.toString(),
        skip: skip.toString(),
      });

      if (search) queryParams.append('search', search);
      if (tag) queryParams.append('tag', tag);
      if (status) queryParams.append('status', status);

      const response = await fetch(`/api/crm/contacts?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setContacts(prev => reset ? data.contacts : [...prev, ...data.contacts]);
        setPagination({
          total: data.pagination.total,
          limit: data.pagination.limit,
          skip: skip,
          hasMore: data.pagination.hasMore
        });
      }
    } catch (error) {
      console.error('[useContacts] Fetch error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pagination.skip, pagination.limit]);

  /**
   * Delete a single contact
   */
  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return false;
    }

    try {
      const response = await fetch(`/api/crm/contacts?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setContacts(prev => prev.filter(c => c._id !== id));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        return true;
      } else {
        alert(data.error);
        return false;
      }
    } catch (error) {
      console.error('[useContacts] Delete error:', error);
      alert('Failed to delete contact');
      return false;
    }
  }, []);

  /**
   * Load more contacts (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loadingMore) return;
    await fetchContacts({ reset: false });
  }, [pagination.hasMore, loadingMore, fetchContacts]);

  /**
   * Refresh contacts (reset to first page)
   */
  const refresh = useCallback(async () => {
    await fetchContacts({ reset: true });
  }, [fetchContacts]);

  /**
   * Update a contact in the local state
   */
  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts(prev =>
      prev.map(c => c._id === updatedContact._id ? updatedContact : c)
    );
  }, []);

  /**
   * Add a new contact to the local state
   */
  const addContact = useCallback((newContact: Contact) => {
    setContacts(prev => [newContact, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  }, []);

  return {
    contacts,
    loading,
    loadingMore,
    pagination,
    fetchContacts,
    deleteContact,
    loadMore,
    refresh,
    updateContact,
    addContact,
    setContacts
  };
}
