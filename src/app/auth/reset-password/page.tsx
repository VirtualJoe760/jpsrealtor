// src/app/auth/reset-password/page.tsx
"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setMessage("Password reset successfully! Redirecting to sign in...");

      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md ${cardBg} ${cardBorder} border rounded-2xl shadow-2xl p-8`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isLight ? 'bg-purple-100' : 'bg-purple-900/30'
          }`}>
            <KeyRound className={`w-8 h-8 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            Reset Password
          </h1>
          <p className={`${textSecondary} text-sm`}>
            Enter your new password below
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${textPrimary} mb-2`}>
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!token || isLoading}
                  className={`w-full px-4 py-3 rounded-lg border pr-12 ${
                    isLight
                      ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      : "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className={`w-5 h-5 ${textSecondary}`} />
                  ) : (
                    <Eye className={`w-5 h-5 ${textSecondary}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium ${textPrimary} mb-2`}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!token || isLoading}
                  className={`w-full px-4 py-3 rounded-lg border pr-12 ${
                    isLight
                      ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      : "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className={`w-5 h-5 ${textSecondary}`} />
                  ) : (
                    <Eye className={`w-5 h-5 ${textSecondary}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className={`text-xs ${textSecondary} space-y-1`}>
              <p>Password must:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Be at least 8 characters long</li>
                <li>Match the confirmation password</li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!token || isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                !token || isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : isLight
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <div className={`p-4 rounded-lg border ${
              isLight
                ? 'bg-green-50 border-green-200'
                : 'bg-green-900/20 border-green-700'
            }`}>
              <p className={`text-sm ${isLight ? 'text-green-800' : 'text-green-300'}`}>
                {message}
              </p>
            </div>

            <Link
              href="/auth/signin"
              className={`block w-full py-3 px-4 rounded-lg font-medium transition-colors text-center ${
                isLight
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              Sign In Now
            </Link>
          </div>
        )}

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className={`inline-flex items-center gap-2 text-sm ${
              isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'
            } transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
