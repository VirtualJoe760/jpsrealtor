"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Search, MapPin, MessageSquare, CheckCircle2, Sparkles, LayoutDashboard, Coins } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function SubscriptionSuccess() {
  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    shadow,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const searchParams = useSearchParams();
  const isAgent = searchParams.get("plan") === "agent";

  const navigationItems = isAgent
    ? [
        { label: "Agent Dashboard", href: "/agent/dashboard", icon: LayoutDashboard, color: "blue", description: "View your credits and campaigns" },
        { label: "Manage Subscription", href: "/agent/subscription", icon: Coins, color: "emerald", description: "View plan details and billing" },
        { label: "Search for Homes", href: "/map", icon: Search, color: "purple", description: "Browse listings on the map" },
        { label: "Neighborhoods", href: "/neighborhoods", icon: MapPin, color: "amber", description: "Explore local communities" },
      ]
    : [
        { label: "Back to Dashboard", href: "/dashboard/settings", icon: Home, color: "blue", description: "View your account settings" },
        { label: "Search for Homes", href: "/map", icon: Search, color: "emerald", description: "Browse Coachella Valley listings" },
        { label: "AI Chat", href: "/?view=chat", icon: MessageSquare, color: "purple", description: "Ask our AI about properties" },
        { label: "Neighborhoods", href: "/neighborhoods", icon: MapPin, color: "amber", description: "Explore local communities" },
      ];

  const getIconBgColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: isLight ? "bg-blue-50" : "bg-blue-500/10",
      emerald: isLight ? "bg-emerald-50" : "bg-emerald-500/10",
      purple: isLight ? "bg-purple-50" : "bg-purple-500/10",
      amber: isLight ? "bg-amber-50" : "bg-amber-500/10",
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "text-blue-400",
      emerald: "text-emerald-400",
      purple: "text-purple-400",
      amber: "text-amber-400",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              isLight
                ? "bg-gradient-to-br from-green-100 to-emerald-100"
                : "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
            }`}>
              <CheckCircle2 className={`w-14 h-14 ${
                isLight ? "text-green-600" : "text-green-400"
              }`} />
            </div>
          </motion.div>

          <h1
            className={`text-4xl md:text-5xl font-bold mb-3 ${textPrimary}`}
          >
            {isAgent ? "You're All Set!" : "Welcome to Pro!"}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className={`w-5 h-5 ${isLight ? "text-blue-500" : "text-blue-400"}`} />
            <span className={`text-lg font-medium ${isLight ? "text-blue-600" : "text-blue-400"}`}>
              Your {isAgent ? "agent plan" : "upgrade"} is active
            </span>
            <Sparkles className={`w-5 h-5 ${isLight ? "text-blue-500" : "text-blue-400"}`} />
          </div>
          <p className={`${textSecondary} text-base max-w-lg mx-auto`}>
            {isAgent
              ? "Your marketing credits have been loaded. Start running campaigns with Google Ads, Meta Ads, direct mail, and voicemail drops."
              : "You now have unlimited saves, 100 AI queries per day, price alerts, and advanced search filters. Let's put them to work."
            }
          </p>
        </motion.div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow} block hover:scale-[1.02] transition-transform duration-300`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 ${getIconBgColor(item.color)} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-6 h-6 ${getIconColor(item.color)}`} />
                    </div>
                    <div>
                      <span className={`text-lg font-semibold ${textPrimary} block`}>
                        {item.label}
                      </span>
                      <span className={`text-sm ${textSecondary}`}>
                        {item.description}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Pro Features Recap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow}`}
        >
          <h3 className={`text-xl font-semibold ${textPrimary} mb-3`}>
            What's unlocked
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(isAgent
              ? [
                  "Marketing credits loaded",
                  "Google & Meta Ads campaigns",
                  "Direct mail campaigns",
                  "Voicemail drops",
                  "Partner cost-splitting",
                  "Campaign analytics",
                ]
              : [
                  "100 AI chat queries per day",
                  "Unlimited saved listings",
                  "Unlimited saved searches",
                  "Price drop & new listing alerts",
                  "Advanced search filters",
                  "Priority email support",
                ]
            ).map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-green-600" : "text-green-400"}`} />
                <span className={`text-sm ${textSecondary}`}>{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
