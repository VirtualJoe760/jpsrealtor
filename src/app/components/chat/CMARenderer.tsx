// src/app/components/chat/CMARenderer.tsx
// Dedicated component for rendering CMA analysis results
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, TrendingUp, DollarSign, Home, BarChart3, Calculator, Target, Activity } from "lucide-react";
import type { CMASummary, AppreciationResult, CashflowResult, CMAComp, AppreciationForecast, CashflowAnalysis } from "@/lib/cma/cmaTypes";
import { useTheme } from "@/app/contexts/ThemeContext";
import { calculateForecastCurve, interpretForecast } from "@/lib/cma/forecastEngine";
import { calculateMarketRiskIndex } from "@/lib/cma/riskEngine";
import type { ForecastResult } from "@/lib/cma/forecastEngine";
import type { RiskResult } from "@/lib/cma/riskEngine";

// Import chart components
import ConfidenceGauge from "@/app/components/cma/charts/ConfidenceGauge";
import PriceRangePositionChart from "@/app/components/cma/charts/PriceRangePositionChart";
import AppreciationChart from "@/app/components/cma/charts/AppreciationChart";
import ComparisonScatterChart from "@/app/components/cma/charts/ComparisonScatterChart";
import PricePerSqftTrendChart from "@/app/components/cma/charts/PricePerSqftTrendChart";
import CashflowBarChart from "@/app/components/cma/charts/CashflowBarChart";
import ForecastChart from "@/app/components/cma/charts/ForecastChart";
import RiskGauge from "@/app/components/cma/charts/RiskGauge";

export interface CMARendererProps {
  cmaSummary?: CMASummary;
  appreciationForecast?: AppreciationResult;
  cashflowAnalysis?: CashflowResult;
  comps?: CMAComp[];
  subjectAddress?: string;
}

export default function CMARenderer({
  cmaSummary,
  appreciationForecast,
  cashflowAnalysis,
  comps,
  subjectAddress,
}: CMARendererProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [expandedSections, setExpandedSections] = useState({
    charts: true,
    summary: true,
    comps: false,
    appreciation: false,
    cashflow: false,
    predictive: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate forecast and risk
  const forecastData: ForecastResult | null = useMemo(() => {
    if (!appreciationForecast || !cmaSummary?.estimatedValue) return null;

    try {
      return calculateForecastCurve(
        appreciationForecast,
        cmaSummary.estimatedValue,
        10
      );
    } catch (error) {
      console.error('[CMARenderer] Forecast calculation error:', error);
      return null;
    }
  }, [appreciationForecast, cmaSummary?.estimatedValue]);

  const riskData: RiskResult | null = useMemo(() => {
    if (!appreciationForecast && !comps) return null;

    try {
      // Calculate DOM trend from comps
      let domTrend = 0;
      if (comps && comps.length >= 3) {
        const sortedComps = [...comps].sort((a, b) =>
          (a.closeDate || a.listDate || 0) - (b.closeDate || b.listDate || 0)
        );
        const recentDom = sortedComps.slice(-3).reduce((sum, c) => sum + (c.dom || 0), 0) / 3;
        const olderDom = sortedComps.slice(0, 3).reduce((sum, c) => sum + (c.dom || 0), 0) / 3;
        domTrend = recentDom - olderDom;
      }

      // Calculate price momentum
      const priceTrendMomentum = appreciationForecast?.cagr1 || 0;

      // Cashflow strength
      const cashflowStrength = cashflowAnalysis?.cocReturn || 0;

      // Valuation accuracy (how close subject is to CMA estimate)
      let valuationAccuracy = 85; // Default
      if (cmaSummary?.estimatedValue && cmaSummary?.avgPrice) {
        const gap = Math.abs(cmaSummary.estimatedValue - cmaSummary.avgPrice) / cmaSummary.avgPrice;
        valuationAccuracy = Math.max(0, Math.min(100, 100 - (gap * 100)));
      }

      return calculateMarketRiskIndex({
        volatilityIndex: appreciationForecast?.volatilityIndex || null,
        domTrend,
        priceTrendMomentum,
        cashflowStrength,
        valuationAccuracy,
        comparableCount: comps?.length,
      });
    } catch (error) {
      console.error('[CMARenderer] Risk calculation error:', error);
      return null;
    }
  }, [appreciationForecast, comps, cashflowAnalysis, cmaSummary]);

  if (!cmaSummary && !appreciationForecast && !cashflowAnalysis) {
    return null;
  }

  // Transform AppreciationResult to AppreciationForecast for chart compatibility
  const transformedAppreciation: AppreciationForecast | undefined = appreciationForecast ? {
    cagr1: 'cagr1' in appreciationForecast ? appreciationForecast.cagr1 : null,
    cagr3: 'cagr3' in appreciationForecast ? appreciationForecast.cagr3 : null,
    cagr5: 'cagr5' in appreciationForecast ? appreciationForecast.cagr5 : null,
    projected5Year: 'projected5Year' in appreciationForecast ? appreciationForecast.projected5Year : null,
    historyYears: 'historyYears' in appreciationForecast ? appreciationForecast.historyYears : [],
    volatilityIndex: 'volatilityIndex' in appreciationForecast ? appreciationForecast.volatilityIndex : null,
  } : undefined;

  // Transform CashflowResult to CashflowAnalysis for chart compatibility
  const transformedCashflow: CashflowAnalysis | undefined = cashflowAnalysis ? {
    monthlyRent: cashflowAnalysis.rentEstimate || 0,
    monthlyMortgage: cashflowAnalysis.mortgage || 0,
    monthlyTaxes: cashflowAnalysis.taxes || 0,
    monthlyInsurance: cashflowAnalysis.insurance || 0,
    monthlyMaintenance: cashflowAnalysis.maintenance || 0,
    monthlyHOA: cashflowAnalysis.hoa || 0,
    monthlyUtilities: 0, // Not in CashflowResult
    monthlyCashflow: cashflowAnalysis.noi || 0,
    annualCashflow: (cashflowAnalysis.noi || 0) * 12,
    cocReturn: cashflowAnalysis.cocReturn || 0,
    capRate: cashflowAnalysis.capRate || 0,
  } : undefined;

  // Calculate avgDaysOnMarket from comps
  const avgDaysOnMarket = comps && comps.length > 0
    ? Math.round(comps.reduce((sum, comp) => sum + (comp.dom || 0), 0) / comps.length)
    : undefined;

  // Calculate avgPricePerSqft from comps
  const avgPricePerSqft = cmaSummary?.avgPricePerSqft || (comps && comps.length > 0
    ? comps.reduce((sum, comp) => sum + (comp.pricePerSqft || 0), 0) / comps.length
    : undefined);

  return (
    <div className={`space-y-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      {/* Advanced Analytics Section with Charts */}
      {(cmaSummary || transformedAppreciation || transformedCashflow || comps) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-gray-300 shadow-md'
              : 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-xl'
          } overflow-hidden`}
        >
          <button
            onClick={() => toggleSection('charts')}
            className={`w-full px-6 py-4 flex items-center justify-between ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/50'
            } transition-colors`}
          >
            <div className="flex items-center gap-3">
              <Target className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              <span className="text-xl font-bold">Advanced Analytics</span>
            </div>
            {expandedSections.charts ? (
              <ChevronUp className="w-6 h-6" />
            ) : (
              <ChevronDown className="w-6 h-6" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.charts && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-6 border-t ${
                  isLight ? 'border-gray-200' : 'border-zinc-700'
                }`}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Confidence Score */}
                    {cmaSummary?.confidenceScore !== undefined && cmaSummary.confidenceScore !== null && (
                      <ConfidenceGauge
                        confidenceScore={cmaSummary.confidenceScore}
                        compCount={comps?.length}
                        avgDaysOnMarket={avgDaysOnMarket}
                      />
                    )}

                    {/* Price Range Position */}
                    {cmaSummary?.estimatedValue && (
                      <PriceRangePositionChart
                        estimatedValue={cmaSummary.estimatedValue}
                        lowRange={cmaSummary.lowRange}
                        highRange={cmaSummary.highRange}
                        avgPrice={cmaSummary.avgPrice}
                        subjectAddress={subjectAddress}
                      />
                    )}

                    {/* Appreciation Chart */}
                    {transformedAppreciation && transformedAppreciation.historyYears && transformedAppreciation.historyYears.length > 0 && (
                      <div className="lg:col-span-2">
                        <AppreciationChart
                          appreciation={transformedAppreciation}
                          subjectAddress={subjectAddress}
                        />
                      </div>
                    )}

                    {/* Comparison Scatter Chart */}
                    {comps && comps.length > 0 && cmaSummary && (
                      <div className="lg:col-span-2">
                        <ComparisonScatterChart
                          summary={cmaSummary}
                          comps={comps}
                          subjectProperty={subjectAddress ? { sqft: cmaSummary.avgSqft, price: cmaSummary.estimatedValue } : undefined}
                        />
                      </div>
                    )}

                    {/* Price Per Sqft Trend */}
                    {comps && comps.length > 0 && (
                      <div className="lg:col-span-2">
                        <PricePerSqftTrendChart
                          comps={comps}
                          avgPricePerSqft={avgPricePerSqft}
                        />
                      </div>
                    )}

                    {/* Cashflow Bar Chart */}
                    {transformedCashflow && transformedCashflow.monthlyMortgage > 0 && (
                      <div className="lg:col-span-2">
                        <CashflowBarChart
                          cashflow={transformedCashflow}
                          subjectAddress={subjectAddress}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Predictive Analytics Section (Forecast + Risk) - NEW */}
      {(forecastData || riskData) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-gray-300 shadow-md'
              : 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-xl'
          } overflow-hidden`}
        >
          <button
            onClick={() => toggleSection('predictive')}
            className={`w-full px-6 py-4 flex items-center justify-between ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/50'
            } transition-colors`}
          >
            <div className="flex items-center gap-3">
              <Activity className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-purple-400'}`} />
              <span className="text-xl font-bold">Predictive Analytics (Forecast + Risk)</span>
            </div>
            {expandedSections.predictive ? (
              <ChevronUp className="w-6 h-6" />
            ) : (
              <ChevronDown className="w-6 h-6" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.predictive && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-6 border-t ${
                  isLight ? 'border-gray-200' : 'border-zinc-700'
                }`}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Forecast Chart */}
                    {forecastData ? (
                      <div className="lg:col-span-2">
                        <ForecastChart
                          forecast={forecastData}
                          subjectAddress={subjectAddress}
                          compact={false}
                        />
                      </div>
                    ) : (
                      <div className={`lg:col-span-2 p-6 rounded-xl border ${
                        isLight
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}>
                        <p className={`text-sm text-center ${
                          isLight ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          Forecast data unavailable - insufficient historical appreciation data
                        </p>
                      </div>
                    )}

                    {/* Risk Gauge */}
                    {riskData ? (
                      <div className="lg:col-span-2">
                        <RiskGauge
                          risk={riskData}
                          compact={false}
                          showRecommendations={true}
                        />
                      </div>
                    ) : (
                      <div className={`lg:col-span-2 p-6 rounded-xl border ${
                        isLight
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}>
                        <p className={`text-sm text-center ${
                          isLight ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          Risk assessment unavailable - insufficient market data
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* CMA Summary Section */}
      {cmaSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-gray-300 shadow-md'
              : 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-xl'
          } overflow-hidden`}
        >
          <button
            onClick={() => toggleSection('summary')}
            className={`w-full px-4 py-3 flex items-center justify-between ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/50'
            } transition-colors`}
          >
            <div className="flex items-center gap-2">
              <Home className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              <span className="font-semibold">CMA Valuation Summary</span>
            </div>
            {expandedSections.summary ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.summary && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className={`px-4 py-4 border-t ${
                  isLight ? 'border-gray-200' : 'border-zinc-700'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Estimated Value
                      </p>
                      <p className="text-2xl font-bold text-green-500">
                        ${cmaSummary.estimatedValue?.toLocaleString() || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Value Range
                      </p>
                      <p className="text-lg font-semibold">
                        ${cmaSummary.lowRange?.toLocaleString()} - ${cmaSummary.highRange?.toLocaleString()}
                      </p>
                    </div>

                    {cmaSummary.confidenceScore !== null && (
                      <div>
                        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          Confidence Score
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 h-2 rounded-full overflow-hidden ${
                            isLight ? 'bg-gray-200' : 'bg-zinc-700'
                          }`}>
                            <div
                              className={`h-full transition-all ${
                                isLight ? 'bg-blue-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${cmaSummary.confidenceScore * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round(cmaSummary.confidenceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {cmaSummary.methodology && cmaSummary.methodology.length > 0 && (
                      <div>
                        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          Methodology
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {cmaSummary.methodology.map((method, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs rounded ${
                                isLight
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-900/50 text-emerald-300'
                              }`}
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Comparable Properties Section */}
      {comps && comps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-gray-300 shadow-md'
              : 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-xl'
          } overflow-hidden`}
        >
          <button
            onClick={() => toggleSection('comps')}
            className={`w-full px-4 py-3 flex items-center justify-between ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/50'
            } transition-colors`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-purple-400'}`} />
              <span className="font-semibold">Comparable Properties ({comps.length})</span>
            </div>
            {expandedSections.comps ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.comps && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className={`px-4 py-4 border-t ${
                  isLight ? 'border-gray-200' : 'border-zinc-700'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={`${isLight ? 'bg-gray-50' : 'bg-zinc-800/50'}`}>
                        <tr>
                          <th className="px-3 py-2 text-left">Address</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">$/sqft</th>
                          <th className="px-3 py-2 text-center">Bed/Bath</th>
                          <th className="px-3 py-2 text-right">Sqft</th>
                          <th className="px-3 py-2 text-right">DOM</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-zinc-700'}`}>
                        {comps.slice(0, 10).map((comp, idx) => (
                          <tr key={idx} className={isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/30'}>
                            <td className="px-3 py-2 max-w-xs truncate">
                              {comp.unparsedAddress || 'N/A'}
                              {comp.subdivision && (
                                <span className={`block text-xs ${
                                  isLight ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  {comp.subdivision}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              ${comp.price.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ${Math.round(comp.price / comp.sqft)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {comp.beds}/{comp.baths}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {comp.sqft.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {comp.dom || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Appreciation Analysis Section */}
      {appreciationForecast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-gray-300 shadow-md'
              : 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-xl'
          } overflow-hidden`}
        >
          <button
            onClick={() => toggleSection('appreciation')}
            className={`w-full px-4 py-3 flex items-center justify-between ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/50'
            } transition-colors`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              <span className="font-semibold">Appreciation Analysis</span>
            </div>
            {expandedSections.appreciation ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.appreciation && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className={`px-4 py-4 border-t ${
                  isLight ? 'border-gray-200' : 'border-zinc-700'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {appreciationForecast.cagr5 !== null && (
                      <div>
                        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          5-Year CAGR
                        </p>
                        <p className={`text-xl font-bold ${
                          appreciationForecast.cagr5 >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {appreciationForecast.cagr5 >= 0 ? '+' : ''}{appreciationForecast.cagr5.toFixed(2)}%
                        </p>
                      </div>
                    )}

                    {appreciationForecast.volatilityIndex !== null && (
                      <div>
                        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          Market Volatility
                        </p>
                        <p className="text-xl font-bold">
                          {(appreciationForecast.volatilityIndex * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {Object.keys(appreciationForecast.yoy).length > 0 && (
                    <div className="mt-4">
                      <p className={`text-sm mb-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Year-over-Year Appreciation
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(appreciationForecast.yoy)
                          .sort(([a], [b]) => parseInt(b) - parseInt(a))
                          .slice(0, 8)
                          .map(([year, rate]) => (
                            <div
                              key={year}
                              className={`px-3 py-2 rounded ${
                                isLight ? 'bg-gray-50' : 'bg-zinc-800/50'
                              }`}
                            >
                              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                {year}
                              </p>
                              <p className={`font-semibold ${
                                rate >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {rate >= 0 ? '+' : ''}{rate.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Cashflow Analysis Section */}
      {cashflowAnalysis && cashflowAnalysis.mortgage !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-gray-300 shadow-md'
              : 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-xl'
          } overflow-hidden`}
        >
          <button
            onClick={() => toggleSection('cashflow')}
            className={`w-full px-4 py-3 flex items-center justify-between ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-zinc-800/50'
            } transition-colors`}
          >
            <div className="flex items-center gap-2">
              <Calculator className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-purple-400'}`} />
              <span className="font-semibold">Investment Cashflow</span>
            </div>
            {expandedSections.cashflow ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.cashflow && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className={`px-4 py-4 border-t ${
                  isLight ? 'border-gray-200' : 'border-zinc-700'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Monthly Expenses */}
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${
                        isLight ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        Monthly Expenses
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Mortgage (P&I)</span>
                          <span className="font-medium">${cashflowAnalysis.mortgage.toFixed(2)}</span>
                        </div>
                        {cashflowAnalysis.taxes !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Property Taxes</span>
                            <span className="font-medium">${cashflowAnalysis.taxes.toFixed(2)}</span>
                          </div>
                        )}
                        {cashflowAnalysis.insurance !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Insurance</span>
                            <span className="font-medium">${cashflowAnalysis.insurance.toFixed(2)}</span>
                          </div>
                        )}
                        {cashflowAnalysis.maintenance !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Maintenance</span>
                            <span className="font-medium">${cashflowAnalysis.maintenance.toFixed(2)}</span>
                          </div>
                        )}
                        {cashflowAnalysis.hoa !== null && cashflowAnalysis.hoa > 0 && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>HOA</span>
                            <span className="font-medium">${cashflowAnalysis.hoa.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Investment Metrics */}
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${
                        isLight ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        Investment Metrics
                      </p>
                      <div className="space-y-2">
                        {cashflowAnalysis.rentEstimate !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Est. Rent</span>
                            <span className="font-medium text-green-500">
                              ${cashflowAnalysis.rentEstimate.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {cashflowAnalysis.noi !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>NOI (Monthly)</span>
                            <span className={`font-medium ${
                              cashflowAnalysis.noi >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              ${cashflowAnalysis.noi.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {cashflowAnalysis.capRate !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Cap Rate</span>
                            <span className="font-medium">{cashflowAnalysis.capRate.toFixed(2)}%</span>
                          </div>
                        )}
                        {cashflowAnalysis.cocReturn !== null && (
                          <div className="flex justify-between">
                            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Cash-on-Cash</span>
                            <span className={`font-medium ${
                              cashflowAnalysis.cocReturn >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {cashflowAnalysis.cocReturn.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
