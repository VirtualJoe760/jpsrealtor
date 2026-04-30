"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/contexts/ThemeContext";
import AgentNav from "@/app/components/AgentNav";
import {
  Crown,
  Coins,
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
  CreditCard,
  Calendar,
  TrendingUp,
  Receipt,
  ExternalLink,
  Plus,
} from "lucide-react";

interface SubscriptionData {
  tier: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  isTrialing: boolean;
  stripeSubscriptionId: string | null;
  features: Record<string, any>;
}

interface PointsData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  tier: string;
  tierConfig: {
    name: string;
    monthlyPrice: number;
    monthlyPoints: number;
  };
}

const PLANS = [
  {
    tier: "free",
    name: "Free",
    price: 0,
    credits: 0,
    description: "Get started with a basic agent profile",
    features: [
      "Agent subdomain",
      "10 gallery photos",
      "1 custom page",
      "Lead capture",
      "Community support",
    ],
    highlighted: false,
  },
  {
    tier: "beginner",
    name: "Beginner",
    price: 125,
    credits: 750,
    description:
      "Launch your marketing with 750 credits/month for ads, direct mail, and voicemail",
    features: [
      "750 marketing credits/month",
      "Use credits on any campaign type",
      "Google & Meta Ads",
      "Direct mail campaigns",
      "Voicemail drops",
      "Partner cost-splitting",
      "Basic analytics",
      "50 gallery photos",
      "Email support",
    ],
    highlighted: false,
  },
  {
    tier: "experienced",
    name: "Experienced",
    price: 500,
    credits: 3200,
    description:
      "Scale your business with 3,200 credits/month at a better rate",
    features: [
      "3,200 marketing credits/month",
      "Better credit value per dollar",
      "Priority ad placement",
      "Advanced campaign analytics",
      "Custom audience targeting",
      "Unlimited partnerships",
      "Custom domain",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    tier: "topagent",
    name: "Top Agent",
    price: 1000,
    credits: 6800,
    description:
      "Maximum ROI — 6,800 credits/month at the best rate with white-glove service",
    features: [
      "6,800 marketing credits/month",
      "Best credit value per dollar",
      "White-glove campaign management",
      "Custom reporting & dashboards",
      "API access",
      "Unlimited photos & videos",
      "Webhooks",
      "Dedicated support",
    ],
    highlighted: false,
  },
];

// Quick-buy options: dollar amount -> approximate credits at a typical tier rate
const QUICK_CREDIT_OPTIONS = [
  { dollars: 50, credits: 300 },
  { dollars: 100, credits: 640 },
  { dollars: 250, credits: 1600 },
  { dollars: 500, credits: 3200 },
  { dollars: 1000, credits: 6800 },
];

function BuyCreditsSection({ isLight }: { isLight: boolean }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    const value = parseFloat(amount);
    if (!value || value < 10) { alert("Minimum purchase is $10"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/points/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create purchase");
      }
    } catch { alert("Failed to create purchase"); }
    finally { setLoading(false); }
  };

  return (
    <div className={`rounded-xl p-5 border ${
      isLight ? "bg-white border-gray-200 shadow-lg" : "bg-gray-800/50 border-gray-700"
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <Plus className={`w-5 h-5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
        <h3 className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
          Buy More Credits
        </h3>
      </div>
      <p className={`text-sm mb-4 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        Need more credits this month? Purchase additional credits anytime.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_CREDIT_OPTIONS.map((opt) => (
          <button
            key={opt.dollars}
            onClick={() => setAmount(opt.dollars.toString())}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              amount === opt.dollars.toString()
                ? "bg-amber-600 text-white"
                : isLight
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {opt.credits.toLocaleString()} credits
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isLight ? "text-gray-400" : "text-gray-500"}`}>$</span>
          <input
            type="number"
            min="10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Dollar amount"
            className={`w-full pl-7 pr-3 py-2.5 rounded-lg text-sm border ${
              isLight
                ? "border-gray-300 bg-white text-gray-900 placeholder-gray-400"
                : "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        <button
          onClick={handleTopUp}
          disabled={loading || !amount}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
            loading || !amount ? "opacity-50 cursor-not-allowed" : ""
          } bg-amber-600 hover:bg-amber-700`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Purchase"}
        </button>
      </div>
    </div>
  );
}

export default function AgentSubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [activeTab, setActiveTab] = useState<
    "overview" | "plans" | "billing"
  >("overview");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [points, setPoints] = useState<PointsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    else if (status === "authenticated") fetchData();
  }, [status]);

  const fetchData = async () => {
    try {
      const [subRes, ptsRes] = await Promise.all([
        fetch("/api/stripe/subscription"),
        fetch("/api/points"),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }

      if (ptsRes.ok) {
        const ptsData = await ptsRes.json();
        setPoints(ptsData);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    setUpgradeLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingInterval: "monthly",
          successUrl: `${window.location.origin}/subscription/success?plan=agent`,
          cancelUrl: `${window.location.origin}/agent/subscription?cancelled=true`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 409) {
        alert("You already have an active subscription. Use Manage Billing to change plans.");
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      alert("Failed to start checkout");
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/agent/subscription`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const user = session?.user as any;
  if (!user?.roles?.includes("realEstateAgent")) {
    router.push("/auth/signin");
    return null;
  }

  const currentTier = subscription?.tier || "free";
  const isActive =
    subscription?.status === "active" ||
    subscription?.status === "trialing";
  const accent = isLight ? "text-blue-600" : "text-blue-400";
  const accentBg = isLight
    ? "bg-blue-600 hover:bg-blue-700"
    : "bg-blue-600 hover:bg-blue-700";

  const tierIndex = PLANS.findIndex((p) => p.tier === currentTier);

  return (
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0 md:py-4 md:py-8">
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header */}
        <div className="mb-6 flex-shrink-0 px-4 md:px-6">
          <h1
            className={`text-2xl sm:text-3xl font-bold mb-2 ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            Subscription & Billing
          </h1>
          <p
            className={`text-sm sm:text-base ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Manage your plan, marketing credits, and billing
          </p>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-4 md:px-6 mb-6">
          <div
            className={`flex gap-1 border-b ${
              isLight ? "border-gray-200" : "border-gray-700"
            }`}
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "plans", label: "Plans" },
              { id: "billing", label: "Billing" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? `${accent} ${
                        isLight ? "border-blue-600" : "border-blue-400"
                      }`
                    : `border-transparent ${
                        isLight
                          ? "text-gray-500 hover:text-gray-700"
                          : "text-gray-400 hover:text-gray-200"
                      }`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-6">
          {/* ============================================ */}
          {/* OVERVIEW TAB                                 */}
          {/* ============================================ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Current Plan Card */}
              <div
                className={`rounded-xl p-5 sm:p-6 border ${
                  isLight
                    ? "bg-white border-gray-200 shadow-lg"
                    : "bg-gray-800/50 border-gray-700 shadow-lg shadow-blue-500/10"
                }`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <Crown
                        className={`w-6 h-6 ${
                          isLight ? "text-blue-600" : "text-blue-400"
                        }`}
                      />
                      <h2
                        className={`text-2xl font-bold ${
                          isLight ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {PLANS.find((p) => p.tier === currentTier)?.name ||
                          "Free"}{" "}
                        Plan
                      </h2>
                    </div>
                    <p
                      className={`text-sm ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {PLANS.find((p) => p.tier === currentTier)?.description}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isActive
                        ? isLight
                          ? "bg-green-100 text-green-700"
                          : "bg-green-900/30 text-green-400"
                        : isLight
                        ? "bg-gray-100 text-gray-500"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {subscription?.status
                      ? subscription.status.charAt(0).toUpperCase() +
                        subscription.status.slice(1)
                      : "Free"}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div
                    className={`p-4 rounded-lg ${
                      isLight ? "bg-gray-50" : "bg-gray-900/50"
                    }`}
                  >
                    <Coins
                      className={`w-5 h-5 mb-2 ${
                        isLight ? "text-amber-600" : "text-amber-400"
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      } mb-1`}
                    >
                      Credits Balance
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {(points?.balance ?? 0).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      available credits
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      isLight ? "bg-gray-50" : "bg-gray-900/50"
                    }`}
                  >
                    <Calendar
                      className={`w-5 h-5 mb-2 ${
                        isLight ? "text-blue-600" : "text-blue-400"
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      } mb-1`}
                    >
                      {subscription?.cancelAt
                        ? "Cancels On"
                        : "Next Renewal"}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {subscription?.currentPeriodEnd
                        ? new Date(
                            subscription.currentPeriodEnd
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      isLight ? "bg-gray-50" : "bg-gray-900/50"
                    }`}
                  >
                    <TrendingUp
                      className={`w-5 h-5 mb-2 ${
                        isLight ? "text-green-600" : "text-green-400"
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      } mb-1`}
                    >
                      Credits/Month
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {(
                        PLANS.find((p) => p.tier === currentTier)?.credits ?? 0
                      ).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      refreshes each billing cycle
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {currentTier === "free" ? (
                    <button
                      onClick={() => setActiveTab("plans")}
                      className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${accentBg}`}
                    >
                      Choose a Plan
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveTab("plans")}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${accentBg}`}
                      >
                        Change Plan
                      </button>
                      <button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                          isLight
                            ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                            : "border-gray-600 text-gray-300 hover:bg-gray-800"
                        }`}
                      >
                        {portalLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Manage Billing"
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Buy More Credits */}
              {currentTier !== "free" && (
                <BuyCreditsSection isLight={isLight} />
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* PLANS TAB                                    */}
          {/* ============================================ */}
          {activeTab === "plans" && (
            <div>
              <div className="mb-6">
                <h2
                  className={`text-xl font-bold mb-1 ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  Choose Your Plan
                </h2>
                <p
                  className={`text-sm ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Higher tiers include more monthly credits and better value
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {PLANS.map((plan) => {
                  const isCurrent = currentTier === plan.tier;
                  const isUpgrade =
                    PLANS.findIndex((p) => p.tier === plan.tier) > tierIndex;
                  const isDowngrade =
                    PLANS.findIndex((p) => p.tier === plan.tier) < tierIndex;

                  return (
                    <div
                      key={plan.tier}
                      className={`relative rounded-2xl p-5 border transition-all ${
                        plan.highlighted
                          ? isLight
                            ? "border-blue-500 bg-white shadow-xl shadow-blue-500/10 ring-1 ring-blue-500"
                            : "border-blue-500 bg-gray-800/80 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500"
                          : isCurrent
                          ? isLight
                            ? "border-green-300 bg-green-50/50"
                            : "border-green-800 bg-green-900/10"
                          : isLight
                          ? "border-gray-200 bg-white"
                          : "border-gray-700 bg-gray-800/50"
                      }`}
                    >
                      {/* Badges */}
                      {plan.highlighted && !isCurrent && (
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                            isLight
                              ? "bg-blue-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          Most Popular
                        </div>
                      )}
                      {isCurrent && (
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                            isLight
                              ? "bg-green-600 text-white"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          Current Plan
                        </div>
                      )}

                      {/* Plan Name */}
                      <h3
                        className={`text-lg font-bold mb-1 ${
                          isLight ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {plan.name}
                      </h3>

                      {/* Credits — Primary Metric */}
                      {plan.credits > 0 ? (
                        <div className="mb-2">
                          <span
                            className={`text-4xl font-bold ${
                              isLight ? "text-gray-900" : "text-white"
                            }`}
                          >
                            {plan.credits.toLocaleString()}
                          </span>
                          <span
                            className={`text-sm ml-1 ${
                              isLight ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            credits/mo
                          </span>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <span
                            className={`text-4xl font-bold ${
                              isLight ? "text-gray-900" : "text-white"
                            }`}
                          >
                            Free
                          </span>
                        </div>
                      )}

                      {/* Price — Secondary */}
                      {plan.price > 0 && (
                        <p
                          className={`text-sm mb-3 ${
                            isLight ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          ${plan.price}/mo
                        </p>
                      )}

                      {/* Description */}
                      <p
                        className={`text-sm mb-4 ${
                          isLight ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {plan.description}
                      </p>

                      {/* Features */}
                      <ul className="space-y-2 mb-5">
                        {plan.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2"
                          >
                            <Check
                              className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                isLight
                                  ? "text-green-600"
                                  : "text-green-400"
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                isLight
                                  ? "text-gray-700"
                                  : "text-gray-300"
                              }`}
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isCurrent ? (
                        <div
                          className={`w-full py-2.5 rounded-lg text-center text-sm font-semibold ${
                            isLight
                              ? "bg-gray-100 text-gray-400"
                              : "bg-gray-700 text-gray-500"
                          }`}
                        >
                          Current Plan
                        </div>
                      ) : plan.tier === "free" ? (
                        isActive && (
                          <button
                            onClick={handleManageBilling}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                              isLight
                                ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                : "border-gray-600 text-gray-300 hover:bg-gray-800"
                            }`}
                          >
                            Downgrade
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleUpgrade(plan.tier)}
                          disabled={upgradeLoading === plan.tier}
                          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                            upgradeLoading === plan.tier
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          } ${
                            plan.highlighted || isUpgrade
                              ? accentBg
                              : isLight
                              ? "bg-gray-800 hover:bg-gray-900"
                              : "bg-gray-600 hover:bg-gray-500"
                          }`}
                        >
                          {upgradeLoading === plan.tier ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              {isUpgrade ? "Upgrade" : "Switch"}{" "}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Note */}
              <p
                className={`mt-6 text-center text-sm ${
                  isLight ? "text-gray-400" : "text-gray-500"
                }`}
              >
                All plans are billed monthly. Cancel anytime. Credits refresh
                each billing cycle. Need more credits? Buy additional credits
                anytime from your dashboard.
              </p>
            </div>
          )}

          {/* ============================================ */}
          {/* BILLING TAB                                  */}
          {/* ============================================ */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              {/* Billing Management */}
              <div
                className={`rounded-xl p-5 sm:p-6 border ${
                  isLight
                    ? "bg-white border-gray-200 shadow-lg"
                    : "bg-gray-800/50 border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard
                    className={`w-6 h-6 ${
                      isLight ? "text-blue-600" : "text-blue-400"
                    }`}
                  />
                  <h2
                    className={`text-xl font-bold ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    Billing Management
                  </h2>
                </div>
                <p
                  className={`text-sm mb-4 ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  View invoices, update your payment method, and manage your
                  subscription through the Stripe billing portal.
                </p>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading || !subscription?.stripeSubscriptionId}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    !subscription?.stripeSubscriptionId
                      ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500"
                      : `text-white ${accentBg}`
                  }`}
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Open Billing Portal{" "}
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>
                {!subscription?.stripeSubscriptionId && (
                  <p
                    className={`text-xs mt-2 ${
                      isLight ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Subscribe to a paid plan to access billing management.
                  </p>
                )}
              </div>

              {/* Spending Summary */}
              <div
                className={`rounded-xl p-5 sm:p-6 border ${
                  isLight
                    ? "bg-white border-gray-200 shadow-lg"
                    : "bg-gray-800/50 border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Receipt
                    className={`w-6 h-6 ${
                      isLight ? "text-blue-600" : "text-blue-400"
                    }`}
                  />
                  <h2
                    className={`text-xl font-bold ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    Credit Spending Summary
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-lg ${
                      isLight ? "bg-green-50" : "bg-green-900/10"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      } mb-1`}
                    >
                      Total Earned
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isLight ? "text-green-700" : "text-green-400"
                      }`}
                    >
                      {(points?.totalEarned ?? 0).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      credits
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      isLight ? "bg-red-50" : "bg-red-900/10"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      } mb-1`}
                    >
                      Total Spent
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isLight ? "text-red-700" : "text-red-400"
                      }`}
                    >
                      {(points?.totalSpent ?? 0).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      credits
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      isLight ? "bg-blue-50" : "bg-blue-900/10"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      } mb-1`}
                    >
                      Available
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isLight ? "text-blue-700" : "text-blue-400"
                      }`}
                    >
                      {(points?.balance ?? 0).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      credits
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
