"use client";

import { useEffect, useState } from "react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  Users,
  UserCheck,
  Handshake,
  CreditCard,
  DollarSign,
  Coins,
  Clock,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeAgents: number;
  servicePartners: number;
  activeSubscriptions: number;
  pendingAgentApps: number;
  pendingPartnerApps: number;
  totalPartnerships: number;
  credits: { totalBalance: number; totalEarned: number; totalSpent: number };
  mrr: number;
}

export default function AdminOverviewPage() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary, border, cardBg } = useThemeClasses();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse">Loading admin stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Active Agents", value: stats?.activeAgents ?? 0, icon: UserCheck, color: "text-green-500" },
    { label: "Service Partners", value: stats?.servicePartners ?? 0, icon: Handshake, color: "text-purple-500" },
    { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: "text-indigo-500" },
    { label: "MRR", value: `$${(stats?.mrr ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Credits Outstanding", value: stats?.credits?.totalBalance ?? 0, icon: Coins, color: "text-amber-500" },
    { label: "Pending Applications", value: (stats?.pendingAgentApps ?? 0) + (stats?.pendingPartnerApps ?? 0), icon: Clock, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${textPrimary}`}>Platform Overview</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${cardBg} border ${border} rounded-xl p-4 flex items-center gap-4`}
            >
              <div className={`p-2.5 rounded-lg ${isLight ? "bg-gray-100" : "bg-white/5"}`}>
                <Icon size={22} className={card.color} />
              </div>
              <div>
                <div className={`text-sm ${textSecondary}`}>{card.label}</div>
                <div className={`text-xl font-bold ${textPrimary}`}>{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity placeholder */}
      <div className={`${cardBg} border ${border} rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Recent Activity</h3>
        <div className={`text-sm ${textSecondary} text-center py-8`}>
          Activity feed coming soon...
        </div>
      </div>
    </div>
  );
}
