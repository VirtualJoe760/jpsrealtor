// useCompose hook - Manages email composition state

import { useState, useEffect, useCallback } from 'react';
import { ComposeMode, type Email, type EmailComposition } from '../types';
import { formatReplyMessage, formatForwardMessage, formatReplySubject, formatForwardSubject } from '../utils';

interface UseComposeProps {
  mode?: ComposeMode;
  originalEmail?: Email;
  recipientEmail?: string;
}

export function useCompose({ mode = ComposeMode.NEW, originalEmail, recipientEmail }: UseComposeProps) {
  const [composition, setComposition] = useState<EmailComposition>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    message: '',
    attachments: [],
  });

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Initialize composition based on mode
  useEffect(() => {
    if (recipientEmail) {
      setComposition(prev => ({ ...prev, to: recipientEmail }));
    }

    if (mode === ComposeMode.REPLY && originalEmail) {
      const replyMessage = formatReplyMessage(originalEmail);
      const replySubject = formatReplySubject(originalEmail.subject);

      setComposition(prev => ({
        ...prev,
        to: originalEmail.from,
        subject: replySubject,
        message: replyMessage,
      }));
    } else if (mode === ComposeMode.REPLY_ALL && originalEmail) {
      const replyMessage = formatReplyMessage(originalEmail);
      const replySubject = formatReplySubject(originalEmail.subject);

      // Reply all includes all original recipients (excluding sender)
      const allRecipients = [
        originalEmail.from,
        ...originalEmail.to.filter(email => email !== originalEmail.from),
      ];

      setComposition(prev => ({
        ...prev,
        to: allRecipients.join(', '),
        subject: replySubject,
        message: replyMessage,
      }));
    } else if (mode === ComposeMode.FORWARD && originalEmail) {
      const forwardMessage = formatForwardMessage(originalEmail);
      const forwardSubject = formatForwardSubject(originalEmail.subject);

      setComposition(prev => ({
        ...prev,
        subject: forwardSubject,
        message: forwardMessage,
      }));
    }
  }, [mode, originalEmail, recipientEmail]);

  const updateTo = useCallback((to: string) => {
    setComposition(prev => ({ ...prev, to }));
  }, []);

  const updateCc = useCallback((cc: string) => {
    setComposition(prev => ({ ...prev, cc }));
  }, []);

  const updateBcc = useCallback((bcc: string) => {
    setComposition(prev => ({ ...prev, bcc }));
  }, []);

  const updateSubject = useCallback((subject: string) => {
    setComposition(prev => ({ ...prev, subject }));
  }, []);

  const updateMessage = useCallback((message: string) => {
    setComposition(prev => ({ ...prev, message }));
  }, []);

  const updateAttachments = useCallback((attachments: File[]) => {
    setComposition(prev => ({ ...prev, attachments }));
  }, []);

  const addAttachment = useCallback((file: File) => {
    setComposition(prev => ({
      ...prev,
      attachments: [...prev.attachments, file],
    }));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setComposition(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  }, []);

  const clearComposition = useCallback(() => {
    setComposition({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      message: '',
      attachments: [],
    });
    setShowCc(false);
    setShowBcc(false);
  }, []);

  const applyTemplate = useCallback((subject: string, message: string) => {
    setComposition(prev => ({
      ...prev,
      subject: subject || prev.subject,
      message,
    }));
  }, []);

  return {
    composition,
    showCc,
    showBcc,
    setShowCc,
    setShowBcc,
    updateTo,
    updateCc,
    updateBcc,
    updateSubject,
    updateMessage,
    updateAttachments,
    addAttachment,
    removeAttachment,
    clearComposition,
    applyTemplate,
  };
}
