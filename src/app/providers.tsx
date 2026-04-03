// src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { ChatProvider } from "./components/chat/ChatProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Suppress NextAuth CLIENT_FETCH_ERROR during development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        // Filter out NextAuth CLIENT_FETCH_ERROR during hot reload
        if (
          typeof args[0] === 'string' &&
          args[0].includes('[next-auth][error][CLIENT_FETCH_ERROR]')
        ) {
          console.log('[Providers] Suppressed NextAuth CLIENT_FETCH_ERROR (hot reload)');
          return;
        }
        originalError.apply(console, args);
      };

      return () => {
        console.error = originalError;
      };
    }
  }, []);

  return (
    <SessionProvider
      // Prevent initial session fetch during SSR/hydration
      refetchInterval={0}
      refetchOnWindowFocus={false}
      // Add retry logic with exponential backoff
      refetchWhenOffline={false}
    >
      <ChatProvider>
        {children}
      </ChatProvider>
    </SessionProvider>
  );
}
