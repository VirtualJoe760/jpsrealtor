"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import PricingCard, { TIERS } from "@/app/components/pricing/PricingCard";

export default function PricingClient() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const router = useRouter();

  const [isAnnual, setIsAnnual] = useState(false);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch current subscription if logged in
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/stripe/subscription");
        if (res.ok) {
          const data = await res.json();
          if (data.tier) setCurrentTier(data.tier);
        }
      } catch {
        // Not logged in or no subscription — that is fine
      }
    };
    fetchSubscription();
  }, []);

  const handleSelect = async (tierId: string) => {
    if (tierId === "free") {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierId,
          billingInterval: isAnnual ? "annual" : "monthly",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        router.push("/auth/signin");
      }
    } catch {
      // Redirect to sign in on error
      router.push("/auth/signin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpaticalBackground>
      <div className="min-h-screen relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2
            className={`text-sm font-semibold tracking-[0.3em] uppercase mb-4 ${
              isLight ? "text-blue-600" : "text-blue-400"
            }`}
          >
            Pricing
          </h2>
          <h1
            className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            Plans for every{" "}
            <span
              className={
                isLight
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent"
              }
            >
              agent
            </span>
          </h1>
          <p
            className={`mt-4 text-lg max-w-2xl mx-auto ${
              isLight ? "text-slate-600" : "text-gray-400"
            }`}
          >
            Start free and upgrade as your business grows. All plans include your
            own AI-powered real estate website.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span
            className={`text-sm font-medium ${
              !isAnnual
                ? isLight
                  ? "text-gray-900"
                  : "text-white"
                : isLight
                ? "text-gray-500"
                : "text-gray-400"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isAnnual
                ? isLight
                  ? "bg-blue-600"
                  : "bg-emerald-600"
                : isLight
                ? "bg-gray-300"
                : "bg-gray-600"
            }`}
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                isAnnual ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              isAnnual
                ? isLight
                  ? "text-gray-900"
                  : "text-white"
                : isLight
                ? "text-gray-500"
                : "text-gray-400"
            }`}
          >
            Annual
          </span>
          {isAnnual && (
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                isLight
                  ? "bg-green-100 text-green-700"
                  : "bg-green-900/30 text-green-400"
              }`}
            >
              2 months free
            </span>
          )}
        </div>

        {/* Tier cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              isAnnual={isAnnual}
              isCurrentPlan={currentTier === tier.id}
              isLight={isLight}
              onSelect={handleSelect}
              disabled={loading}
            />
          ))}
        </div>

        {/* FAQ / footer note */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <p
            className={`text-sm ${
              isLight ? "text-slate-500" : "text-gray-500"
            }`}
          >
            All plans include SSL, CDN, and automatic updates. Cancel anytime.
            Need a custom plan?{" "}
            <a
              href="mailto:support@chatrealty.io"
              className={
                isLight
                  ? "text-blue-600 hover:text-blue-700 underline"
                  : "text-blue-400 hover:text-blue-300 underline"
              }
            >
              Contact us
            </a>
            .
          </p>
        </div>
      </div>
    </SpaticalBackground>
  );
}
