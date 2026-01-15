// useEmailMetadata hook - Manages email metadata (read/favorite/archive/tags)

import { useState, useEffect, useCallback } from 'react';
import type { Email, EmailMetadata } from '../types';
import { EMAIL_API_ENDPOINTS } from '../constants';

export function useEmailMetadata(emails: Email[]) {
  const [emailMetadata, setEmailMetadata] = useState<Record<string, EmailMetadata>>({});

  const fetchMetadata = useCallback(async (emailIds: string[]) => {
    if (emailIds.length === 0) return;

    try {
      const response = await fetch(
        `${EMAIL_API_ENDPOINTS.fetchMetadata}?emailIds=${emailIds.join(',')}`
      );
      const data = await response.json();

      if (response.ok && data.metadata) {
        setEmailMetadata((prev) => ({
          ...prev,
          ...data.metadata,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch email metadata:', err);
    }
  }, []);

  const updateMetadata = useCallback(
    async (emailId: string, updates: Partial<EmailMetadata>) => {
      try {
        const response = await fetch(EMAIL_API_ENDPOINTS.updateMetadata, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailId, updates }),
        });

        if (response.ok) {
          const data = await response.json();
          setEmailMetadata((prev) => ({
            ...prev,
            [emailId]: data.metadata,
          }));
        }
      } catch (err) {
        console.error('Failed to update email metadata:', err);
      }
    },
    []
  );

  const toggleRead = useCallback(
    (emailId: string) => {
      const current = emailMetadata[emailId]?.isRead || false;
      updateMetadata(emailId, { isRead: !current });
    },
    [emailMetadata, updateMetadata]
  );

  const toggleFavorite = useCallback(
    (emailId: string) => {
      const current = emailMetadata[emailId]?.isFavorite || false;
      updateMetadata(emailId, { isFavorite: !current });
    },
    [emailMetadata, updateMetadata]
  );

  const toggleArchive = useCallback(
    (emailId: string) => {
      const current = emailMetadata[emailId]?.isArchived || false;
      updateMetadata(emailId, { isArchived: !current });
    },
    [emailMetadata, updateMetadata]
  );

  const addTag = useCallback(
    (emailId: string, tag: string) => {
      const currentTags = emailMetadata[emailId]?.tags || [];
      if (!currentTags.includes(tag)) {
        updateMetadata(emailId, { tags: [...currentTags, tag] });
      }
    },
    [emailMetadata, updateMetadata]
  );

  const removeTag = useCallback(
    (emailId: string, tag: string) => {
      const currentTags = emailMetadata[emailId]?.tags || [];
      updateMetadata(emailId, { tags: currentTags.filter((t) => t !== tag) });
    },
    [emailMetadata, updateMetadata]
  );

  const markAsRead = useCallback(
    (emailId: string) => {
      updateMetadata(emailId, { isRead: true });
    },
    [updateMetadata]
  );

  const markAsUnread = useCallback(
    (emailId: string) => {
      updateMetadata(emailId, { isRead: false });
    },
    [updateMetadata]
  );

  useEffect(() => {
    const emailIds = emails.map((email) => email.id);
    fetchMetadata(emailIds);
  }, [emails, fetchMetadata]);

  return {
    emailMetadata,
    toggleRead,
    toggleFavorite,
    toggleArchive,
    addTag,
    removeTag,
    markAsRead,
    markAsUnread,
  };
}
