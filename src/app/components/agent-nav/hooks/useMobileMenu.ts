// hooks/useMobileMenu.ts - Hook for mobile menu state management

import { useState, useCallback } from 'react';
import type { MobileMenuState } from '../types';

/**
 * useMobileMenu Hook
 * Manages mobile menu open/close state
 */
export function useMobileMenu(): MobileMenuState {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    toggle,
    close,
  };
}
