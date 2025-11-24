/**
 * Async chat message logger
 * Extracted from IntegratedChatWidget.tsx
 */

export async function logChatMessageAsync(
  role: string,
  content: string,
  userId: string,
  metadata?: any
): Promise<void> {
  try {
    await fetch("/api/chat/log-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, userId, metadata }),
    });
  } catch (error) {
    // Silently fail - logging shouldn't break the app
    console.warn("Failed to log message:", error);
  }
}
