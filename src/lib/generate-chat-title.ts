// src/lib/generate-chat-title.ts
// AI-powered chat title generation using Groq API

/**
 * Generate a concise, descriptive title for a chat conversation
 * Uses the first few messages to understand the conversation context
 */
export async function generateChatTitle(firstUserMessage: string, firstAIResponse?: string): Promise<string> {
  try {
    const response = await fetch('/api/chat/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: firstUserMessage,
        aiResponse: firstAIResponse,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate title: ${response.status}`);
    }

    const data = await response.json();
    return data.title || fallbackTitle(firstUserMessage);
  } catch (error) {
    console.error('Error generating chat title:', error);
    return fallbackTitle(firstUserMessage);
  }
}

/**
 * Fallback title generator if API fails
 * Uses simple truncation with smart word boundaries
 */
function fallbackTitle(message: string): string {
  // Remove extra whitespace
  const cleaned = message.trim().replace(/\s+/g, ' ');

  // If short enough, return as-is
  if (cleaned.length <= 25) {
    return cleaned;
  }

  // Try to break at a word boundary within 20-25 chars
  const truncated = cleaned.substring(0, 25);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 15) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}
