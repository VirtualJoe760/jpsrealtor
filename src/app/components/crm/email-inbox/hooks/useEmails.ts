// useEmails hook - Manages email fetching and state

import { useState, useEffect, useCallback } from 'react';
import type { Email, FolderType, SentSubfolder } from '../types';
import { EMAIL_API_ENDPOINTS, EMAIL_LIMIT } from '../constants';

export function useEmails(
  activeFolder: FolderType,
  sentSubfolder?: SentSubfolder
) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(EMAIL_LIMIT);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        folder: activeFolder,
        limit: String(limit),
      });

      if (activeFolder === 'sent' && sentSubfolder && sentSubfolder !== 'all') {
        params.append('subfolder', sentSubfolder);
      }

      const response = await fetch(`${EMAIL_API_ENDPOINTS.fetchEmails}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [activeFolder, sentSubfolder, limit]);

  const refreshEmails = useCallback(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return {
    emails,
    loading,
    error,
    refreshEmails,
  };
}
