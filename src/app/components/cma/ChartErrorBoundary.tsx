"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary for Recharts components.
 * Recharts' ResponsiveContainer can throw "Cannot read properties of null
 * (reading 'removeChild')" during async unmounting. This catches it silently.
 */
export default class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Suppress Recharts DOM cleanup errors
    if (error.message?.includes("removeChild")) return;
    console.error("[ChartErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
