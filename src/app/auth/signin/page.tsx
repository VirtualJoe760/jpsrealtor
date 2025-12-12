// src/app/auth/signin/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const callbackUrl = searchParams.get("from") || "/dashboard";
  const errorParam = searchParams.get("error");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log("🔐 Starting sign in process...", {
      email,
      callbackUrl,
      hasPassword: !!password
    });

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: callbackUrl,
        redirect: false,
      });

      console.log("📋 Sign in result:", result);
      console.log("📋 Result details:", {
        ok: result?.ok,
        error: result?.error,
        status: result?.status,
        url: result?.url
      });

      if (result?.error) {
        console.error("❌ Sign in error:", result.error);
        setError(result.error);
        setIsLoading(false);
      } else if (result?.ok) {
        console.log("✅ Sign in successful! Checking session...");

        // Check if 2FA is required by making a quick session check
        try {
          console.log("🔄 Fetching session from /api/auth/session...");
          const response = await fetch("/api/auth/session");
          console.log("📡 Session response status:", response.status);

          const session = await response.json();
          console.log("📦 Session data:", session);
          console.log("📦 Has user?", !!session?.user);
          console.log("📦 User email:", session?.user?.email);

          if (session?.user?.requiresTwoFactor) {
            console.log("🔐 2FA required, redirecting to 2FA page");
            sessionStorage.setItem("2fa_email", email);
            window.location.href = `/auth/2fa?from=${encodeURIComponent(callbackUrl)}`;
          } else if (session?.user) {
            console.log("✅ Session valid! Redirecting to:", callbackUrl);
            window.location.href = callbackUrl;
          } else {
            console.warn("⚠️ No user in session after successful login!");
            console.log("⚠️ This means the session wasn't created properly");
            console.log("⚠️ Attempting redirect anyway to:", callbackUrl);
            window.location.href = callbackUrl;
          }
        } catch (sessionError) {
          console.error("❌ Session fetch error:", sessionError);
          window.location.href = callbackUrl;
        }
      }
    } catch (error) {
      console.error("Sign in exception:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div
          className={`${cardBg} ${cardBorder} border rounded-2xl shadow-2xl p-8`}
          style={
            isLight
              ? {
                  backdropFilter: "blur(10px) saturate(150%)",
                  WebkitBackdropFilter: "blur(10px) saturate(150%)",
                }
              : undefined
          }
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Welcome Back</h1>
            <p className={textSecondary}>Sign in to your account</p>
          </div>

          {/* Error Messages */}
          {(error || errorParam) && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                isLight
                  ? "bg-red-50 border border-red-200"
                  : "bg-red-500/10 border border-red-500/50"
              }`}
            >
              <p className={isLight ? "text-red-600 text-sm" : "text-red-400 text-sm"}>
                {error || "An error occurred. Please try again."}
              </p>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-transparent"
                    : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-gray-500 focus:border-transparent"
                }`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-medium mb-2 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-transparent"
                    : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-gray-500 focus:border-transparent"
                }`}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isLight
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  : "bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white"
              }`}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div
                className={`w-full border-t ${
                  isLight ? "border-gray-300" : "border-gray-700"
                }`}
              ></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className={`px-2 ${
                  isLight ? "bg-white/80 text-gray-500" : "bg-gray-900/50 text-gray-400"
                }`}
              >
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: callbackUrl })}
              className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                isLight
                  ? "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                  : "bg-white hover:bg-gray-100 text-gray-900"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Facebook Sign In - Coming Soon */}
            <div className="relative group">
              <button
                type="button"
                disabled
                className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg cursor-not-allowed flex items-center justify-center gap-3 opacity-60 ${
                  isLight
                    ? "bg-gray-200 text-gray-500"
                    : "bg-gray-600 text-gray-400"
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Sign in with Facebook
              </button>
              {/* Tooltip */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl ${
                  isLight
                    ? "bg-gray-800 text-white border border-gray-700"
                    : "bg-gray-800 text-white border border-gray-700"
                }`}
              >
                Coming Soon
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div
                className={`w-full border-t ${
                  isLight ? "border-gray-300" : "border-gray-700"
                }`}
              ></div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className={`text-sm ${textSecondary}`}>
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className={`font-medium transition-colors ${
                  isLight
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className={`text-sm transition-colors ${
              isLight
                ? "text-gray-600 hover:text-gray-900"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <Suspense fallback={
      <div className={`min-h-screen flex items-center justify-center ${
        isLight
          ? "bg-gradient-to-br from-gray-50 via-blue-50/30 to-white"
          : "bg-gradient-to-br from-black via-gray-900 to-gray-900"
      }`}>
        <div className={isLight ? "text-gray-900" : "text-white"}>Loading...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
