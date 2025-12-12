// src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ChatProvider } from "./components/chat/ChatProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </SessionProvider>
  );
}
