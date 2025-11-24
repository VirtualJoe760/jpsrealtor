"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";
import GlobalLoader from "./GlobalLoader";

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  showMapLoader: boolean;
  setShowMapLoader: (show: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true); // Start with loading on initial page load
  const [showMapLoader, setShowMapLoader] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pathname = usePathname();

  // Hide loader after initial page load
  useEffect(() => {
    if (isInitialLoad) {
      // Wait for page to fully render before hiding loader
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 1500); // Show globe for 1.5 seconds on initial load

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  // Show loader briefly on route changes (not full page reloads)
  useEffect(() => {
    if (!isInitialLoad) {
      // Don't show loader on every route change, only on initial load
      // If you want to show on route changes, uncomment below:
      // setIsLoading(true);
      // const timer = setTimeout(() => setIsLoading(false), 500);
      // return () => clearTimeout(timer);
    }
  }, [pathname, isInitialLoad]);

  const value: LoadingContextType = {
    isLoading: isLoading || showMapLoader,
    setLoading: setIsLoading,
    showMapLoader,
    setShowMapLoader,
  };

  return (
    <LoadingContext.Provider value={value}>
      {(isLoading || showMapLoader) && (
        <GlobalLoader
          message={showMapLoader ? "Loading Map" : "Loading"}
          submessage={showMapLoader ? "Preparing your listings" : "Preparing your experience"}
        />
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
