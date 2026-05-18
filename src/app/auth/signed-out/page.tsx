// src/app/auth/signed-out/page.tsx
// Landing page at the end of the multi-domain signout chain.
//
// Reached via /api/auth/signout-chain after every platform apex has cleared
// its NextAuth session cookie. Auto-redirects to jpsrealtor.com after 5s,
// with a button to bounce to chatrealty.io instead.

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

const REDIRECT_DELAY_SECONDS = 5;
const AUTO_REDIRECT_URL = "https://jpsrealtor.com/";
const CHATREALTY_URL = "https://chatrealty.io/";

export default function SignedOutPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [seconds, setSeconds] = useState(REDIRECT_DELAY_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          window.location.href = AUTO_REDIRECT_URL;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SpaticalBackground>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative z-10">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle2
              className={`w-16 h-16 ${
                isLight ? "text-emerald-600" : "text-emerald-400"
              }`}
            />
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-bold tracking-tight mb-4 ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            You've been signed out
          </h1>

          <p
            className={`text-base mb-10 ${
              isLight ? "text-slate-600" : "text-gray-400"
            }`}
          >
            Your session has been cleared across all sites. Redirecting in{" "}
            <span
              className={`font-semibold ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            >
              {seconds}
            </span>{" "}
            second{seconds === 1 ? "" : "s"}.
          </p>

          <a
            href={CHATREALTY_URL}
            className={`inline-block px-6 py-3 rounded-lg font-semibold transition-colors ${
              isLight
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            Go to ChatRealty.io
          </a>
        </div>
      </div>
    </SpaticalBackground>
  );
}
