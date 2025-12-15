"use client";

import { useEffect, useState } from "react";
import MarketStatsCard from "@/app/components/chat/MarketStatsCard";
import { ThemeProvider } from "@/app/contexts/ThemeContext";

export default function TestMarketStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/analytics/market-stats?city=Palm%20Desert");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Market Stats Component Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Testing the MarketStatsCard component with live data from Palm Desert
          </p>

          {loading && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading market data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 border-2 border-red-200 dark:border-red-800">
              <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Error</h2>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {data && (
            <>
              <div className="mb-8">
                <MarketStatsCard
                  location={data.location}
                  daysOnMarket={data.daysOnMarket}
                  pricePerSqft={data.pricePerSqft}
                  hoaFees={data.hoaFees}
                  propertyTax={data.propertyTax}
                />
              </div>

              <details className="bg-white dark:bg-slate-800 rounded-2xl p-6">
                <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">
                  Raw API Response (Click to expand)
                </summary>
                <pre className="mt-4 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
