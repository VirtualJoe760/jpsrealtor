// useLinkModal hook - Manages link insertion modal

import { useState, useCallback } from 'react';

export function useLinkModal() {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Open link modal
  const openLinkModal = useCallback(() => {
    setShowLinkModal(true);
  }, []);

  // Close link modal and reset
  const closeLinkModal = useCallback(() => {
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  }, []);

  // Update link URL
  const updateUrl = useCallback((url: string) => {
    setLinkUrl(url);
  }, []);

  // Update link text
  const updateText = useCallback((text: string) => {
    setLinkText(text);
  }, []);

  // Insert link with callback
  const insertLink = useCallback((
    onInsert: (url: string, text?: string) => void
  ) => {
    if (linkUrl) {
      onInsert(linkUrl, linkText);
      closeLinkModal();
    }
  }, [linkUrl, linkText, closeLinkModal]);

  return {
    showLinkModal,
    linkUrl,
    linkText,
    openLinkModal,
    closeLinkModal,
    updateUrl,
    updateText,
    insertLink,
  };
}
