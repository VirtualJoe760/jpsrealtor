// useEmailBulkActions hook - Manages bulk selection and actions

import { useState, useCallback } from 'react';
import type { Email } from '../types';

export function useEmailBulkActions() {
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);

  const toggleSelectEmail = useCallback((emailId: string) => {
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((emails: Email[]) => {
    setSelectedEmailIds(new Set(emails.map((e) => e.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedEmailIds(new Set());
  }, []);

  const isSelected = useCallback(
    (emailId: string) => {
      return selectedEmailIds.has(emailId);
    },
    [selectedEmailIds]
  );

  const executeBulkAction = useCallback(
    async (action: () => Promise<void>) => {
      setBulkActionInProgress(true);
      try {
        await action();
        deselectAll();
      } catch (err) {
        console.error('Bulk action failed:', err);
      } finally {
        setBulkActionInProgress(false);
      }
    },
    [deselectAll]
  );

  return {
    selectedEmailIds,
    bulkActionInProgress,
    toggleSelectEmail,
    selectAll,
    deselectAll,
    isSelected,
    executeBulkAction,
  };
}
