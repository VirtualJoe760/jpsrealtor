// src/lib/chat-api-client.ts
// Simplified chat API client for Groq function calling

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  response: string;
  listings?: any[];
  metadata?: {
    model: string;
    processingTime: number;
    functionCalls: Array<{
      function: string;
      arguments: any;
      result: string;
      data: any;
    }>;
    iterations: number;
  };
}

/**
 * Send a chat message and get response with listings
 */
export async function sendChatMessage(
  userMessage: string,
  userId: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  // Build message array (keep last 3 messages for context)
  const recentHistory = conversationHistory.slice(-3);
  const messages = [
    ...recentHistory,
    { role: "user" as const, content: userMessage }
  ];

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      userId,
      userTier: "free",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Chat API request failed");
  }

  const data = await response.json();

  // Extract listings from function calls
  let listings: any[] | undefined;

  if (data.metadata?.functionCalls) {
    const listingCalls = data.metadata.functionCalls.filter(
      (call: any) =>
        call.function === 'getSubdivisionListings' ||
        call.function === 'searchListings'
    );

    if (listingCalls.length > 0 && listingCalls[0].data?.listings) {
      listings = listingCalls[0].data.listings;
    }
  }

  return {
    response: data.response,
    listings,
    metadata: data.metadata,
  };
}
