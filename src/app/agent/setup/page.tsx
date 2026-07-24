"use client";

// Conversational agent setup — the default first-run experience.
// A chat (styled with the chat-v3 vocabulary) collects what the classic
// wizard collects; a live progress card fills in beside it as fields land.
// "Prefer forms?" links to the classic wizard at /agent/settings?onboarding=true.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import { chatThemeClasses } from "@/app/components/chat-v3/themeClasses";
import TypingAnimation from "@/app/components/chat/TypingAnimation";
import { CheckCircle2, Circle, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };
type Profile = {
  name: string | null;
  teamName: string | null;
  licenseNumber: string | null;
  brokerageName: string | null;
  phone: string | null;
  email: string | null;
  contactVisibility: string | null;
  serviceAreas: string[];
  specializations: string[];
  brandColor: string | null;
  onboardingComplete: boolean;
};

const OPENER: Msg = {
  role: "assistant",
  content:
    "Welcome to ChatRealty — let's get your account set up. It takes about two minutes.\n\nFirst: do you go by your own name (like \"Jane Smith, Real Estate Agent\"), or do you have a team or group name?",
};

export default function AgentSetupPage() {
  const { status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const t = chatThemeClasses(isLight);

  const [messages, setMessages] = useState<Msg[]>([OPENER]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/agent/setup");
  }, [status, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (done) {
      const id = setTimeout(() => router.replace("/agent/dashboard"), 2500);
      return () => clearTimeout(id);
    }
  }, [done, router]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/agent/setup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data?.reply) setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data?.profile) setProfile(data.profile);
      if (data?.done) setDone(true);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Hmm, that didn't go through — try again?" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const checklist: Array<{ label: string; ok: boolean; required?: boolean }> = [
    { label: "Name / team", ok: Boolean(profile?.name || profile?.teamName) },
    { label: "License number", ok: Boolean(profile?.licenseNumber), required: true },
    { label: "Brokerage", ok: Boolean(profile?.brokerageName), required: true },
    { label: "Phone", ok: Boolean(profile?.phone) },
    { label: "Contact visibility", ok: Boolean(profile?.contactVisibility) },
    { label: "Market", ok: (profile?.serviceAreas?.length || 0) > 0 },
    { label: "Focus", ok: (profile?.specializations?.length || 0) > 0 },
    { label: "Brand color", ok: Boolean(profile?.brandColor) },
  ];

  return (
    <div className={`mx-auto flex min-h-[calc(100dvh-4rem)] max-w-4xl gap-6 px-4 py-8`}>
      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4">
          <h1 className={`text-xl font-bold ${t.textPrimary}`}>Set up your account</h1>
          <p className={`text-sm ${t.textMuted}`}>
            Prefer forms?{" "}
            <Link href="/agent/settings?onboarding=true" className="underline">
              Use the classic setup
            </Link>
          </p>
        </div>

        <div className={`flex-1 space-y-3 overflow-y-auto rounded-2xl border p-4 ${t.bgCard} ${t.border}`}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : `${isLight ? "bg-gray-100" : "bg-neutral-700/60"} ${t.textPrimary}`
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className={`rounded-2xl px-4 py-2.5 ${isLight ? "bg-gray-100" : "bg-neutral-700/60"}`}>
                <TypingAnimation />
              </div>
            </div>
          )}
          {done && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              You're all set — taking you to your dashboard…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type your answer…"
            disabled={busy || done}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none ${t.bgCard} ${t.border} ${t.textPrimary}`}
          />
          <button
            onClick={send}
            disabled={busy || done || !input.trim()}
            aria-label="Send"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Live progress card */}
      <aside className={`hidden w-60 flex-shrink-0 md:block`}>
        <div className={`sticky top-24 rounded-2xl border p-4 ${t.bgCard} ${t.border}`}>
          <p className={`text-sm font-bold ${t.textPrimary}`}>Your profile</p>
          <ul className="mt-3 space-y-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Circle className={`h-4 w-4 flex-shrink-0 ${t.textMuted}`} />
                )}
                <span className={c.ok ? t.textPrimary : t.textMuted}>
                  {c.label}
                  {c.required && !c.ok ? " *" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className={`mt-3 text-[11px] ${t.textMuted}`}>* required to finish — license & brokerage appear on your site by law.</p>
        </div>
      </aside>
    </div>
  );
}
