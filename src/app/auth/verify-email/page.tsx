// src/app/auth/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"verifying" | "waiting" | "success" | "error">(
    token ? "verifying" : "waiting"
  );
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  // Handle email verification when token is present (user clicked email link)
  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "Verification failed. Please try again.");
          return;
        }

        setStatus("success");
        setMessage(data.message || "Your email has been verified successfully!");

        // Start countdown and redirect
        let counter = 5;
        const interval = setInterval(() => {
          counter--;
          setCountdown(counter);
          if (counter === 0) {
            clearInterval(interval);
            router.push("/auth/signin");
          }
        }, 1000);
      } catch (error) {
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    verifyEmail();
  }, [token, router]);

  // Poll for verification status when waiting (after signup)
  useEffect(() => {
    if (status !== "waiting" || !email) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/check-verification?email=${encodeURIComponent(email)}`);
        const data = await response.json();

        if (data.verified) {
          setStatus("success");
          setMessage("Email verified successfully!");
          clearInterval(pollInterval);

          // Start countdown and redirect
          let counter = 5;
          const countdownInterval = setInterval(() => {
            counter--;
            setCountdown(counter);
            if (counter === 0) {
              clearInterval(countdownInterval);
              router.push("/auth/signin");
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  }, [status, email, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            {status === "verifying" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {status === "waiting" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full">
                <svg
                  className="w-12 h-12 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {status === "success" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full">
                <svg
                  className="w-12 h-12 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
            {status === "error" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full">
                <svg
                  className="w-12 h-12 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            {status === "verifying" && "Verifying Your Email..."}
            {status === "waiting" && "Check Your Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </h1>

          {/* Message */}
          <div className="text-gray-400 mb-6">
            {status === "verifying" && <p>Please wait while we verify your email address...</p>}
            {status === "waiting" && (
              <>
                <p className="mb-3">
                  We've sent a verification email to <strong className="text-white">{email}</strong>.
                </p>
                <p className="text-sm">
                  Click the link in the email to verify your account.
                  <br />
                  This page will automatically update when you verify your email.
                </p>
              </>
            )}
            {status === "success" && (
              <>
                <p className="mb-3">{message}</p>
                <p>Redirecting to sign in in <strong className="text-emerald-400">{countdown}</strong> seconds...</p>
              </>
            )}
            {status === "error" && <p>{message}</p>}
          </div>

          {/* Actions */}
          {status === "success" && (
            <Link
              href="/auth/signin"
              className="inline-block w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all duration-200"
            >
              Sign In Now
            </Link>
          )}

          {status === "waiting" && (
            <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Didn't receive the email?</p>
              <ul className="text-xs text-gray-500 text-left space-y-1 mb-3">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure the email address is correct</li>
                <li>• Wait a few minutes for the email to arrive</li>
              </ul>
              <Link
                href="/auth/signup"
                className="text-sm text-gray-300 hover:text-white underline"
              >
                Resend verification email
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Link
                href="/auth/signup"
                className="inline-block w-full py-3 px-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white font-semibold rounded-lg transition-all duration-200"
              >
                Sign Up Again
              </Link>
              <Link
                href="/"
                className="inline-block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
