// useContactPersistence hook - Handles session storage for contact page state

import { useEffect, useCallback } from 'react';
import { ContactsPageState } from '../types';

const STORAGE_KEY = 'contactsPageState';

export function useContactPersistence(state: Partial<ContactsPageState>) {
  /**
   * Restore state from sessionStorage
   */
  const restoreState = useCallback((): ContactsPageState | null => {
    try {
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState) as ContactsPageState;
      }
    } catch (error) {
      console.error('[useContactPersistence] Error restoring state:', error);
    }
    return null;
  }, []);

  /**
   * Save current state to sessionStorage
   */
  const saveState = useCallback((stateToSave: Partial<ContactsPageState>) => {
    try {
      const currentState = restoreState() || {};
      const mergedState = {
        ...currentState,
        ...stateToSave,
        scrollPosition: window.scrollY
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
    } catch (error) {
      console.error('[useContactPersistence] Error saving state:', error);
    }
  }, [restoreState]);

  /**
   * Clear saved state
   */
  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[useContactPersistence] Error clearing state:', error);
    }
  }, []);

  /**
   * Restore scroll position
   */
  const restoreScrollPosition = useCallback(() => {
    const savedState = restoreState();
    if (savedState?.scrollPosition !== undefined) {
      // Use setTimeout to ensure content is rendered first
      setTimeout(() => {
        window.scrollTo(0, savedState.scrollPosition);
      }, 100);
    }
  }, [restoreState]);

  // Save state whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state, saveState]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      try {
        const savedState = restoreState();
        if (savedState) {
          savedState.scrollPosition = window.scrollY;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
        }
      } catch (error) {
        console.error('[useContactPersistence] Error saving scroll position:', error);
      }
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restoreState]);

  return {
    restoreState,
    saveState,
    clearState,
    restoreScrollPosition
  };
}

/**
 * Hook to restore state on mount (use once in main component)
 */
export function useRestoreContactState() {
  const restoreState = useCallback((): ContactsPageState | null => {
    try {
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState) as ContactsPageState;
      }
    } catch (error) {
      console.error('[useRestoreContactState] Error restoring state:', error);
    }
    return null;
  }, []);

  return { restoreState };
}
