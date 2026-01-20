"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import AgentNav from "@/app/components/AgentNav";
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
  ArrowRight
} from "lucide-react";

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { currentTheme } = useTheme();
  const { bgPrimary, bgSecondary, textPrimary, textSecondary, border, cardBg } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "billing" | "plans">("overview");

  // Mock data - replace with actual API calls
  const userSubscription = {
    tier: "Inside Agent Free",
    status: "active",
    renewalDate: "Feb 17, 2026",
    isExpAgent: true,
    aiTokensUsed: 45,
    aiTokensLimit: 100,
    voicemailCreditsUsed: 12,
    voicemailCreditsLimit: 50,
    contactsCount: 150,
    contactsLimit: 500,
    activeCampaigns: 2,
    campaignsLimit: 5,
  };

  const plans = [
    {
      name: "General User Premium",
      price: "$9.99",
      period: "month",
      description: "Perfect for buyers and sellers",
      features: [
        "Unlimited AI messages",
        "Save unlimited favorites",
        "Email property alerts",
        "Advanced search filters",
        "Neighborhood insights"
      ],
      notIncluded: ["CRM access", "Campaign management"],
      badge: null,
      userType: "general"
    },
    {
      name: "Investor Pro",
      price: "$49",
      period: "month",
      description: "Comprehensive investment analysis",
      features: [
        "Unlimited CMA generations",
        "Unlimited cash flow analysis",
        "Market trend analysis",
        "Portfolio tracking",
        "Deal pipeline management",
        "Priority support"
      ],
      notIncluded: [],
      badge: "Most Popular",
      userType: "investor"
    },
    {
      name: "Inside Agent Pro",
      price: "$99",
      period: "month",
      description: "Enhanced CRM for eXp agents",
      features: [
        "Full CRM access",
        "1,000 AI tokens/month",
        "500 voicemail credits/month",
        "Unlimited contacts",
        "Unlimited campaigns",
        "Advanced analytics",
        "A/B testing",
        "API access"
      ],
      notIncluded: [],
      badge: "Upgrade",
      userType: "inside_agent"
    },
    {
      name: "Outside Agent",
      price: "$399",
      period: "month",
      description: "Full platform access + 10% commission split",
      features: [
        "All Inside Agent Pro features",
        "500 AI tokens/month",
        "200 voicemail credits/month",
        "Lead generation tools",
        "External CRM integrations",
        "Priority support",
        "White-label option (+$100/mo)"
      ],
      notIncluded: [],
      badge: "Pro",
      userType: "outside_agent"
    }
  ];

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        <AgentNav />

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
                    {userSubscription.isExpAgent && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/30 text-emerald-400"
                      }`}>
                        eXp Agent
                      </span>
                    )}
                  </div>
                  <p className={textSecondary}>
                    Monetized via eXp rev-share model (80/20 split until $80k cap)
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${
                  isLight ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                }`}>
                  <span className="text-sm font-semibold">Active</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
                  <Calendar className={`w-5 h-5 ${textSecondary} mb-2`} />
                  <p className={`text-sm ${textSecondary} mb-1`}>Next Renewal</p>
                  <p className={`font-semibold ${textPrimary}`}>{userSubscription.renewalDate}</p>
                </div>
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
                  <TrendingUp className={`w-5 h-5 ${textSecondary} mb-2`} />
                  <p className={`text-sm ${textSecondary} mb-1`}>Annual Production</p>
                  <p className={`font-semibold ${textPrimary}`}>$42,500</p>
                </div>
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
                  <Zap className={`w-5 h-5 ${textSecondary} mb-2`} />
                  <p className={`text-sm ${textSecondary} mb-1`}>Rev-Share Status</p>
                  <p className={`font-semibold ${textPrimary}`}>$37,500 until cap</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  isLight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                }`}>
                  Upgrade to Pro
                </button>
                <button className={`px-6 py-3 rounded-lg font-semibold transition-all border ${border} ${
                  isLight ? "hover:bg-gray-50" : "hover:bg-gray-800"
                }`}>
                  Manage Billing
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                <Sparkles className={`w-8 h-8 ${isLight ? "text-blue-600" : "text-emerald-400"} mb-3`} />
                <p className={`text-sm ${textSecondary} mb-1`}>AI Tokens</p>
                <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                  {userSubscription.aiTokensUsed}/{userSubscription.aiTokensLimit}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${isLight ? "bg-blue-600" : "bg-emerald-500"}`}
                    style={{ width: `${(userSubscription.aiTokensUsed / userSubscription.aiTokensLimit) * 100}%` }}
                  />
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                <CreditCard className={`w-8 h-8 ${isLight ? "text-purple-600" : "text-purple-400"} mb-3`} />
                <p className={`text-sm ${textSecondary} mb-1`}>Voicemail Credits</p>
                <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                  {userSubscription.voicemailCreditsUsed}/{userSubscription.voicemailCreditsLimit}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{ width: `${(userSubscription.voicemailCreditsUsed / userSubscription.voicemailCreditsLimit) * 100}%` }}
                  />
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                <Shield className={`w-8 h-8 ${isLight ? "text-green-600" : "text-green-400"} mb-3`} />
                <p className={`text-sm ${textSecondary} mb-1`}>Contacts</p>
                <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                  {userSubscription.contactsCount}/{userSubscription.contactsLimit}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: `${(userSubscription.contactsCount / userSubscription.contactsLimit) * 100}%` }}
                  />
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6 border ${border}`}>
                <TrendingUp className={`w-8 h-8 ${isLight ? "text-orange-600" : "text-orange-400"} mb-3`} />
                <p className={`text-sm ${textSecondary} mb-1`}>Active Campaigns</p>
                <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                  {userSubscription.activeCampaigns}/{userSubscription.campaignsLimit}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-orange-600"
                    style={{ width: `${(userSubscription.activeCampaigns / userSubscription.campaignsLimit) * 100}%` }}
                  />
                </div>
              </div>
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
                    plan.badge === "Upgrade"
                      ? isLight ? "border-blue-500 shadow-blue-500/20" : "border-emerald-500 shadow-emerald-500/20"
                      : border
                  } shadow-lg relative`}
                >
                  {plan.badge && (
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${
                      isLight ? "bg-blue-600 text-white" : "bg-emerald-500 text-black"
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

                  <button className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    plan.badge === "Upgrade"
                      ? isLight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                      : `border ${border} ${isLight ? "hover:bg-gray-50" : "hover:bg-gray-800"}`
                  }`}>
                    {plan.badge === "Upgrade" ? "Upgrade Now" : "Select Plan"}
                    <ArrowRight className="w-4 h-4" />
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
