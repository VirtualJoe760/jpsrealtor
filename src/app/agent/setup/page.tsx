"use client";

// Conversational agent setup — the default first-run experience.
// Styled to match CHAP (src/app/components/chat/ChatWidget.tsx): emerald-
// gradient user bubbles, neutral glass assistant bubbles with a Bot avatar,
// large readable type, a floating rounded composer. A live profile-progress
// card fills in as fields land. Classic form wizard remains the fallback.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import TypingAnimation from "@/app/components/chat/TypingAnimation";
import { Bot, CheckCircle2, Circle, Send } from "lucide-react";

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
  headshot: string | null;
  onboardingComplete: boolean;
};

export default function AgentSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState(false);
  // Quick-reply chips for the CURRENT question (server-derived).
  const [choices, setChoices] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [uploadChip, setUploadChip] = useState(false); // headshot question → file picker
  const [picked, setPicked] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/agent/setup");
  }, [status, router]);

  // Greet by the agent's known name (from their account) and open on the team/
  // brand question — the name is pre-filled, so it's not asked again. If we
  // somehow don't know the name, open by asking for it (free text, no chips).
  useEffect(() => {
    if (status !== "authenticated" || messages.length > 0) return;
    const name = session?.user?.name?.trim();
    const first = name ? name.split(" ")[0] : null;
    if (first) {
      setMessages([
        {
          role: "assistant",
          content: `Welcome, ${first}! Let's set up your account — it takes about two minutes.\n\nDo you operate under a team or brand name (like "The Sardella Group"), or just under your own name?`,
        },
      ]);
      setChoices(["Just my own name", "I have a team or brand name"]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: "Welcome to ChatRealty — let's set up your account. It takes about two minutes.\n\nFirst, what's your name?",
        },
      ]);
    }
  }, [status, session, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (done) {
      const id = setTimeout(() => router.replace("/agent/dashboard"), 2500);
      return () => clearTimeout(id);
    }
  }, [done, router]);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setChoices([]);
    setPicked([]);
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
      setChoices(Array.isArray(data?.choices) ? data.choices : []);
      setMultiSelect(Boolean(data?.multiSelect));
      setUploadChip(Boolean(data?.upload));
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Hmm, that didn't go through — try again?" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // Headshot: upload the file to /api/upload (Cloudinary), then hand the URL to
  // the setup-chat route to save deterministically and let the assistant move on.
  async function uploadHeadshot(file: File) {
    if (uploading) return;
    setUploading(true);
    setChoices([]);
    setMessages((m) => [...m, { role: "user", content: "📸 Uploading my headshot…" }]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "general");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      const url = upData?.url || upData?.data?.url;
      if (!url) throw new Error("no url");
      const next = [...messages, { role: "user" as const, content: "I added my headshot." }];
      const res = await fetch("/api/agent/setup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, headshotUrl: url }),
      });
      const data = await res.json();
      setMessages((m) => {
        const trimmed = m.filter((x) => x.content !== "📸 Uploading my headshot…");
        return [...trimmed, { role: "assistant", content: data?.reply || "Great — your headshot's saved." }];
      });
      if (data?.profile) setProfile(data.profile);
      if (data?.done) setDone(true);
      setChoices(Array.isArray(data?.choices) ? data.choices : []);
      setMultiSelect(Boolean(data?.multiSelect));
      setUploadChip(Boolean(data?.upload));
    } catch {
      setMessages((m) => m.filter((x) => x.content !== "📸 Uploading my headshot…"));
    } finally {
      setUploading(false);
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
    { label: "Headshot", ok: Boolean(profile?.headshot) },
  ];

  // CHAP palette
  const textMain = isLight ? "text-gray-900" : "text-neutral-50";
  const textDim = isLight ? "text-gray-500" : "text-neutral-400";
  const cardBg = isLight ? "bg-white/90 border-gray-200/60" : "bg-neutral-900/70 border-neutral-700/50";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl gap-6 px-4 py-6">
      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-5">
          <h1 className={`text-2xl font-bold tracking-[-0.02em] ${textMain}`}>Set up your account</h1>
          <p className={`mt-0.5 text-sm ${textDim}`}>
            Prefer forms?{" "}
            <Link href="/agent/settings?onboarding=true" className="underline hover:text-emerald-500">
              Use the classic setup
            </Link>
          </p>
        </div>

        {/* Message stream */}
        <div className="flex-1 space-y-5 overflow-y-auto pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    isLight
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                      : "border border-neutral-600 bg-gradient-to-br from-neutral-600 to-neutral-800"
                  }`}
                >
                  <Bot className="h-5 w-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] select-text whitespace-pre-wrap rounded-2xl px-5 py-4 text-base leading-relaxed tracking-[-0.01em] sm:text-[19px] ${
                  m.role === "user"
                    ? isLight
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    : isLight
                      ? "border border-gray-200/60 bg-white/90 text-gray-800 shadow-md"
                      : "border border-neutral-700/50 bg-neutral-900/80 text-neutral-50 shadow-lg backdrop-blur-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex gap-3">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isLight ? "bg-gradient-to-br from-emerald-400 to-emerald-600" : "border border-neutral-600 bg-gradient-to-br from-neutral-600 to-neutral-800"}`}>
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className={`rounded-2xl px-5 py-4 ${isLight ? "bg-white/90 border border-gray-200/60" : "bg-neutral-900/80 border border-neutral-700/50 backdrop-blur-sm"}`}>
                <TypingAnimation />
              </div>
            </div>
          )}

          {/* Quick-reply chips for the current question (CHAP-style buttons) */}
          {!busy && !done && choices.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-11">
              {choices.map((c) => {
                const on = picked.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => {
                      if (uploadChip && c === "Upload a photo") {
                        fileRef.current?.click();
                      } else if (multiSelect && c !== "Skip for now") {
                        setPicked((p) => (on ? p.filter((x) => x !== c) : [...p, c]));
                      } else {
                        send(c); // single-select, or Skip (even in multi mode)
                      }
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      on
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isLight
                          ? "border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-600"
                          : "border-neutral-600 bg-neutral-800/70 text-neutral-200 hover:border-emerald-500 hover:text-emerald-300"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              {multiSelect && (
                <button
                  onClick={() => picked.length && send(picked.join(", "))}
                  disabled={picked.length === 0}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-40"
                >
                  Continue{picked.length ? ` (${picked.length})` : ""}
                </button>
              )}
            </div>
          )}

          {done && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm font-medium text-emerald-500">
              You&apos;re all set — taking you to your dashboard…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Hidden file input for the headshot upload chip */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadHeadshot(f);
            e.target.value = "";
          }}
        />

        {/* Floating composer — CHAP style */}
        <div
          className={`sticky bottom-4 mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-xl ${
            isLight ? "border-gray-200 bg-white" : "border-neutral-700/70 bg-neutral-900/90 backdrop-blur-md"
          }`}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type your answer…"
            disabled={busy || done}
            className={`flex-1 bg-transparent px-3 py-2.5 text-base outline-none tracking-[-0.01em] ${textMain} ${isLight ? "placeholder:text-gray-400" : "placeholder:text-neutral-500"}`}
          />
          <button
            onClick={() => send()}
            disabled={busy || done || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Live progress card */}
      <aside className="hidden w-60 flex-shrink-0 md:block">
        <div className={`sticky top-24 rounded-2xl border p-5 backdrop-blur-sm ${cardBg}`}>
          <p className={`text-sm font-bold ${textMain}`}>Your profile</p>
          <ul className="mt-4 space-y-2.5">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Circle className={`h-4 w-4 flex-shrink-0 ${textDim}`} />
                )}
                <span className={c.ok ? textMain : textDim}>
                  {c.label}
                  {c.required && !c.ok ? " *" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className={`mt-4 text-[11px] leading-relaxed ${textDim}`}>
            * required to finish — license &amp; brokerage appear on your site by law.
          </p>
        </div>
      </aside>
    </div>
  );
}
