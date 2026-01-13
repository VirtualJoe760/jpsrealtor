/**
 * Hook for managing contacts state and operations
 */

import { useState, useCallback } from 'react';
import { Contact } from '../types';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const fetchContacts = useCallback(async () => {
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
  }, []);

  const filteredContacts = contacts.filter(contact => {
    const query = contactSearch.toLowerCase();
    return (
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(query) ||
      contact.phone.includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  });

  return {
    contacts,
    contactSearch,
    setContactSearch,
    filteredContacts,
    fetchContacts,
  };
}
