// src/app/admin/subscriptions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  DollarSign,
  Users,
  CreditCard,
  TrendingDown,
  Gift,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Subscription = {
  _id: string;
  agentId: { _id: string; name: string; email: string; image?: string } | null;
  tier: string;
  status: string;
  monthlyPrice: number;
  currentPeriodEnd: string;
  creditsBalance: number;
  totalEarned: number;
  totalSpent: number;
};

type Stats = {
  mrr: number;
  totalSubscribers: number;
  totalCreditsOutstanding: number;
  totalCreditsSpent: number;
  revenueByTier: Record<string, { count: number; mrr: number }>;
};

type CancellationReason = {
  reason: string;
  count: number;
};

type SortField = "tier" | "creditsBalance" | "currentPeriodEnd";
type SortDir = "asc" | "desc";

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const {
    textPrimary,
    textSecondary,
    textMuted,
    cardBg,
    cardBorder,
    border,
    buttonPrimary,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("currentPeriodEnd");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Gift credits state
  const [giftSearch, setGiftSearch] = useState("");
  const [giftUserId, setGiftUserId] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftReason, setGiftReason] = useState("");
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftMessage, setGiftMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || null);
      setCancellationReasons(data.cancellationReasons || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Sorting
  const tierOrder: Record<string, number> = { free: 0, beginner: 1, experienced: 2, topagent: 3 };

  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    let cmp = 0;
    if (sortField === "tier") {
      cmp = (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0);
    } else if (sortField === "creditsBalance") {
      cmp = a.creditsBalance - b.creditsBalance;
    } else if (sortField === "currentPeriodEnd") {
      cmp = new Date(a.currentPeriodEnd).getTime() - new Date(b.currentPeriodEnd).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Gift credits
  async function handleGiftCredits() {
    if (!giftUserId || !giftAmount) return;
    setGiftLoading(true);
    setGiftMessage(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: giftUserId,
          amount: parseInt(giftAmount),
          reason: giftReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGiftMessage(`Credited! New balance: ${data.newBalance} points`);
      setGiftAmount("");
      setGiftReason("");
      fetchData(); // Refresh data
    } catch (err: any) {
      setGiftMessage(`Error: ${err.message}`);
    } finally {
      setGiftLoading(false);
    }
  }

  // Filtered users for gift search
  const filteredUsers = subscriptions.filter((s) => {
    if (!giftSearch) return false;
    const search = giftSearch.toLowerCase();
    return (
      s.agentId?.name?.toLowerCase().includes(search) ||
      s.agentId?.email?.toLowerCase().includes(search)
    );
  });

  // Tier badge styling
  function tierBadge(tier: string) {
    const styles: Record<string, string> = {
      free: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      beginner: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      experienced: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      topagent: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
    const labels: Record<string, string> = {
      free: "Free",
      beginner: "Beginner",
      experienced: "Experienced",
      topagent: "Top Agent",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[tier] || styles.free}`}>
        {labels[tier] || tier}
      </span>
    );
  }

  function statusBadge(st: string) {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      trialing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
      past_due: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
      paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[st] || styles.active}`}>
        {st}
      </span>
    );
  }

  const cardClass = `rounded-xl p-5 ${isLight ? "bg-white border border-gray-200" : "bg-white/5 border border-white/10"}`;
  const tableHeaderClass = isLight ? "bg-gray-50 text-gray-600" : "bg-white/5 text-gray-400";

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        Loading subscriptions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textPrimary}`}>Subscriptions & Revenue</h1>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <span className={`text-sm ${textSecondary}`}>MRR</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>
            ${stats?.mrr?.toLocaleString() ?? 0}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`text-sm ${textSecondary}`}>Total Subscribers</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>
            {stats?.totalSubscribers ?? 0}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className={`text-sm ${textSecondary}`}>Credits Outstanding</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>
            {stats?.totalCreditsOutstanding?.toLocaleString() ?? 0}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <TrendingDown size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <span className={`text-sm ${textSecondary}`}>Credits Spent (Lifetime)</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>
            {stats?.totalCreditsSpent?.toLocaleString() ?? 0}
          </p>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className={cardClass}>
        <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Subscribers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="text-left px-3 py-2 rounded-tl-lg">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th
                  className="text-left px-3 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("tier")}
                >
                  <span className="inline-flex items-center gap-1">
                    Tier <ArrowUpDown size={12} />
                  </span>
                </th>
                <th className="text-left px-3 py-2">Status</th>
                <th
                  className="text-right px-3 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("creditsBalance")}
                >
                  <span className="inline-flex items-center gap-1">
                    Credits <ArrowUpDown size={12} />
                  </span>
                </th>
                <th
                  className="text-left px-3 py-2 rounded-tr-lg cursor-pointer select-none"
                  onClick={() => toggleSort("currentPeriodEnd")}
                >
                  <span className="inline-flex items-center gap-1">
                    Renewal <ArrowUpDown size={12} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSubscriptions.map((sub) => (
                <tr
                  key={sub._id}
                  className={`border-t ${border} cursor-pointer ${
                    isLight ? "hover:bg-gray-50" : "hover:bg-white/5"
                  } transition-colors`}
                  onClick={() => setExpandedId(expandedId === sub._id ? null : sub._id)}
                >
                  <td className={`px-3 py-2.5 ${textPrimary}`}>
                    <div className="flex items-center gap-2">
                      {expandedId === sub._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {sub.agentId?.name || "Unknown"}
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 ${textSecondary}`}>
                    {sub.agentId?.email || "-"}
                  </td>
                  <td className="px-3 py-2.5">{tierBadge(sub.tier)}</td>
                  <td className="px-3 py-2.5">{statusBadge(sub.status)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono ${textPrimary}`}>
                    {sub.creditsBalance.toLocaleString()}
                  </td>
                  <td className={`px-3 py-2.5 ${textSecondary}`}>
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
              {sortedSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className={`text-center py-8 ${textMuted}`}>
                    No subscriptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gift Credits Section */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-purple-500" />
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Gift Credits</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User selection */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${textSecondary}`}>Select User</label>
            <div className="relative">
              <Search size={14} className={`absolute left-3 top-2.5 ${textMuted}`} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={giftSearch}
                onChange={(e) => {
                  setGiftSearch(e.target.value);
                  setGiftUserId("");
                }}
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${border} ${
                  isLight ? "bg-white" : "bg-white/5"
                } ${textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              />
            </div>
            {giftSearch && filteredUsers.length > 0 && !giftUserId && (
              <div
                className={`border ${border} rounded-lg overflow-hidden max-h-40 overflow-y-auto ${
                  isLight ? "bg-white" : "bg-gray-800"
                }`}
              >
                {filteredUsers.slice(0, 8).map((s) => (
                  <button
                    key={s._id}
                    onClick={() => {
                      setGiftUserId(s.agentId?._id || "");
                      setGiftSearch(s.agentId?.name || s.agentId?.email || "");
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      isLight ? "hover:bg-gray-100" : "hover:bg-white/10"
                    } ${textPrimary}`}
                  >
                    <span className="font-medium">{s.agentId?.name}</span>{" "}
                    <span className={textMuted}>({s.agentId?.email})</span>
                  </button>
                ))}
              </div>
            )}
            {giftUserId && (
              <p className={`text-xs ${textMuted}`}>Selected user ID: {giftUserId}</p>
            )}
          </div>

          {/* Amount and reason */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${textSecondary}`}>Amount (points)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 500"
              value={giftAmount}
              onChange={(e) => setGiftAmount(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm border ${border} ${
                isLight ? "bg-white" : "bg-white/5"
              } ${textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
            <label className={`text-sm font-medium ${textSecondary}`}>Reason</label>
            <input
              type="text"
              placeholder="e.g. Loyalty bonus, bug compensation..."
              value={giftReason}
              onChange={(e) => setGiftReason(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm border ${border} ${
                isLight ? "bg-white" : "bg-white/5"
              } ${textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleGiftCredits}
            disabled={!giftUserId || !giftAmount || giftLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {giftLoading ? "Sending..." : "Gift Credits"}
          </button>
          {giftMessage && (
            <span
              className={`text-sm ${
                giftMessage.startsWith("Error") ? "text-red-500" : "text-green-500"
              }`}
            >
              {giftMessage}
            </span>
          )}
        </div>
      </div>

      {/* Cancellation Insights */}
      <div className={cardClass}>
        <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Cancellation Insights</h2>
        {cancellationReasons.length === 0 ? (
          <p className={`text-sm ${textMuted}`}>No cancellation data available yet.</p>
        ) : (
          <div className="space-y-2">
            {cancellationReasons.map((r) => (
              <div
                key={r.reason}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  isLight ? "bg-gray-50" : "bg-white/5"
                }`}
              >
                <span className={`text-sm ${textPrimary}`}>{r.reason}</span>
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    isLight ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-300"
                  }`}
                >
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
