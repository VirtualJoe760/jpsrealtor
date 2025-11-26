"use client";

import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import ChatWidget from "@/app/components/chat/ChatWidget";

export default function Home() {
  return (
    <MLSProvider>
      <ChatProvider>
        <ChatWidget />
      </ChatProvider>
    </MLSProvider>
  );
}
