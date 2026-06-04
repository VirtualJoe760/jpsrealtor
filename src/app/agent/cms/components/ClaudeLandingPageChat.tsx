"use client";

// src/app/agent/cms/components/ClaudeLandingPageChat.tsx
//
// Conversational landing-page builder. Mirrors chat-v3's SSE event loop but
// targets /api/claude/draft-landing-page, which streams Anthropic tool_use
// events alongside text deltas. Each tool_use event maps to a setter on the
// parent form, so the form fills in real time as the agent talks with Claude.
//
// Layout:
//   Desktop: chat panel (left) + "form-fill log" panel (right) showing which
//            fields have been populated and their current values.
//   Mobile:  chat panel only (the existing edit/preview tabs already show form
//            state).

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Check, RotateCcw } from "lucide-react";
import type { LandingPageConfig } from "./LandingPageOptions";

// FormData shape we read from / write to. Kept loose with an index signature
// so it composes with the parent's slightly stricter form-data type.
type FormDataLike = {
  title: string;
  excerpt: string;
  content: string;
  seo: { title: string; description: string; keywords: string[] };
} & Record<string, any>;

interface ClaudeLandingPageChatProps {
  formData: FormDataLike;
  lpConfig: LandingPageConfig;
  // Use React's SetStateAction so the callback composes with the parent's
  // useState setter (which has stricter known fields).
  onFormDataChange: React.Dispatch<React.SetStateAction<any>>;
  onLpConfigChange: (cfg: LandingPageConfig) => void;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: string;
  // Names of tools fired during this turn — for the receipt chip in the bubble
  toolsFired?: string[];
};

type FillLogEntry = {
  at: number;
  field: string;
  preview: string;
};

const SETTABLE_LP_OPTIONS = new Set([
  "standalone",
  "heroType",
  "youtubeUrl",
  "videoAutoplay",
  "themeOverride",
  "formEnabled",
  "formHeading",
  "formButtonText",
  "formRecipients",
  "formDisclaimer",
]);

export default function ClaudeLandingPageChat({
  formData,
  lpConfig,
  onFormDataChange,
  onLpConfigChange,
  isLight,
  textPrimary,
  textSecondary,
  textMuted,
}: ClaudeLandingPageChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I can build you a landing page. To start: what's this page for? A listing, a community, a lead magnet, an event, or something else?",
    },
  ]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fillLog, setFillLog] = useState<FillLogEntry[]>([]);
  const [finalizedSummary, setFinalizedSummary] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, fillLog]);

  // Refs to the latest form state so the SSE handler always reads the current
  // values when applying tool updates (avoids stale closures).
  const formDataRef = useRef(formData);
  const lpConfigRef = useRef(lpConfig);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  useEffect(() => {
    lpConfigRef.current = lpConfig;
  }, [lpConfig]);

  // Apply a single tool_use event to the form state.
  const applyToolUse = useCallback(
    (name: string, input: any, fired: string[]) => {
      if (!input || typeof input !== "object") return;
      let logField: string | null = null;
      let logPreview: string = "";

      switch (name) {
        case "set_article_field": {
          const field = String(input.field || "");
          const value = input.value;
          if (!field) return;

          if (field === "title") {
            onFormDataChange((prev) => ({ ...prev, title: String(value || "") }));
            logField = "title";
            logPreview = String(value || "");
          } else if (field === "excerpt") {
            onFormDataChange((prev) => ({ ...prev, excerpt: String(value || "") }));
            logField = "excerpt";
            logPreview = String(value || "").slice(0, 80);
          } else if (field === "content") {
            onFormDataChange((prev) => ({ ...prev, content: String(value || "") }));
            logField = "content (MDX)";
            logPreview = `${String(value || "").length} chars`;
          } else if (field === "seo.title") {
            onFormDataChange((prev) => ({
              ...prev,
              seo: { ...prev.seo, title: String(value || "") },
            }));
            logField = "seo.title";
            logPreview = String(value || "");
          } else if (field === "seo.description") {
            onFormDataChange((prev) => ({
              ...prev,
              seo: { ...prev.seo, description: String(value || "") },
            }));
            logField = "seo.description";
            logPreview = String(value || "").slice(0, 80);
          } else if (field === "seo.keywords") {
            const arr = Array.isArray(value) ? value.map(String) : [];
            onFormDataChange((prev) => ({
              ...prev,
              seo: { ...prev.seo, keywords: arr },
            }));
            logField = "seo.keywords";
            logPreview = arr.join(", ");
          }
          break;
        }

        case "set_landing_page_option": {
          const option = String(input.option || "");
          if (!SETTABLE_LP_OPTIONS.has(option)) return;
          const value = input.value;
          onLpConfigChange({ ...lpConfigRef.current, [option]: value });
          logField = `landingPage.${option}`;
          logPreview = String(value);
          break;
        }

        case "add_form_field": {
          const { id, label, type, required, options } = input;
          if (!id || !label || !type) return;
          const existing = lpConfigRef.current.formFields || [];
          // Replace if id already present, else append.
          const next = existing.filter((f) => f.id !== id);
          next.push({
            id: String(id),
            label: String(label),
            type: String(type),
            required: Boolean(required),
            ...(Array.isArray(options) ? { options: options.map(String) } : {}),
          });
          onLpConfigChange({ ...lpConfigRef.current, formFields: next });
          logField = `form field: ${id}`;
          logPreview = `${label} (${type})`;
          break;
        }

        case "remove_form_field": {
          const id = String(input.id || "");
          if (!id) return;
          const next = (lpConfigRef.current.formFields || []).filter((f) => f.id !== id);
          onLpConfigChange({ ...lpConfigRef.current, formFields: next });
          logField = `removed form field: ${id}`;
          logPreview = "";
          break;
        }

        case "finalize": {
          const summary = String(input.summary || "Draft ready.");
          setFinalizedSummary(summary);
          logField = "finalize";
          logPreview = summary;
          break;
        }
      }

      if (logField) {
        setFillLog((prev) =>
          [...prev, { at: Date.now(), field: logField!, preview: logPreview }].slice(-30)
        );
      }
      fired.push(name);
    },
    [onFormDataChange, onLpConfigChange]
  );

  const send = useCallback(
    async (text: string) => {
      const userText = text.trim();
      if (!userText || submitting) return;

      const history: ChatMessage[] = [
        ...messages,
        { role: "user", content: userText },
        { role: "assistant", content: "", streaming: true, toolsFired: [] },
      ];
      setMessages(history);
      setInput("");
      setSubmitting(true);

      // Snapshot of "current draft" sent to the model so it doesn't overwrite
      // accepted state needlessly.
      const currentDraft = {
        title: formDataRef.current.title,
        excerpt: formDataRef.current.excerpt,
        contentLength: formDataRef.current.content?.length || 0,
        seo: formDataRef.current.seo,
        landingPage: lpConfigRef.current,
      };

      const fired: string[] = [];

      try {
        const res = await fetch("/api/claude/draft-landing-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history
              .filter((m) => !m.streaming) // exclude the placeholder
              .map((m) => ({ role: m.role, content: m.content })),
            currentDraft,
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const applyEventLocal = (evt: any) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (!last || last.role !== "assistant") return prev;
            const next: ChatMessage = { ...last };

            if (typeof evt.token === "string") {
              next.content = (next.content || "") + evt.token;
            }
            if (evt.error) {
              next.error = evt.error;
              next.streaming = false;
            }
            if (evt.done) {
              next.streaming = false;
              next.toolsFired = [...fired];
            }
            copy[copy.length - 1] = next;
            return copy;
          });

          if (evt.tool_use && typeof evt.tool_use === "object") {
            applyToolUse(evt.tool_use.name, evt.tool_use.input, fired);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              applyEventLocal(JSON.parse(json));
            } catch {
              /* ignore malformed frame */
            }
          }
        }

        // Stream closed without a `done` event — mark non-streaming.
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.streaming) {
            copy[copy.length - 1] = { ...last, streaming: false, toolsFired: [...fired] };
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
    [applyToolUse, messages, submitting]
  );

  const resetChat = () => {
    if (!confirm("Reset the conversation? The form fields stay as-is — just the chat starts over.")) return;
    setMessages([
      {
        role: "assistant",
        content:
          "Fresh start. What's this page for? A listing, a community, a lead magnet, an event, or something else?",
      },
    ]);
    setFillLog([]);
    setFinalizedSummary(null);
  };

  // ---- Render ----

  const chatBg = isLight ? "bg-white" : "bg-gray-900";
  const bubbleAssistant = isLight ? "bg-gray-100 text-gray-900" : "bg-gray-800 text-gray-100";
  const bubbleUser = isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white";
  const inputBg = isLight
    ? "bg-white border-2 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
    : "bg-gray-800 border-2 border-gray-700 focus:border-emerald-500 focus:ring-emerald-500/20";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
          <Sparkles className={`w-5 h-5 ${isLight ? "text-purple-500" : "text-purple-400"}`} />
          Claude Landing Page Builder
        </h2>
        <button
          onClick={resetChat}
          className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md ${
            isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-800"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New chat
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chat */}
        <div className={`xl:col-span-2 rounded-lg border ${isLight ? "border-gray-200" : "border-gray-800"} ${chatBg} flex flex-col`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[600px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  m.role === "user" ? bubbleUser : bubbleAssistant
                } ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                  {m.error ? (
                    <span className="text-red-300">{m.error}</span>
                  ) : m.streaming && !m.content ? (
                    <span className="italic opacity-70 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      thinking…
                    </span>
                  ) : (
                    <>
                      <span className="whitespace-pre-wrap leading-relaxed">{m.content}</span>
                      {m.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-current opacity-50 ml-0.5 animate-pulse align-middle" />
                      )}
                    </>
                  )}
                  {m.toolsFired && m.toolsFired.length > 0 && (
                    <div className={`mt-2 pt-2 border-t text-xs flex flex-wrap gap-1 ${
                      isLight ? "border-gray-300 text-gray-600" : "border-gray-700 text-gray-400"
                    }`}>
                      <Check className="w-3 h-3" />
                      Updated: {Array.from(new Set(m.toolsFired)).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {finalizedSummary && (
              <div className={`rounded-lg p-3 text-sm border ${
                isLight ? "bg-green-50 border-green-200 text-green-900" : "bg-green-950/30 border-green-800 text-green-300"
              }`}>
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <Check className="w-4 h-4" />
                  Draft ready
                </div>
                <div>{finalizedSummary}</div>
                <div className="text-xs mt-1 opacity-80">
                  Switch to Edit / Preview to review, then Publish.
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className={`border-t p-3 ${isLight ? "border-gray-200" : "border-gray-800"}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={submitting ? "Claude is working…" : "Reply to Claude…"}
                disabled={submitting}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm ${textPrimary} placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${inputBg}`}
              />
              <button
                onClick={() => send(input)}
                disabled={submitting || !input.trim()}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-colors ${
                  isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Fill log */}
        <div className={`rounded-lg border p-4 ${isLight ? "border-gray-200 bg-white" : "border-gray-800 bg-gray-900"}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wide ${textMuted} mb-3`}>
            Form populated
          </h3>
          {fillLog.length === 0 ? (
            <div className={`text-xs ${textMuted}`}>
              Fields Claude updates will appear here as you chat.
            </div>
          ) : (
            <div className="space-y-2">
              {fillLog
                .slice()
                .reverse()
                .map((entry, i) => (
                  <div
                    key={`${entry.at}-${i}`}
                    className={`text-xs p-2 rounded-md border ${
                      isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/40 border-gray-700"
                    }`}
                  >
                    <div className={`font-mono ${textPrimary}`}>{entry.field}</div>
                    {entry.preview && (
                      <div className={`mt-0.5 ${textSecondary} line-clamp-2`}>
                        {entry.preview}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div className={`mt-4 pt-4 border-t ${isLight ? "border-gray-200" : "border-gray-800"}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${textMuted} mb-2`}>
              Current draft
            </h4>
            <dl className="space-y-1 text-xs">
              <div>
                <dt className={textMuted}>Title</dt>
                <dd className={`${textPrimary} font-medium truncate`}>{formData.title || "—"}</dd>
              </div>
              <div>
                <dt className={textMuted}>Excerpt</dt>
                <dd className={`${textPrimary} line-clamp-2`}>{formData.excerpt || "—"}</dd>
              </div>
              <div>
                <dt className={textMuted}>Content</dt>
                <dd className={textPrimary}>{formData.content?.length || 0} chars</dd>
              </div>
              <div>
                <dt className={textMuted}>Hero</dt>
                <dd className={textPrimary}>{lpConfig.heroType}</dd>
              </div>
              <div>
                <dt className={textMuted}>Form</dt>
                <dd className={textPrimary}>
                  {lpConfig.formEnabled ? `${lpConfig.formFields.length} field(s)` : "disabled"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
