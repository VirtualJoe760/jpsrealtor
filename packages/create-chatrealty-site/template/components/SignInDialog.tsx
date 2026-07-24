"use client";

// Magic-link sign-in. Email only — no password, ever. On success the visitor
// gets an email with a link that lands on /account/verify. If accounts aren't
// enabled here yet (test-data / free), we say so plainly instead of failing.

import { useState } from "react";
import { useAccount } from "@/lib/account";

export default function SignInDialog({ onClose }: { onClose: () => void }) {
  const { requestLink } = useAccount();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "unavailable" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setPhase("sending");
    const result = await requestLink(email);
    setPhase(result === "sent" ? "sent" : result === "unavailable" ? "unavailable" : "error");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-gray-900">Save your favorite homes</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {phase === "sent" ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Check your email — we sent a sign-in link to <strong>{email}</strong>.
          </div>
        ) : phase === "unavailable" ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Accounts aren&apos;t switched on for this site yet. Your favorites are
            saved <strong>on this device</strong> in the meantime — nothing is lost.
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we&apos;ll send a one-tap sign-in link. No password.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              {phase === "error" && (
                <p className="text-sm text-red-600">Something went wrong. Try again.</p>
              )}
              <button
                type="submit"
                disabled={phase === "sending"}
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {phase === "sending" ? "Sending…" : "Email me a link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
