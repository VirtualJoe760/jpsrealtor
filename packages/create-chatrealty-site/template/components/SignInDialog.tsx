"use client";

// Sign-in dialog. Google / Facebook when the agent has configured their OAuth
// apps (buttons appear automatically), plus the magic email link as the
// zero-setup path. Never a password. If accounts aren't enabled here yet
// (test-data / free), we say so plainly instead of failing.

import { useEffect, useState } from "react";
import { signIn as oauthSignIn } from "next-auth/react";
import { useAccount } from "@/lib/account";

type Providers = { google: boolean; facebook: boolean };

export default function SignInDialog({ onClose }: { onClose: () => void }) {
  const { requestLink } = useAccount();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "unavailable" | "error">("idle");
  const [providers, setProviders] = useState<Providers>({ google: false, facebook: false });

  useEffect(() => {
    fetch("/api/account/providers")
      .then((r) => r.json())
      .then((p) => setProviders({ google: !!p?.google, facebook: !!p?.facebook }))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setPhase("sending");
    const result = await requestLink(email);
    setPhase(result === "sent" ? "sent" : result === "unavailable" ? "unavailable" : "error");
  }

  const social = providers.google || providers.facebook;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-gray-900">Save your favorite homes</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {phase === "sent" ? (
          <div className="cr-note cr-note-success mt-4 p-4 text-sm">
            Check your email — we sent a sign-in link to <strong>{email}</strong>.
          </div>
        ) : phase === "unavailable" ? (
          <div className="cr-note cr-note-warning mt-4 p-4 text-sm">
            Accounts aren&apos;t switched on for this site yet. Your favorites are
            saved <strong>on this device</strong> in the meantime — nothing is lost.
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to keep your saved homes on every device.
            </p>

            {social && (
              <div className="mt-4 space-y-2">
                {providers.google && (
                  <button
                    onClick={() => oauthSignIn("google", { callbackUrl: window.location.pathname })}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Continue with Google
                  </button>
                )}
                {providers.facebook && (
                  <button
                    onClick={() => oauthSignIn("facebook", { callbackUrl: window.location.pathname })}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166FE5]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/>
                    </svg>
                    Continue with Facebook
                  </button>
                )}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              </div>
            )}

            <form onSubmit={submit} className={social ? "space-y-3" : "mt-4 space-y-3"}>
              <input
                type="email"
                required
                autoFocus={!social}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              {phase === "error" && (
                <p className="cr-text-danger text-sm">Something went wrong. Try again.</p>
              )}
              <button
                type="submit"
                disabled={phase === "sending"}
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {phase === "sending" ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
