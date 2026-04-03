"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary specifically for MapLibre/React DOM conflicts.
 *
 * MapLibre GL manipulates the DOM directly (creating/destroying markers,
 * popups, controls) outside React's virtual DOM. When React tries to
 * reconcile during re-renders, it can encounter "removeChild" errors
 * because MapLibre already removed/moved those DOM nodes.
 *
 * This error boundary catches and suppresses these non-fatal errors
 * without crashing the UI.
 */
export default class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    // Don't set hasError to true — we want to keep rendering
    // The removeChild error is non-fatal
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only suppress the known MapLibre/React DOM conflict errors
    const isMapDomConflict =
      error.message?.includes("removeChild") ||
      error.message?.includes("insertBefore") ||
      error.message?.includes("appendChild") ||
      error.message?.includes("Cannot read properties of null");

    if (isMapDomConflict) {
      // Suppress — this is a known non-fatal MapLibre/React conflict
      return;
    }

    // Re-throw unknown errors
    throw error;
  }

  render() {
    return this.props.children;
  }
}
