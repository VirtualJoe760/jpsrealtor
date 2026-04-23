// src/app/auth/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"verifying" | "waiting" | "success" | "error">(
    token ? "verifying" : "waiting"
  );
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  const accent = isLight ? "text-blue-600" : "text-emerald-400";
  const accentBg = isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700";

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        let counter = 5;
        const interval = setInterval(() => {
          counter--;
          setCountdown(counter);
          if (counter === 0) { clearInterval(interval); router.push("/auth/signin"); }
        }, 1000);
      } catch {
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    verifyEmail();
  }, [token, router]);

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

          let counter = 5;
          const countdownInterval = setInterval(() => {
            counter--;
            setCountdown(counter);
            if (counter === 0) { clearInterval(countdownInterval); router.push("/auth/signin"); }
          }, 1000);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [status, email, router]);

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className={`backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center border ${
            isLight ? "bg-white/90 border-gray-200" : "bg-gray-900/80 border-gray-700"
          }`}>
            {/* Icon */}
            <div className="mb-6">
              {status === "verifying" && (
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isLight ? "bg-blue-100" : "bg-emerald-500/20"}`}>
                  <Loader2 className={`w-10 h-10 animate-spin ${isLight ? "text-blue-600" : "text-emerald-500"}`} />
                </div>
              )}
              {status === "waiting" && (
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isLight ? "bg-blue-100" : "bg-blue-500/20"}`}>
                  <Mail className={`w-10 h-10 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                </div>
              )}
              {status === "success" && (
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isLight ? "bg-green-100" : "bg-emerald-500/20"}`}>
                  <CheckCircle2 className={`w-10 h-10 ${isLight ? "text-green-600" : "text-emerald-500"}`} />
                </div>
              )}
              {status === "error" && (
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isLight ? "bg-red-100" : "bg-red-500/20"}`}>
                  <XCircle className={`w-10 h-10 ${isLight ? "text-red-600" : "text-red-500"}`} />
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className={`text-3xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
              {status === "verifying" && "Verifying Your Email..."}
              {status === "waiting" && "Check Your Email"}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
            </h1>

            {/* Message */}
            <div className={`mb-6 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              {status === "verifying" && <p>Please wait while we verify your email address...</p>}
              {status === "waiting" && (
                <>
                  <p className="mb-3">
                    We&apos;ve sent a verification email to{" "}
                    <strong className={isLight ? "text-gray-900" : "text-white"}>{email}</strong>.
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
                  <p>Redirecting to sign in in <strong className={accent}>{countdown}</strong> seconds...</p>
                </>
              )}
              {status === "error" && <p>{message}</p>}
            </div>

            {/* Actions */}
            {status === "success" && (
              <Link href="/auth/signin"
                className={`inline-block w-full py-3 px-4 text-white font-semibold rounded-lg transition-all ${accentBg}`}>
                Sign In Now
              </Link>
            )}

            {status === "waiting" && (
              <div className={`mt-6 p-4 rounded-lg border ${
                isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/50 border-gray-700"
              }`}>
                <p className={`text-sm mb-2 font-medium ${isLight ? "text-gray-700" : "text-gray-300"}`}>Didn&apos;t receive the email?</p>
                <ul className={`text-xs text-left space-y-1 mb-3 ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                  <li>- Check your spam or junk folder</li>
                  <li>- Make sure the email address is correct</li>
                  <li>- Wait a few minutes for the email to arrive</li>
                </ul>
                <Link href="/auth/signup"
                  className={`text-sm underline ${isLight ? "text-blue-600 hover:text-blue-700" : "text-gray-300 hover:text-white"}`}>
                  Resend verification email
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Link href="/auth/signup"
                  className={`block w-full py-3 px-4 text-white font-semibold rounded-lg transition-all text-center ${accentBg}`}>
                  Sign Up Again
                </Link>
                <Link href="/"
                  className={`block w-full py-3 px-4 font-semibold rounded-lg transition-all text-center ${
                    isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-800 text-white hover:bg-gray-700"
                  }`}>
                  Back to Home
                </Link>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <Link href="/" className={`text-sm transition-colors ${isLight ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-white"}`}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <SpaticalBackground showGradient={true}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </SpaticalBackground>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
