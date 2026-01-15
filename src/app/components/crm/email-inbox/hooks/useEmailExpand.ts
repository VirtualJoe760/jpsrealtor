// useEmailExpand hook - Manages expanded email state and content loading

import { useState, useCallback } from 'react';
import type { Email } from '../types';
import { EMAIL_API_ENDPOINTS } from '../constants';

export function useEmailExpand() {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [expandedEmailContent, setExpandedEmailContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  const toggleExpand = useCallback(
    async (email: Email) => {
      if (expandedEmailId === email.id) {
        // Collapse currently expanded email
        setExpandedEmailId(null);
        setExpandedEmailContent('');
        return;
      }

      // Expand new email
      setExpandedEmailId(email.id);
      setLoadingContent(true);

      try {
        const response = await fetch(
          `${EMAIL_API_ENDPOINTS.fetchEmailContent}?emailId=${email.id}`
        );

        if (response.ok) {
          const data = await response.json();
          setExpandedEmailContent(data.html || data.text || '');
        } else {
          // Fallback to email's existing content
          setExpandedEmailContent(email.html || email.text || '');
        }
      } catch (err) {
        console.error('Failed to fetch email content:', err);
        // Fallback to email's existing content
        setExpandedEmailContent(email.html || email.text || '');
      } finally {
        setLoadingContent(false);
      }
    },
    [expandedEmailId]
  );

  const collapseEmail = useCallback(() => {
    setExpandedEmailId(null);
    setExpandedEmailContent('');
  }, []);

  return {
    expandedEmailId,
    expandedEmailContent,
    loadingContent,
    toggleExpand,
    collapseEmail,
  };
}
