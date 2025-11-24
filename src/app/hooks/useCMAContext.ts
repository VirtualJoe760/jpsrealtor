// src/app/hooks/useCMAContext.ts
// Hook for managing CMA context and persistence

import { useState, useEffect, useCallback } from 'react';
import type { CMAReport } from '@/lib/cma/cmaTypes';
import type { Listing } from '@/app/components/chat/ListingCarousel';

const CMA_STORAGE_KEY = 'jpsrealtor_last_cma';

export interface CMAContextState {
  lastCMAReport: CMAReport | null;
  lastCMAProperty: Listing | null;
  generatedAt: string | null;
}

export function useCMAContext() {
  const [cmaState, setCMAState] = useState<CMAContextState>({
    lastCMAReport: null,
    lastCMAProperty: null,
    generatedAt: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CMA_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCMAState(parsed);
        console.log('📊 Loaded CMA context from localStorage');
      }
    } catch (error) {
      console.error('Failed to load CMA context:', error);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (cmaState.lastCMAReport || cmaState.lastCMAProperty) {
      try {
        localStorage.setItem(CMA_STORAGE_KEY, JSON.stringify(cmaState));
      } catch (error) {
        console.error('Failed to save CMA context:', error);
      }
    }
  }, [cmaState]);

  const setCMAReport = useCallback((report: CMAReport, property?: Listing) => {
    setCMAState({
      lastCMAReport: report,
      lastCMAProperty: property || null,
      generatedAt: report.generatedAt,
    });
    console.log('📊 CMA report saved to context');
  }, []);

  const setCMAProperty = useCallback((property: Listing) => {
    setCMAState(prev => ({
      ...prev,
      lastCMAProperty: property,
    }));
  }, []);

  const clearCMA = useCallback(() => {
    setCMAState({
      lastCMAReport: null,
      lastCMAProperty: null,
      generatedAt: null,
    });
    localStorage.removeItem(CMA_STORAGE_KEY);
    console.log('📊 CMA context cleared');
  }, []);

  return {
    ...cmaState,
    setCMAReport,
    setCMAProperty,
    clearCMA,
  };
}
