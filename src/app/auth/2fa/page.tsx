// src/app/auth/2fa/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");

  const callbackUrl = searchParams.get("from") || "/dashboard";

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem("2fa_email");
    if (!storedEmail) {
      router.push("/auth/signin");
      return;
    }
    setEmail(storedEmail);

    // Auto-send code on page load
    sendCode(storedEmail);
  }, [router]);

  const sendCode = async (emailToUse: string) => {
    try {
      const response = await fetch("/api/auth/2fa/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send code");
        return;
      }

      setCodeSent(true);
    } catch (error) {
      setError("An unexpected error occurred");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/2fa/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      // Clear the stored email
      sessionStorage.removeItem("2fa_email");

      // Sign in with the returned token
      // We need to use NextAuth's signIn to establish the session
      // First, let's redirect to a completion handler
      router.push(callbackUrl);
    } catch (error) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    await sendCode(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-gray-400">
              {codeSent
                ? "Enter the 6-digit code sent to your email"
                : "Sending verification code..."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {codeSent && !error && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">
                Verification code sent to your email
              </p>
            </div>
          )}

          {/* 2FA Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                placeholder="000000"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              className="text-gray-300 hover:text-white text-sm transition-colors"
            >
              Resend Code
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
          </div>

          {/* Back to Sign In */}
          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
