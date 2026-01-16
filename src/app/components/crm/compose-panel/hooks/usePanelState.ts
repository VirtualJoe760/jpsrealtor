// usePanelState hook - Manages compose panel state (minimized, maximized, normal)

import { useState, useCallback } from 'react';
import { PanelState } from '../types';

export function usePanelState(initialState: PanelState = PanelState.NORMAL) {
  const [panelState, setPanelState] = useState<PanelState>(initialState);

  // Set to normal state
  const setNormal = useCallback(() => {
    setPanelState(PanelState.NORMAL);
  }, []);

  // Set to minimized state
  const setMinimized = useCallback(() => {
    setPanelState(PanelState.MINIMIZED);
  }, []);

  // Set to maximized state
  const setMaximized = useCallback(() => {
    setPanelState(PanelState.MAXIMIZED);
  }, []);

  // Toggle between normal and maximized
  const toggleMaximized = useCallback(() => {
    setPanelState(prev =>
      prev === PanelState.MAXIMIZED ? PanelState.NORMAL : PanelState.MAXIMIZED
    );
  }, []);

  // Toggle between normal and minimized
  const toggleMinimized = useCallback(() => {
    setPanelState(prev =>
      prev === PanelState.MINIMIZED ? PanelState.NORMAL : PanelState.MINIMIZED
    );
  }, []);

  // Check current state
  const isNormal = panelState === PanelState.NORMAL;
  const isMinimized = panelState === PanelState.MINIMIZED;
  const isMaximized = panelState === PanelState.MAXIMIZED;

  return {
    panelState,
    isNormal,
    isMinimized,
    isMaximized,
    setNormal,
    setMinimized,
    setMaximized,
    toggleMaximized,
    toggleMinimized,
  };
}
