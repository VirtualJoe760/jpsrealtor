// useContacts hook - Handles contact CRUD operations and pagination

import { useState, useCallback, useEffect } from 'react';
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
  const [pagination, setPagination] = useState<ContactPagination>({
    total: 0,
    limit: 9999, // Load ALL contacts initially
    skip: 0,
    hasMore: false
  });

  /**
   * Fetch ALL contacts (no server-side pagination/filtering)
   * Filtering and pagination will be done client-side
   */
  const fetchContacts = useCallback(async (params: FetchContactsParams = {}) => {
    const { reset = false } = params;
    // Ignore search, tag, status - we'll filter client-side

    try {
      setLoading(true);

      // Fetch ALL contacts in one request
      const queryParams = new URLSearchParams({
        limit: '9999', // Load all contacts
        skip: '0',
      });

      const response = await fetch(`/api/crm/contacts?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.contacts); // Always replace with all contacts
        setPagination({
          total: data.pagination.total,
          limit: data.pagination.limit,
          skip: 0,
          hasMore: false // No more to load - we have everything
        });
      }
    } catch (error) {
      console.error('[useContacts] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - always fetch all

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

  // Fetch ALL contacts on component mount
  useEffect(() => {
    fetchContacts({ reset: true });
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    fetchContacts,
    deleteContact,
    updateContact,
    addContact,
    setContacts
  };
}
