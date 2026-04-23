"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Check, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import Link from "next/link";

const FREE_FEATURES = [
  "10 AI chat queries per day",
  "Save up to 50 favorite listings",
  "3 saved searches",
  "Basic property filters",
  "Neighborhood info",
  "Community support",
];

const PRO_FEATURES = [
  "100 AI chat queries per day",
  "Unlimited saved listings",
  "Unlimited saved searches",
  "Price drop & new listing alerts",
  "Advanced search filters",
  "Priority email support",
  "Personalized AI recommendations",
  "Market trend insights",
];

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [currentTier, setCurrentTier] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<string>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    else if (status === "authenticated") fetchSubscription();
  }, [status]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/user/subscription");
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.tier || "free");
        setSubStatus(data.status || "active");
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/user/subscription", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setIsUpgrading(false);
    } catch { setIsUpgrading(false); }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
    setIsCancelling(true);
    try {
      const res = await fetch("/api/user/subscription", { method: "DELETE" });
      if (res.ok) { setSubStatus("cancelled"); setCurrentTier("free"); }
    } catch { console.error("Cancel failed"); }
    finally { setIsCancelling(false); }
  };

  if (status === "loading" || isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  const isPro = currentTier === "pro" && subStatus === "active";
  const accent = isLight ? "text-blue-500" : "text-emerald-400";
  const accentBg = isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-500";

  return (
    <div className={`relative isolate min-h-screen px-6 py-16 sm:py-24 lg:px-8 ${isLight ? "bg-white" : "bg-gray-950"}`}>
      {/* Background blur decoration */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl">
        <div
          style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
          className={`mx-auto aspect-[1155/678] w-[72.1875rem] ${isLight ? "bg-gradient-to-tr from-blue-300 to-purple-400 opacity-20" : "bg-gradient-to-tr from-emerald-500 to-cyan-600 opacity-15"}`}
        />
      </div>

      {/* Back link */}
      <div className="max-w-4xl mx-auto mb-12">
        <Link href="/dashboard/settings" className={`inline-flex items-center gap-1.5 text-sm ${accent}`}>
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-4xl text-center">
        <h2 className={`text-base/7 font-semibold ${accent}`}>Pricing</h2>
        <p className={`mt-2 text-4xl font-semibold tracking-tight sm:text-5xl ${isLight ? "text-gray-900" : "text-white"}`}>
          Choose the right plan for you
        </p>
      </div>
      <p className={`mx-auto mt-6 max-w-2xl text-center text-lg font-medium ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        Unlock the full power of AI-driven home search with personalized recommendations, unlimited saves, and priority support.
      </p>

      {/* Current plan badge */}
      {isPro && (
        <div className="mx-auto mt-6 text-center">
          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/40 text-emerald-300"}`}>
            <Sparkles className="w-4 h-4" /> You&apos;re on Pro
          </span>
        </div>
      )}

      {/* Pricing cards */}
      <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2">

        {/* Free tier */}
        <div className={`rounded-3xl rounded-t-3xl p-8 sm:mx-8 sm:rounded-b-none sm:p-10 lg:mx-0 lg:rounded-tr-none lg:rounded-bl-3xl ${
          isLight
            ? "bg-gray-50 ring-1 ring-gray-200"
            : "bg-white/[0.025] ring-1 ring-white/10"
        }`}>
          <h3 className={`text-base/7 font-semibold ${accent}`}>Free</h3>
          <p className="mt-4 flex items-baseline gap-x-2">
            <span className={`text-5xl font-semibold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>$0</span>
            <span className={`text-base ${isLight ? "text-gray-500" : "text-gray-400"}`}>/month</span>
          </p>
          <p className={`mt-6 text-base/7 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
            Get started exploring Coachella Valley real estate with our AI assistant.
          </p>
          <ul role="list" className={`mt-8 space-y-3 text-sm/6 sm:mt-10 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-x-3">
                <Check className={`h-6 w-5 flex-none ${accent}`} />
                {feature}
              </li>
            ))}
          </ul>
          {currentTier === "free" ? (
            <div className={`mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold sm:mt-10 ${
              isLight ? "bg-gray-200 text-gray-500" : "bg-white/5 text-gray-400"
            }`}>Current Plan</div>
          ) : (
            <button onClick={handleCancel} disabled={isCancelling}
              className={`mt-8 block w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold sm:mt-10 ${
                isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 ring-1 ring-gray-300"
                  : "bg-white/10 text-white hover:bg-white/20 ring-1 ring-inset ring-white/10"
              }`}>
              {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Downgrade to Free"}
            </button>
          )}
        </div>

        {/* Pro tier (emphasized) */}
        <div className={`relative rounded-3xl p-8 sm:p-10 ${
          isLight
            ? "bg-white ring-2 ring-blue-600 shadow-xl"
            : "bg-gray-800/80 ring-1 ring-white/10 shadow-2xl"
        }`}>
          {/* Popular badge */}
          <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
            isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
          }`}>Most Popular</div>

          <h3 className={`text-base/7 font-semibold ${accent}`}>Pro</h3>
          <p className="mt-4 flex items-baseline gap-x-2">
            <span className={`text-5xl font-semibold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>$10</span>
            <span className={`text-base ${isLight ? "text-gray-500" : "text-gray-400"}`}>/month</span>
          </p>
          <p className={`mt-6 text-base/7 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
            Supercharge your home search with unlimited saves, alerts, and AI-powered insights.
          </p>
          <ul role="list" className={`mt-8 space-y-3 text-sm/6 sm:mt-10 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-x-3">
                <Check className={`h-6 w-5 flex-none ${accent}`} />
                {feature}
              </li>
            ))}
          </ul>
          {isPro ? (
            <div className={`mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold sm:mt-10 ${accentBg} text-white opacity-70 cursor-default`}>
              Current Plan
            </div>
          ) : (
            <button onClick={handleUpgrade} disabled={isUpgrading}
              className={`mt-8 block w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold text-white sm:mt-10 transition-all ${accentBg} focus-visible:outline-2 focus-visible:outline-offset-2`}>
              {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Upgrade to Pro"}
            </button>
          )}
        </div>

      </div>

      {/* Bottom note */}
      <p className={`mt-12 text-center text-sm ${isLight ? "text-gray-400" : "text-gray-500"}`}>
        Cancel anytime. No long-term contracts. All plans include our core AI search features.
      </p>
    </div>
  );
}
