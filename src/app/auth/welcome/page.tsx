// src/app/auth/welcome/page.tsx
//
// Landing page for the verification link sent by /api/leads/{buy,sell}-intake.
// Validates the token from the query string, then offers two ways to finish
// account setup:
//   1. Create a password
//   2. Sign in with Google or Facebook
//
// On success the user is signed in and redirected to /dashboard.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Check, AlertCircle, Eye, EyeOff } from "lucide-react";

function WelcomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<"verifying" | "ready" | "saving" | "done" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Verify the token on mount
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token");
      return;
    }
    fetch("/api/auth/welcome/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Verification failed");
        setEmail(data.email);
        setName(data.name);
        setStatus("ready");
      })
      .catch((e) => {
        setStatus("error");
        setError(e?.message || "Verification failed");
      });
  }, [token]);

  async function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/auth/welcome/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to set password");

      // Sign them in
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        throw new Error("Account created but sign-in failed. Please log in manually.");
      }
      setStatus("done");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setStatus("ready");
    }
  }

  function onOAuth(provider: "google" | "facebook") {
    signIn(provider, { callbackUrl: "/dashboard" });
  }

  // ----- UI states -----

  if (status === "verifying") {
    return (
      <Centered>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="mt-4 text-gray-300">Verifying your link…</p>
      </Centered>
    );
  }

  if (status === "error") {
    return (
      <Centered>
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Link is invalid or expired</h1>
        <p className="text-sm text-gray-400 max-w-sm text-center">{error}</p>
        <a
          href="/auth/signin"
          className="mt-6 px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold"
        >
          Go to Sign In
        </a>
      </Centered>
    );
  }

  if (status === "done") {
    return (
      <Centered>
        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-4">
          <Check className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">All set!</h1>
        <p className="text-sm text-gray-400">Taking you to your dashboard…</p>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center mb-3">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">
            {name ? `Welcome, ${name.split(" ")[0]}` : "Welcome"}
          </h1>
          <p className="text-sm text-gray-400">
            Email verified · <span className="text-white">{email}</span>
          </p>
          <p className="text-sm text-gray-400 mt-3">
            Finish setting up your account — create a password or sign in with a social account.
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-2 mb-5">
          <button
            type="button"
            onClick={() => onOAuth("google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => onOAuth("facebook")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#1877f2] text-white font-semibold hover:brightness-110 transition"
          >
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">or set a password</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Password form */}
        <form onSubmit={onSetPassword} className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Create password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={showPw ? "text" : "password"}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "saving"}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg hover:scale-[1.01] transition disabled:opacity-60 disabled:hover:scale-100"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting password…
              </>
            ) : (
              "Create password & sign in"
            )}
          </button>
        </form>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex flex-col items-center justify-center p-6">
      {children}
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeInner />
    </Suspense>
  );
}
