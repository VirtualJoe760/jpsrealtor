// useEmailExpand hook - Manages expanded email state and content loading

import { useState, useCallback } from 'react';
import type { Email, FolderType } from '../types';
import { EMAIL_API_ENDPOINTS } from '../constants';

export function useEmailExpand(activeFolder: FolderType) {
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
        // Pass folder parameter to API so it knows which Resend endpoint to use
        const response = await fetch(
          `/api/resend/email/${email.id}?folder=${activeFolder}`
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.html || data.text || email.html || email.text || '';
          console.log('Email content loaded:', { emailId: email.id, folder: activeFolder, hasContent: !!content, contentLength: content.length });
          setExpandedEmailContent(content);
        } else {
          console.warn('Failed to fetch email content from API, using fallback');
          // Fallback to email's existing content
          setExpandedEmailContent(email.html || email.text || '<p style="color: gray; font-style: italic;">No email content available</p>');
        }
      } catch (err) {
        console.error('Failed to fetch email content:', err);
        // Fallback to email's existing content
        setExpandedEmailContent(email.html || email.text || '<p style="color: gray; font-style: italic;">Error loading email content</p>');
      } finally {
        setLoadingContent(false);
      }
    },
    [expandedEmailId, activeFolder]
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
