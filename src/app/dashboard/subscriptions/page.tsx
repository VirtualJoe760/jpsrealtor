"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  Zap,
  Check,
  X,
  Crown,
  Sparkles,
  Shield,
  ArrowRight,
  BarChart3,
  Home
} from "lucide-react";

export default function SubscriptionsPage() {
  const { data: session } = useSession();
  const { currentTheme } = useTheme();
  const { bgPrimary, bgSecondary, textPrimary, textSecondary, border, cardBg } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "billing" | "plans">("overview");

  // Mock data - replace with actual API calls
  const userSubscription = {
    tier: "Free",
    userType: "general", // general, investor, investor_pro, investor_enterprise
    status: "active",
    renewalDate: "N/A",
    aiMessagesUsed: 15,
    aiMessagesLimit: 20,
    cmaGenerationsUsed: 0,
    cmaGenerationsLimit: 0,
    cashFlowAnalysesUsed: 0,
    cashFlowAnalysesLimit: 0,
    savedFavorites: 3,
    favoritesLimit: 0, // 0 = requires account
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Basic property search and browsing",
      userType: "general",
      features: [
        "20 AI messages per day",
        "Map view access",
        "Basic property search",
        "Save favorites (requires account)"
      ],
      notIncluded: [
        "CMA generation",
        "Neighborhood stats",
        "Email alerts",
        "Advanced filters"
      ],
      badge: "Current",
    },
    {
      name: "Premium Client",
      price: "$9.99",
      period: "month",
      description: "Enhanced search and personalization",
      userType: "general",
      features: [
        "Unlimited AI messages",
        "Full list and grid view",
        "Save unlimited favorites",
        "Email property alerts",
        "Advanced search filters",
        "Neighborhood insights"
      ],
      notIncluded: ["CMA generation", "Investment analysis"],
      badge: "Upgrade",
    },
    {
      name: "Investor Pro",
      price: "$49",
      period: "month",
      description: "Comprehensive investment analysis",
      userType: "investor",
      features: [
        "Unlimited CMA generations",
        "Unlimited cash flow analysis",
        "Market trend analysis",
        "Portfolio tracking",
        "Deal pipeline management",
        "Unlimited AI messages",
        "Priority support"
      ],
      notIncluded: [],
      badge: "Popular",
    },
    {
      name: "Investor Enterprise",
      price: "$149",
      period: "month",
      description: "API access and bulk analysis",
      userType: "investor",
      features: [
        "Everything in Investor Pro",
        "API access for property data",
        "Bulk property analysis",
        "Custom reporting",
        "White-label CMA reports",
        "Dedicated account manager",
        "Advanced market forecasting"
      ],
      notIncluded: [],
      badge: "Pro",
    }
  ];

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-2`}>
            Subscription & Billing
          </h1>
          <p className={textSecondary}>
            Manage your subscription, usage, and billing information
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 border-b ${border} mb-8 overflow-x-auto`}>
          {[
            { id: "overview", label: "Overview" },
            { id: "usage", label: "Usage" },
            { id: "billing", label: "Billing" },
            { id: "plans", label: "Plans" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? isLight
                    ? "border-blue-600 text-blue-600"
                    : "border-emerald-500 text-emerald-400"
                  : `border-transparent ${textSecondary} hover:${textPrimary}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className={`${cardBg} rounded-xl p-6 border ${border} shadow-lg`}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className={`w-6 h-6 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                    <h2 className={`text-2xl font-bold ${textPrimary}`}>
                      {userSubscription.tier}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isLight ? "bg-gray-100 text-gray-700" : "bg-gray-800 text-gray-300"
                    }`}>
                      {userSubscription.userType === "general" ? "Client" : "Investor"}
                    </span>
                  </div>
                  <p className={textSecondary}>
                    {userSubscription.tier === "Free"
                      ? "Browse properties and save favorites - upgrade for unlimited access"
                      : "Full access to premium features and analytics"}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${
                  isLight ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                }`}>
                  <span className="text-sm font-semibold">Active</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
                  <Calendar className={`w-5 h-5 ${textSecondary} mb-2`} />
                  <p className={`text-sm ${textSecondary} mb-1`}>Next Renewal</p>
                  <p className={`font-semibold ${textPrimary}`}>{userSubscription.renewalDate}</p>
                </div>
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
                  <TrendingUp className={`w-5 h-5 ${textSecondary} mb-2`} />
                  <p className={`text-sm ${textSecondary} mb-1`}>Saved Favorites</p>
                  <p className={`font-semibold ${textPrimary}`}>
                    {userSubscription.savedFavorites}
                    {userSubscription.favoritesLimit > 0 ? `/${userSubscription.favoritesLimit}` : " (requires account)"}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
                  <Zap className={`w-5 h-5 ${textSecondary} mb-2`} />
                  <p className={`text-sm ${textSecondary} mb-1`}>Daily Messages</p>
                  <p className={`font-semibold ${textPrimary}`}>
                    {userSubscription.aiMessagesUsed}/{userSubscription.aiMessagesLimit}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  isLight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                }`}>
                  Upgrade Plan
                </button>
                {userSubscription.tier !== "Free" && (
                  <button className={`px-6 py-3 rounded-lg font-semibold transition-all border ${border} ${
                    isLight ? "hover:bg-gray-50" : "hover:bg-gray-800"
                  }`}>
                    Manage Billing
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                <Sparkles className={`w-8 h-8 ${isLight ? "text-blue-600" : "text-emerald-400"} mb-3`} />
                <p className={`text-sm ${textSecondary} mb-1`}>AI Messages Today</p>
                <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                  {userSubscription.aiMessagesUsed}/{userSubscription.aiMessagesLimit}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${isLight ? "bg-blue-600" : "bg-emerald-500"}`}
                    style={{ width: `${(userSubscription.aiMessagesUsed / userSubscription.aiMessagesLimit) * 100}%` }}
                  />
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                <Home className={`w-8 h-8 ${isLight ? "text-purple-600" : "text-purple-400"} mb-3`} />
                <p className={`text-sm ${textSecondary} mb-1`}>Saved Favorites</p>
                <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                  {userSubscription.savedFavorites}
                </p>
                <p className={`text-xs ${textSecondary}`}>
                  {userSubscription.favoritesLimit === 0 ? "Requires account" : `Unlimited`}
                </p>
              </div>

              {userSubscription.userType === "investor" && (
                <>
                  <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                    <BarChart3 className={`w-8 h-8 ${isLight ? "text-green-600" : "text-green-400"} mb-3`} />
                    <p className={`text-sm ${textSecondary} mb-1`}>CMA Generations Today</p>
                    <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                      {userSubscription.cmaGenerationsUsed}
                      {userSubscription.cmaGenerationsLimit > 0 ? `/${userSubscription.cmaGenerationsLimit}` : ""}
                    </p>
                    <p className={`text-xs ${textSecondary}`}>
                      {userSubscription.cmaGenerationsLimit === 0 ? "Upgrade for access" : ""}
                    </p>
                  </div>

                  <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                    <Shield className={`w-8 h-8 ${isLight ? "text-orange-600" : "text-orange-400"} mb-3`} />
                    <p className={`text-sm ${textSecondary} mb-1`}>Cash Flow Analyses Today</p>
                    <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                      {userSubscription.cashFlowAnalysesUsed}
                      {userSubscription.cashFlowAnalysesLimit > 0 ? `/${userSubscription.cashFlowAnalysesLimit}` : ""}
                    </p>
                    <p className={`text-xs ${textSecondary}`}>
                      {userSubscription.cashFlowAnalysesLimit === 0 ? "Upgrade for access" : ""}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === "usage" && (
          <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Usage Details</h2>
            <p className={textSecondary}>Usage tracking and detailed analytics coming soon...</p>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Billing History</h2>
            <p className={textSecondary}>Billing history and invoices coming soon...</p>
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === "plans" && (
          <div>
            <div className="mb-8">
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Choose Your Plan</h2>
              <p className={textSecondary}>
                Select the plan that best fits your needs. Upgrade or downgrade anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`${cardBg} rounded-xl p-6 border ${
                    plan.badge === "Upgrade" || plan.badge === "Popular"
                      ? isLight ? "border-blue-500 shadow-blue-500/20" : "border-emerald-500 shadow-emerald-500/20"
                      : border
                  } shadow-lg relative`}
                >
                  {plan.badge && (
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.badge === "Current"
                        ? isLight ? "bg-gray-200 text-gray-700" : "bg-gray-700 text-gray-300"
                        : isLight ? "bg-blue-600 text-white" : "bg-emerald-500 text-black"
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>{plan.name}</h3>
                  <p className={`text-sm ${textSecondary} mb-4`}>{plan.description}</p>

                  <div className="mb-6">
                    <span className={`text-4xl font-bold ${textPrimary}`}>{plan.price}</span>
                    <span className={`text-sm ${textSecondary}`}>/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className={`w-5 h-5 ${isLight ? "text-green-600" : "text-green-400"} flex-shrink-0 mt-0.5`} />
                        <span className={`text-sm ${textPrimary}`}>{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature, idx) => (
                      <li key={`not-${idx}`} className="flex items-start gap-2">
                        <X className={`w-5 h-5 ${textSecondary} flex-shrink-0 mt-0.5`} />
                        <span className={`text-sm ${textSecondary} line-through`}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      plan.badge === "Upgrade" || plan.badge === "Popular"
                        ? isLight
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-emerald-500 text-black hover:bg-emerald-400"
                        : plan.badge === "Current"
                        ? `bg-gray-200 dark:bg-gray-700 cursor-not-allowed ${textSecondary}`
                        : `border ${border} ${isLight ? "hover:bg-gray-50" : "hover:bg-gray-800"}`
                    }`}
                    disabled={plan.badge === "Current"}
                  >
                    {plan.badge === "Current" ? "Current Plan" : plan.badge === "Upgrade" ? "Upgrade Now" : "Select Plan"}
                    {plan.badge !== "Current" && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
