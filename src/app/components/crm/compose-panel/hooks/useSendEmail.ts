// useSendEmail hook - Manages email sending logic

import { useState, useCallback } from 'react';
import { COMPOSE_API_ENDPOINTS } from '../constants';
import { validateEmailForm } from '../utils';
import type { EmailComposition } from '../types';

export function useSendEmail() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Send email
  const sendEmail = useCallback(async (composition: EmailComposition): Promise<boolean> => {
    setSending(true);
    setError(null);
    setSuccess(false);

    // Validate before sending
    const validation = validateEmailForm(
      composition.to,
      composition.subject,
      composition.message,
      composition.attachments
    );

    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      setSending(false);
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('to', composition.to);

      if (composition.cc) {
        formData.append('cc', composition.cc);
      }

      if (composition.bcc) {
        formData.append('bcc', composition.bcc);
      }

      formData.append('subject', composition.subject);
      formData.append('message', composition.message);

      // Append attachments
      composition.attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch(COMPOSE_API_ENDPOINTS.sendEmail, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while sending';
      setError(errorMessage);
      return false;
    } finally {
      setSending(false);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setSending(false);
    setError(null);
    setSuccess(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sending,
    error,
    success,
    sendEmail,
    reset,
    clearError,
  };
}
