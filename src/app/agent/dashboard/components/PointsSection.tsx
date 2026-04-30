"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Gift,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  channel?: string;
  adSpendValue?: number;
  createdAt: string;
}

interface TierConfig {
  name: string;
  tier: string;
  monthlyPrice: number;
  monthlyPoints: number;
  adSpendRate: number;
  adValuePerPoint: number;
}

interface PointsData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  tier: string;
  tierConfig: TierConfig;
  adSpendAvailable: number;
  transactions: Transaction[];
  totalTransactions: number;
}

const TRANSACTION_ICONS: Record<string, typeof Coins> = {
  subscription_credit: Zap,
  topup_purchase: Plus,
  campaign_spend: Target,
  refund: RefreshCw,
  bonus: Gift,
  partner_split_credit: ArrowDownRight,
  partner_split_debit: ArrowUpRight,
  adjustment: RefreshCw,
};

const CHANNEL_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  direct_mail: "Direct Mail",
  voicemail_drop: "Voicemail Drop",
};

export default function PointsSection() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [data, setData] = useState<PointsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);

  const fetchPoints = useCallback(async () => {
    try {
      const res = await fetch("/api/points?limit=50");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching points:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 10) {
      alert("Minimum purchase is $10");
      return;
    }

    setTopUpLoading(true);
    try {
      const res = await fetch("/api/points/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.url) {
          window.location.href = result.url;
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create top-up");
      }
    } catch (error) {
      console.error("Error creating top-up:", error);
      alert("Failed to create top-up");
    } finally {
      setTopUpLoading(false);
    }
  };

  const QUICK_AMOUNTS = [50, 100, 250, 500];

  if (isLoading) {
    return (
      <div
        className={`rounded-xl p-6 ${
          isLight
            ? "bg-white/30 shadow-lg"
            : "bg-neutral-900/30 shadow-lg shadow-blue-500/20"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Coins className={`w-6 h-6 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
          <h2 className={`text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Marketing Credits
          </h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const tier = data?.tierConfig;
  const transactions = data?.transactions ?? [];
  const visibleTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 5);

  return (
    <div
      className={`rounded-xl p-4 sm:p-6 ${
        isLight
          ? "bg-white/30 shadow-lg"
          : "bg-neutral-900/30 shadow-lg shadow-blue-500/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Coins className={`w-6 h-6 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
          <h2 className={`text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Marketing Credits
          </h2>
        </div>
        {tier && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              tier.tier === "topagent"
                ? isLight
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : tier.tier === "experienced"
                ? isLight
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                : isLight
                ? "bg-gray-100 text-gray-700 border border-gray-300"
                : "bg-gray-700 text-gray-300 border border-gray-600"
            }`}
          >
            {tier.name}
          </span>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Points Balance */}
        <div
          className={`rounded-xl p-4 ${
            isLight
              ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
              : "bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-800/50"
          }`}
        >
          <p className={`text-xs font-medium mb-1 ${isLight ? "text-amber-700" : "text-amber-400"}`}>
            Available Credits
          </p>
          <p className={`text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            {balance.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Coins className={`w-3 h-3 ${isLight ? "text-amber-500" : "text-amber-400"}`} />
            <p className={`text-xs ${isLight ? "text-amber-600" : "text-amber-400/70"}`}>
              {tier ? `${tier.monthlyPoints.toLocaleString()} credits/month` : "Subscribe to earn credits"}
            </p>
          </div>
        </div>

        {/* Ad Spend Value */}
        <div
          className={`rounded-xl p-4 ${
            isLight
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
              : "bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-800/50"
          }`}
        >
          <p className={`text-xs font-medium mb-1 ${isLight ? "text-green-700" : "text-green-400"}`}>
            Credits Spent
          </p>
          <p className={`text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            {(data?.totalSpent ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Coins className={`w-3 h-3 ${isLight ? "text-green-500" : "text-green-400"}`} />
            <p className={`text-xs ${isLight ? "text-green-600" : "text-green-400/70"}`}>
              {tier ? tier.name : "—"}
            </p>
          </div>
        </div>

        {/* Lifetime Stats */}
        <div
          className={`rounded-xl p-4 ${
            isLight
              ? "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"
              : "bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-800/50"
          }`}
        >
          <p className={`text-xs font-medium mb-1 ${isLight ? "text-blue-700" : "text-blue-400"}`}>
            Lifetime
          </p>
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1">
                <TrendingUp className={`w-3 h-3 ${isLight ? "text-green-600" : "text-green-400"}`} />
                <span className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {(data?.totalEarned ?? 0).toLocaleString()}
                </span>
              </div>
              <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>earned</p>
            </div>
            <div className={`w-px h-8 ${isLight ? "bg-blue-200" : "bg-blue-800"}`} />
            <div>
              <div className="flex items-center gap-1">
                <TrendingDown className={`w-3 h-3 ${isLight ? "text-red-500" : "text-red-400"}`} />
                <span className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {(data?.totalSpent ?? 0).toLocaleString()}
                </span>
              </div>
              <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Up Section */}
      <div className="mb-5">
        <button
          onClick={() => setShowTopUp(!showTopUp)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isLight
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-amber-600 hover:bg-amber-700 text-white"
          }`}
        >
          <Plus className="w-4 h-4" />
          Buy More Credits
        </button>

        {showTopUp && (
          <div
            className={`mt-3 p-4 rounded-xl border ${
              isLight ? "bg-white border-gray-200" : "bg-gray-800/50 border-gray-700"
            }`}
          >
            <p className={`text-sm font-medium mb-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              Purchase credits {tier && `(${tier.name} tier)`}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopUpAmount(amt.toString())}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    topUpAmount === amt.toString()
                      ? "bg-amber-600 text-white"
                      : isLight
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  ${amt} {tier ? `(${Math.floor(amt / (tier.monthlyPrice / tier.monthlyPoints)).toLocaleString()} cr)` : ''}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                  $
                </span>
                <input
                  type="number"
                  min="10"
                  step="1"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Custom amount"
                  className={`w-full pl-7 pr-3 py-2 rounded-lg text-sm border ${
                    isLight
                      ? "border-gray-300 bg-white text-gray-900 placeholder-gray-400"
                      : "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
                  }`}
                />
              </div>
              <button
                onClick={handleTopUp}
                disabled={topUpLoading || !topUpAmount}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  topUpLoading || !topUpAmount
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } bg-amber-600 hover:bg-amber-700 text-white`}
              >
                {topUpLoading ? "..." : "Purchase"}
              </button>
            </div>
            {topUpAmount && parseFloat(topUpAmount) >= 10 && tier && (
              <p className={`text-xs mt-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                ${topUpAmount} = ~{Math.floor(parseFloat(topUpAmount) / (tier.monthlyPrice / tier.monthlyPoints)).toLocaleString()} credits
              </p>
            )}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
          Recent Activity
        </h3>

        {transactions.length === 0 ? (
          <div className={`text-center py-8 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/30"}`}>
            <Coins className={`w-8 h-8 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
            <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              No transactions yet
            </p>
            <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
              Subscribe to a plan to start earning credits
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {visibleTransactions.map((tx) => {
                const isCredit = tx.amount > 0;
                const Icon = TRANSACTION_ICONS[tx.type] || Coins;

                return (
                  <div
                    key={tx._id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      isLight ? "hover:bg-gray-50" : "hover:bg-gray-800/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCredit
                          ? isLight
                            ? "bg-green-100"
                            : "bg-green-900/30"
                          : isLight
                          ? "bg-red-50"
                          : "bg-red-900/20"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isCredit
                            ? isLight
                              ? "text-green-600"
                              : "text-green-400"
                            : isLight
                            ? "text-red-500"
                            : "text-red-400"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isLight ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                        {tx.channel && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              isLight ? "bg-gray-100 text-gray-500" : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            {CHANNEL_LABELS[tx.channel] || tx.channel}
                          </span>
                        )}
                        {tx.adSpendValue && (
                          <span className={`text-xs ${isLight ? "text-green-600" : "text-green-400"}`}>
                            {Math.round(tx.adSpendValue * 8)} credits value
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          isCredit
                            ? isLight
                              ? "text-green-600"
                              : "text-green-400"
                            : isLight
                            ? "text-red-600"
                            : "text-red-400"
                        }`}
                      >
                        {isCredit ? "+" : ""}{tx.amount.toLocaleString()}
                      </p>
                      <p className={`text-xs ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                        bal: {tx.balanceAfter.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {transactions.length > 5 && (
              <button
                onClick={() => setShowAllTransactions(!showAllTransactions)}
                className={`w-full mt-2 py-2 flex items-center justify-center gap-1 text-sm font-medium rounded-lg transition-colors ${
                  isLight
                    ? "text-gray-600 hover:bg-gray-50"
                    : "text-gray-400 hover:bg-gray-800/30"
                }`}
              >
                {showAllTransactions ? (
                  <>Show Less <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>View All ({transactions.length}) <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
