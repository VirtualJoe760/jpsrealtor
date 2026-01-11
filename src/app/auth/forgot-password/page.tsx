// src/app/auth/forgot-password/page.tsx
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send reset email");
        setIsLoading(false);
        return;
      }

      setMessage(data.message);
      setEmailSent(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md ${cardBg} ${cardBorder} border rounded-2xl shadow-2xl p-8`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isLight ? 'bg-blue-100' : 'bg-blue-900/30'
          }`}>
            <Mail className={`w-8 h-8 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            Forgot Password?
          </h1>
          <p className={`${textSecondary} text-sm`}>
            {emailSent
              ? "Check your email for reset instructions"
              : "Enter your email and we'll send you a reset link"
            }
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${textPrimary} mb-2`}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg border ${
                  isLight
                    ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    : "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                placeholder="you@example.com"
              />
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
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
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

            <div className={`text-sm ${textSecondary} space-y-2`}>
              <p>• Check your spam folder if you don't see the email</p>
              <p>• The link will expire in 1 hour</p>
              <p>• You can request a new link at any time</p>
            </div>

            <button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
                setMessage("");
              }}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors border ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900"
                  : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-white"
              }`}
            >
              Send Another Reset Link
            </button>
          </div>
        )}

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className={`inline-flex items-center gap-2 text-sm ${
              isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
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
