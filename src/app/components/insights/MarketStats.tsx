"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Percent, TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, Loader2, LineChart, Home, Landmark, Info } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface MarketData {
  mortgageRates: {
    current: {
      thirtyYear: number | null;
      fifteenYear: number | null;
      fiveOneArm: number | null;
    };
    historical: {
      date: string;
      thirtyYear: number;
      fifteenYear: number;
    }[];
  };
  economicIndicators: {
    inflation: number | null;
    unemployment: number | null;
    homePriceIndex: number | null;
    gdpGrowth: number | null;
    housingStarts: number | null;
    treasuryRate: number | null;
  };
}

export default function MarketStats() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trends" | "comparison" | "economy">("trends");
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted, shadow, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    loadMarketData();
  }, []);

  // Auto-cycle through tabs every 8 seconds (when not paused)
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tabs: Array<"trends" | "comparison" | "economy"> = ["trends", "comparison", "economy"];

    intervalRef.current = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = tabs.indexOf(current);
        const nextIndex = (currentIndex + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 8000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  // Reset timer when user manually clicks a tab
  const handleTabChange = (tabId: "trends" | "comparison" | "economy") => {
    setActiveTab(tabId);
    // Don't restart auto-cycle here - let the useEffect handle it based on isPaused state
  };

  const loadMarketData = async () => {
    try {
      const response = await fetch("/api/stats/market");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMarketData(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to load market data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow} flex items-center justify-center h-64`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
          <p className={`text-sm ${textSecondary}`}>Loading market data...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "trends" as const, label: "Rate Trends", icon: TrendingUp },
    { id: "comparison" as const, label: "Compare Rates", icon: BarChart3 },
    { id: "economy" as const, label: "Economy", icon: Activity },
  ];

  return (
    <div
      className="space-y-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Tab Navigation */}
      <div className={`flex gap-2 p-1.5 ${cardBg} ${cardBorder} border rounded-lg`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                isActive
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-600 text-white"
                  : isLight
                  ? "text-gray-700 hover:bg-blue-50"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content - Fixed height container to prevent layout shift */}
      <div className="relative min-h-[400px] md:min-h-[450px]">
        <AnimatePresence mode="wait">
          {activeTab === "trends" && (
            <TrendsView key="trends" marketData={marketData} isLight={isLight} />
          )}
          {activeTab === "comparison" && (
            <ComparisonView key="comparison" marketData={marketData} isLight={isLight} />
          )}
          {activeTab === "economy" && (
            <EconomyView key="economy" marketData={marketData} isLight={isLight} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Trends View - 30-Year Historical Chart
function TrendsView({ marketData, isLight }: { marketData: MarketData | null; isLight: boolean }) {
  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted, shadow } = useThemeClasses();

  const currentRate = marketData?.mortgageRates.current.thirtyYear;
  const historical = marketData?.mortgageRates.historical || [];

  const getTrend = () => {
    if (!historical.length || !currentRate) return null;
    const thirtyDaysAgo = historical[Math.max(0, historical.length - 5)];
    if (!thirtyDaysAgo) return null;
    const diff = currentRate - thirtyDaysAgo.thirtyYear;
    return { direction: diff > 0 ? 'up' : 'down', value: Math.abs(diff).toFixed(2) };
  };

  const trend = getTrend();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`absolute inset-0 ${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}
    >
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className={`p-2 md:p-3 rounded-lg ${isLight ? 'bg-emerald-100' : 'bg-emerald-900/30'} flex-shrink-0`}>
            <Percent className={`w-5 h-5 md:w-6 md:h-6 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          </div>
          <div className="min-w-0">
            <h3 className={`text-base md:text-lg lg:text-xl font-bold ${textPrimary} truncate`}>30-Year Mortgage</h3>
            <p className={`text-xs md:text-sm ${textSecondary}`}>CA • Past 12 Mo</p>
          </div>
        </div>

        {/* Info Badge */}
        <div className={`group relative flex-shrink-0`}>
          <div className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1.5 rounded-full ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-gray-800 text-gray-300'} text-xs cursor-help`}>
            <Info className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-xs">Data</span>
          </div>

          {/* Tooltip on hover */}
          <div className={`absolute top-full right-0 mt-2 w-56 md:w-64 p-3 rounded-lg ${isLight ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} text-xs shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}>
            <p className="font-semibold mb-1">Informational Only</p>
            <p>FRED & API Ninjas. Rates subject to change. Not a quote. Varies by credit & lender.</p>
          </div>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="flex items-baseline gap-2 md:gap-3">
          <span className={`text-3xl md:text-4xl lg:text-5xl font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
            {currentRate ? `${currentRate.toFixed(2)}%` : 'Loading...'}
          </span>
          {trend && (
            <span className={`text-xs md:text-sm font-medium ${trend.direction === 'up' ? 'text-red-500' : 'text-green-500'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </span>
          )}
        </div>
        <p className={`text-xs ${textMuted} mt-1`}>Current week average</p>
      </div>

      {historical.length > 0 && (
        <div className="w-full h-24 md:h-32 lg:h-40 mb-4">
          <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke={isLight ? '#10b981' : '#34d399'}
              strokeWidth="0.5"
              points={historical.map((point, idx) => {
                const x = (idx / (historical.length - 1)) * 100;
                const minRate = Math.min(...historical.map(p => p.thirtyYear));
                const maxRate = Math.max(...historical.map(p => p.thirtyYear));
                const y = 50 - ((point.thirtyYear - minRate) / (maxRate - minRate)) * 45;
                return `${x},${y}`;
              }).join(' ')}
            />
          </svg>
        </div>
      )}

      {historical.length > 0 && (
        <div className={`grid grid-cols-3 gap-2 md:gap-4 pt-4 ${cardBorder} border-t`}>
          <div>
            <p className={`text-xs ${textMuted} mb-0.5`}>High</p>
            <p className={`text-sm md:text-base font-bold ${textPrimary}`}>
              {Math.max(...historical.map(p => p.thirtyYear)).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className={`text-xs ${textMuted} mb-0.5`}>Low</p>
            <p className={`text-sm md:text-base font-bold ${textPrimary}`}>
              {Math.min(...historical.map(p => p.thirtyYear)).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className={`text-xs ${textMuted} mb-0.5`}>Avg</p>
            <p className={`text-sm md:text-base font-bold ${textPrimary}`}>
              {(historical.reduce((sum, p) => sum + p.thirtyYear, 0) / historical.length).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

    </motion.div>
  );
}

// Comparison View - 30-Year vs 15-Year
function ComparisonView({ marketData, isLight }: { marketData: MarketData | null; isLight: boolean }) {
  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted, shadow } = useThemeClasses();

  const rates = [
    {
      label: "30-Year Fixed",
      rate: marketData?.mortgageRates.current.thirtyYear,
      payment: marketData?.mortgageRates.current.thirtyYear ? calculatePayment(500000, marketData.mortgageRates.current.thirtyYear, 30) : 0,
      color: isLight ? 'bg-blue-500' : 'bg-blue-600',
    },
    {
      label: "15-Year Fixed",
      rate: marketData?.mortgageRates.current.fifteenYear,
      payment: marketData?.mortgageRates.current.fifteenYear ? calculatePayment(500000, marketData.mortgageRates.current.fifteenYear, 15) : 0,
      color: isLight ? 'bg-emerald-500' : 'bg-emerald-600',
    },
  ];

  const maxRate = Math.max(...rates.map(r => r.rate || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`absolute inset-0 ${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}
    >
      <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className={`p-2 md:p-3 rounded-lg ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'} flex-shrink-0`}>
            <BarChart3 className={`w-5 h-5 md:w-6 md:h-6 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          </div>
          <div className="min-w-0">
            <h3 className={`text-base md:text-lg lg:text-xl font-bold ${textPrimary} truncate`}>Compare Rates</h3>
            <p className={`text-xs md:text-sm ${textSecondary}`}>$500K loan</p>
          </div>
        </div>

        {/* Info Badge */}
        <div className={`group relative flex-shrink-0`}>
          <div className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1.5 rounded-full ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-gray-800 text-gray-300'} text-xs cursor-help`}>
            <Info className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-xs">Est</span>
          </div>

          {/* Tooltip on hover */}
          <div className={`absolute top-full right-0 mt-2 w-56 md:w-64 p-3 rounded-lg ${isLight ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} text-xs shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}>
            <p className="font-semibold mb-1">Not a Quote</p>
            <p>Payments on $500K loan. Rates subject to change. Varies by credit & lender.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {rates.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-baseline mb-1.5 md:mb-2">
              <span className={`text-xs md:text-sm font-medium ${textPrimary}`}>{item.label}</span>
              <span className={`text-xl md:text-2xl lg:text-3xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                {item.rate ? `${item.rate.toFixed(2)}%` : 'N/A'}
              </span>
            </div>

            {item.rate && (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 md:h-3 mb-1.5 md:mb-2">
                  <div
                    className={`${item.color} h-2.5 md:h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${(item.rate / maxRate) * 100}%` }}
                  />
                </div>
                <p className={`text-xs ${textMuted}`}>
                  ${item.payment.toLocaleString()}/mo
                </p>
              </>
            )}
          </div>
        ))}
      </div>

    </motion.div>
  );
}

// Economy View - Economic Indicators
function EconomyView({ marketData, isLight }: { marketData: MarketData | null; isLight: boolean }) {
  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted, shadow } = useThemeClasses();

  const indicators = [
    {
      label: "Unemployment Rate",
      value: marketData?.economicIndicators.unemployment,
      suffix: "%",
      icon: Activity,
      description: "Current U.S. unemployment",
    },
    {
      label: "CPI (Inflation)",
      value: marketData?.economicIndicators.inflation,
      suffix: "",
      icon: TrendingUp,
      description: "Consumer Price Index",
    },
    {
      label: "Home Price Index",
      value: marketData?.economicIndicators.homePriceIndex,
      suffix: "",
      icon: DollarSign,
      description: "Case-Shiller National Index",
    },
    {
      label: "GDP Growth",
      value: marketData?.economicIndicators.gdpGrowth,
      suffix: "%",
      icon: LineChart,
      description: "Quarterly annualized GDP",
    },
    {
      label: "Housing Starts",
      value: marketData?.economicIndicators.housingStarts,
      suffix: "K",
      icon: Home,
      description: "Annual rate (thousands)",
    },
    {
      label: "10-Year Treasury",
      value: marketData?.economicIndicators.treasuryRate,
      suffix: "%",
      icon: Landmark,
      description: "Current yield rate",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`absolute inset-0 ${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}
    >
      <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className={`p-2 md:p-3 rounded-lg ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'} flex-shrink-0`}>
            <Activity className={`w-5 h-5 md:w-6 md:h-6 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
          </div>
          <div className="min-w-0">
            <h3 className={`text-base md:text-lg lg:text-xl font-bold ${textPrimary} truncate`}>Economy</h3>
            <p className={`text-xs md:text-sm ${textSecondary}`}>Latest data</p>
          </div>
        </div>

        {/* Info Badge */}
        <div className={`group relative flex-shrink-0`}>
          <div className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1.5 rounded-full ${isLight ? 'bg-purple-50 text-purple-700' : 'bg-gray-800 text-gray-300'} text-xs cursor-help`}>
            <Info className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-xs">FRED</span>
          </div>

          {/* Tooltip on hover */}
          <div className={`absolute top-full right-0 mt-2 w-56 md:w-64 p-3 rounded-lg ${isLight ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} text-xs shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}>
            <p className="font-semibold mb-1">Federal Reserve Data</p>
            <p>Informational only. Subject to revision. Not financial advice.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
        {indicators.map((indicator) => {
          const Icon = indicator.icon;
          return (
            <div key={indicator.label} className={`p-3 md:p-4 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800/50'}`}>
              <Icon className={`w-4 h-4 md:w-5 md:h-5 mb-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg md:text-xl lg:text-2xl font-bold ${textPrimary} mb-1`}>
                {indicator.value ? `${indicator.value.toFixed(indicator.suffix === '%' || indicator.suffix === 'K' ? 1 : 0)}${indicator.suffix}` : 'Loading...'}
              </p>
              <p className={`text-xs font-medium ${textSecondary} mb-0.5`}>{indicator.label}</p>
              <p className={`text-xs ${textMuted} hidden md:block`}>{indicator.description}</p>
            </div>
          );
        })}
      </div>

    </motion.div>
  );
}

// Helper function to calculate monthly payment
function calculatePayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return Math.round(payment);
}
