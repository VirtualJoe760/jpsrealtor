// useEmailCompose hook - Manages compose panel state (reply/forward)

import { useState, useCallback } from 'react';
import type { Email, ComposeAction } from '../types';

export function useEmailCompose() {
  const [composeAction, setComposeAction] = useState<ComposeAction | null>(null);
  const [composeEmail, setComposeEmail] = useState<Email | null>(null);

  const startReply = useCallback((email: Email) => {
    setComposeAction('reply');
    setComposeEmail(email);
  }, []);

  const startReplyAll = useCallback((email: Email) => {
    setComposeAction('replyAll');
    setComposeEmail(email);
  }, []);

  const startForward = useCallback((email: Email) => {
    setComposeAction('forward');
    setComposeEmail(email);
  }, []);

  const closeCompose = useCallback(() => {
    setComposeAction(null);
    setComposeEmail(null);
  }, []);

  return {
    composeAction,
    composeEmail,
    startReply,
    startReplyAll,
    startForward,
    closeCompose,
  };
}
