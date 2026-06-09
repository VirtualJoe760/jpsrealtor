// src/app/newsletter-signup/page.tsx
//
// Public newsletter signup. Posts to /api/newsletter/subscribe (Turnstile +
// rate-limited + domain-scoped). Replaces the previously-dead /newsletter-signup
// link in the sidebar quick actions.
"use client";

import { useRef, useState } from "react";
import { Newspaper } from "lucide-react";
import TurnstileWidget, { TurnstileWidgetHandle } from "@/components/TurnstileWidget";

export default function NewsletterSignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }
    if (!turnstileToken) {
      setStatus("error");
      setMessage("Please complete the verification.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          turnstileToken,
          source: "newsletter-signup-page",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setStatus("success");
        setMessage(
          data.alreadySubscribed
            ? "You're already on the list — thanks for being here!"
            : "You're subscribed! Watch your inbox for the latest."
        );
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
        turnstileRef.current?.reset();
        setTurnstileToken("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 mb-4">
            <Newspaper className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join the Newsletter</h1>
          <p className="mt-2 text-neutral-400">
            Market insights, new listings, and Coachella Valley real estate news —
            straight to your inbox.
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-500/10 p-6 text-center">
            <p className="text-emerald-300 font-medium">{message}</p>
            <a href="/" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
              Back to the site
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nl-name" className="block text-sm text-neutral-400 mb-1">
                Name <span className="text-neutral-600">(optional)</span>
              </label>
              <input
                id="nl-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="nl-email" className="block text-sm text-neutral-400 mb-1">
                Email
              </label>
              <input
                id="nl-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-center">
              <TurnstileWidget
                ref={turnstileRef}
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
                theme="dark"
                action="newsletter-signup"
              />
            </div>

            {status === "error" && message && (
              <p className="text-sm text-red-400 text-center">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-2.5 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60"
            >
              {status === "loading" ? "Subscribing…" : "Subscribe"}
            </button>

            <p className="text-xs text-neutral-600 text-center">
              We respect your inbox. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
