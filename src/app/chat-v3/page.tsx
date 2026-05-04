"use client";

// src/app/chat-v3/page.tsx
//
// New chat surface backed by /api/chat-v3 (search-first → narrate, with
// agent-loop fallback). Built to validate the search-first pipeline in a
// real chat loop before merging into /chap.
//
// What's here:
// - Multi-turn message list (user + assistant pairs)
// - Streaming assistant text (token events)
// - Layer 1 component preview rendered below the assistant message
// - Layer 3 (agent loop) responses still work — falls through naturally
//
// What's not here yet (deferred until cutover into /chap):
// - Map layer / filters / favorites panel — those live on /chap and stay
//   unchanged. This page focuses on the chat experience itself.
// - Conversation persistence to localStorage — comes with the cutover.

import { useState, useRef, useEffect, useCallback } from "react";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import PreviewRenderer from "@/app/components/chat-v3/PreviewRenderer";
import type { PreviewResult } from "@/lib/chat-search/types";

// ---------------------------------------------------------------------------
// Message model
// ---------------------------------------------------------------------------

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string; // narration or full markdown
  preview?: PreviewResult | null; // Layer 1 component (search-first turns)
  // Layer 3 fallback emits a `components` payload in chat-v2 shape; we keep
  // it here in case a future renderer needs it. PreviewRenderer ignores it.
  components?: any;
  streaming?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Page wrappers — providers must be inside the export so all children see
// MLSContext + ChatContext (the production listing components require both)
// ---------------------------------------------------------------------------

export default function ChatV3Page() {
  return (
    <MLSProvider>
      <ChatProvider>
        <ChatV3Inner />
      </ChatProvider>
    </MLSProvider>
  );
}

// ---------------------------------------------------------------------------
// Main UI
// ---------------------------------------------------------------------------

function ChatV3Inner() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message as it streams in
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSubmit = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query || submitting) return;

      const userMsg: ChatMessage = { role: "user", content: query };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: "",
        streaming: true,
      };

      // Snapshot history BEFORE this turn so we send the right messages
      // array to the API (chat-v3 needs the full history for multi-turn).
      const history = [...messages, userMsg];

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setSubmitting(true);

      try {
        const res = await fetch("/api/chat-v3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            userId: "demo-user",
            userTier: "premium",
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by blank lines. Split on \n\n and
          // keep any trailing partial frame in the buffer.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";

          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            let evt: any;
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }
            applyEvent(evt);
          }
        }

        // Mark streaming complete
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = { ...last, streaming: false };
          }
          return copy;
        });
      } catch (err: any) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              streaming: false,
              error: err?.message || "Request failed",
            };
          }
          return copy;
        });
      } finally {
        setSubmitting(false);
      }
    },
    [messages, submitting]
  );

  // Apply a single SSE event to the in-flight assistant message
  const applyEvent = useCallback((evt: any) => {
    setMessages((prev) => {
      const copy = [...prev];
      const idx = copy.length - 1;
      const last = copy[idx];
      if (!last || last.role !== "assistant") return prev;

      const next: ChatMessage = { ...last };

      if (typeof evt.token === "string") {
        next.content = (next.content || "") + evt.token;
      }
      if (typeof evt.content === "string") {
        // Full content (commands, snapshots) — replace
        next.content = evt.content;
      }
      if (evt.preview !== undefined) {
        next.preview = evt.preview;
      }
      if (evt.components !== undefined) {
        next.components = { ...(next.components || {}), ...evt.components };
      }
      if (evt.error) {
        next.error = evt.error;
      }
      if (evt.done) {
        next.streaming = false;
      }

      copy[idx] = next;
      return copy;
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit(input);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-3">
        <h1 className="text-lg font-bold">Chat v3</h1>
        <p className="text-xs text-gray-500">
          Search-first chat backed by{" "}
          <code className="text-xs bg-gray-200 px-1 rounded">/api/chat-v3</code>.
          Parser → preview → narrate, with agent-loop fallback for
          conversational and multi-turn queries.
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-sm">Try a query.</p>
              <p className="text-xs mt-2 text-gray-400">
                cma for 77095 desi drive · compare PGA West vs Indian Wells ·
                4-bed homes in palm desert under 800k · appreciation in la
                quinta over 5 years
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              {m.role === "user" ? (
                <div className="self-end max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 shadow-sm">
                  {m.content}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="self-start max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                    {m.error ? (
                      <span className="text-red-600 text-sm">{m.error}</span>
                    ) : m.streaming && !m.content ? (
                      <span className="text-gray-400 italic text-sm">
                        thinking…
                      </span>
                    ) : (
                      <span className="text-sm whitespace-pre-wrap leading-relaxed">
                        {m.content}
                        {m.streaming && (
                          <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                        )}
                      </span>
                    )}
                  </div>
                  {m.preview && (
                    <div className="ml-2 max-w-full">
                      <PreviewRenderer preview={m.preview} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a property, subdivision, market trend, or CMA..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={submitting}
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={submitting || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
