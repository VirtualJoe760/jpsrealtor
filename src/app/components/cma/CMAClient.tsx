'use client';

// src/app/components/cma/CMAClient.tsx
// Main client component for CMA page

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText, Download, TrendingUp, Target, DollarSign, Activity } from 'lucide-react';
import CMASidebar from './CMASidebar';
import CMARenderer from '../chat/CMARenderer';
import MortgageCalculator from '../mls/map/MortgageCalculator';
import type { MapFilters } from '@/app/utils/mls/filterListingsServerSide';
import type { SavedCMA } from '@/app/utils/cma/saveCMA';
import { loadCMA } from '@/app/utils/cma/loadCMA';
import { exportAndDownloadCMA, type CMAReportType } from '@/app/utils/cma/exportCMAtoPDF';
import type { CMAReport, AppreciationForecast, CashflowAnalysis } from '@/lib/cma/cmaTypes';

// Import mini chart components
import ConfidenceGauge from './charts/ConfidenceGauge';
import ComparisonScatterChart from './charts/ComparisonScatterChart';
import CashflowBarChart from './charts/CashflowBarChart';
import AppreciationChart from './charts/AppreciationChart';

// Import forecast & risk components
import ForecastChart from './charts/ForecastChart';
import RiskGauge from './charts/RiskGauge';
import { calculateForecastCurve } from '@/lib/cma/forecastEngine';
import { calculateMarketRiskIndex } from '@/lib/cma/riskEngine';
import type { ForecastResult } from '@/lib/cma/forecastEngine';
import type { RiskResult } from '@/lib/cma/riskEngine';

export default function CMAClient() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCMA, setCurrentCMA] = useState<SavedCMA | null>(null);
  const [filters, setFilters] = useState<Partial<MapFilters>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate new CMA
  const handleGenerateCMA = useCallback(async (query: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('📊 Generating CMA for:', query);

      // Call CMA generation API
      const response = await fetch('/api/cma/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            ...filters,
            subjectAddress: query,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate CMA');
      }

      const data = await response.json();

      if (data.success && data.report) {
        // Create SavedCMA object
        const savedCMA: SavedCMA = {
          id: `cma_${Date.now()}`,
          report: data.report,
          filters: filters as MapFilters,
          subjectAddress: query,
          generatedAt: data.report.generatedAt,
          previewData: {
            estimatedValue: data.report.summary.estimatedValue,
            valueRange:
              data.report.summary.lowRange && data.report.summary.highRange
                ? `$${data.report.summary.lowRange.toLocaleString()} - $${data.report.summary.highRange.toLocaleString()}`
                : 'N/A',
            confidenceScore: data.report.summary.confidenceScore,
            compCount: data.report.comps.length,
            cagr5: data.report.appreciation?.cagr5 || null,
            capRate: data.report.cashflow?.capRate || null,
          },
        };

        setCurrentCMA(savedCMA);
        console.log('✅ CMA generated successfully');
      } else {
        throw new Error(data.error || 'CMA generation failed');
      }
    } catch (err) {
      console.error('❌ CMA generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate CMA');
    } finally {
      setIsGenerating(false);
    }
  }, [filters]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      handleGenerateCMA(query);
    },
    [handleGenerateCMA]
  );

  const handleFilterChange = useCallback((newFilters: Partial<MapFilters>) => {
    setFilters(newFilters);
  }, []);

  const handleCMASelect = useCallback(async (cma: SavedCMA) => {
    const loaded = await loadCMA(cma.id);
    if (loaded && loaded.isValid) {
      setCurrentCMA(cma);
      setSearchQuery(cma.subjectAddress || '');
      setError(null);
    } else {
      setError('Failed to load CMA or CMA is invalid');
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentCMA(null);
    setError(null);
  }, []);

  const handleExportPDF = useCallback(async (type: CMAReportType) => {
    if (!currentCMA) return;

    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      await exportAndDownloadCMA(currentCMA, type);
      console.debug(`✅ ${type} CMA PDF exported successfully`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, [currentCMA]);

  // Transform appreciation data for chart compatibility
  const transformedAppreciation: AppreciationForecast | undefined = currentCMA?.report.appreciation ? {
    cagr1: 'cagr1' in currentCMA.report.appreciation ? currentCMA.report.appreciation.cagr1 : null,
    cagr3: 'cagr3' in currentCMA.report.appreciation ? currentCMA.report.appreciation.cagr3 : null,
    cagr5: 'cagr5' in currentCMA.report.appreciation ? currentCMA.report.appreciation.cagr5 : null,
    projected5Year: 'projected5Year' in currentCMA.report.appreciation ? currentCMA.report.appreciation.projected5Year : null,
    historyYears: 'historyYears' in currentCMA.report.appreciation ? currentCMA.report.appreciation.historyYears : [],
    volatilityIndex: 'volatilityIndex' in currentCMA.report.appreciation ? currentCMA.report.appreciation.volatilityIndex : null,
  } : undefined;

  // Transform cashflow data for chart compatibility
  const transformedCashflow: CashflowAnalysis | undefined = currentCMA?.report.cashflow ? {
    monthlyRent: currentCMA.report.cashflow.rentEstimate || 0,
    monthlyMortgage: currentCMA.report.cashflow.mortgage || 0,
    monthlyTaxes: currentCMA.report.cashflow.taxes || 0,
    monthlyInsurance: currentCMA.report.cashflow.insurance || 0,
    monthlyMaintenance: currentCMA.report.cashflow.maintenance || 0,
    monthlyHOA: currentCMA.report.cashflow.hoa || 0,
    monthlyUtilities: 0,
    monthlyCashflow: currentCMA.report.cashflow.noi || 0,
    annualCashflow: (currentCMA.report.cashflow.noi || 0) * 12,
    cocReturn: currentCMA.report.cashflow.cocReturn || 0,
    capRate: currentCMA.report.cashflow.capRate || 0,
  } : undefined;

  // Calculate avgDaysOnMarket from comps
  const avgDaysOnMarket = currentCMA?.report.comps && currentCMA.report.comps.length > 0
    ? Math.round(currentCMA.report.comps.reduce((sum, comp) => sum + (comp.dom || 0), 0) / currentCMA.report.comps.length)
    : undefined;

  // Calculate forecast data
  const forecastData: ForecastResult | null = useMemo(() => {
    if (!currentCMA?.report.appreciation || !currentCMA.report.summary?.estimatedValue) return null;

    try {
      return calculateForecastCurve(
        currentCMA.report.appreciation,
        currentCMA.report.summary.estimatedValue,
        10
      );
    } catch (error) {
      console.error('[CMAClient] Forecast calculation error:', error);
      return null;
    }
  }, [currentCMA?.report.appreciation, currentCMA?.report.summary?.estimatedValue]);

  // Calculate risk data
  const riskData: RiskResult | null = useMemo(() => {
    if (!currentCMA) return null;

    // Calculate DOM trend
    let domTrend: number | undefined;
    if (currentCMA.report.comps && currentCMA.report.comps.length >= 3) {
      const sortedComps = [...currentCMA.report.comps].sort((a, b) => {
        const dateA = new Date(a.listDate || a.soldDate || 0).getTime();
        const dateB = new Date(b.listDate || b.soldDate || 0).getTime();
        return dateA - dateB;
      });

      const recentCount = Math.ceil(sortedComps.length / 2);
      const recentComps = sortedComps.slice(-recentCount);
      const olderComps = sortedComps.slice(0, -recentCount);

      const recentDOM = recentComps.reduce((sum, c) => sum + (c.dom || 0), 0) / recentComps.length;
      const olderDOM = olderComps.reduce((sum, c) => sum + (c.dom || 0), 0) / olderComps.length;

      domTrend = ((recentDOM - olderDOM) / olderDOM) * 100;
    }

    // Calculate price momentum
    let priceTrendMomentum: number | undefined;
    if (currentCMA.report.appreciation?.historyYears && currentCMA.report.appreciation.historyYears.length >= 2) {
      const years = currentCMA.report.appreciation.historyYears;
      const recentRate = years[years.length - 1]?.yoyGrowth || 0;
      const previousRate = years[years.length - 2]?.yoyGrowth || 0;
      priceTrendMomentum = recentRate - previousRate;
    }

    // Calculate cashflow strength
    let cashflowStrength: number | undefined;
    if (currentCMA.report.cashflow?.cocReturn !== undefined) {
      cashflowStrength = currentCMA.report.cashflow.cocReturn;
    }

    // Calculate valuation accuracy
    let valuationAccuracy: number | undefined;
    if (currentCMA.report.summary?.estimatedValue && currentCMA.report.summary?.avgPrice) {
      const gap = Math.abs(currentCMA.report.summary.estimatedValue - currentCMA.report.summary.avgPrice);
      const percentGap = (gap / currentCMA.report.summary.avgPrice) * 100;
      valuationAccuracy = Math.max(0, 100 - percentGap);
    }

    try {
      return calculateMarketRiskIndex({
        volatilityIndex: currentCMA.report.appreciation?.volatilityIndex || null,
        domTrend,
        priceTrendMomentum,
        cashflowStrength,
        valuationAccuracy,
        comparableCount: currentCMA.report.comps?.length,
      });
    } catch (error) {
      console.error('[CMAClient] Risk calculation error:', error);
      return null;
    }
  }, [currentCMA]);

  // Theme-aware classes
  const mainBg = isLight ? 'bg-gray-50' : 'bg-gray-950';
  const contentBg = isLight ? 'bg-white/80 backdrop-blur-md' : 'bg-zinc-900/80 backdrop-blur-xl';
  const textPrimary = isLight ? 'text-gray-900' : 'text-white';
  const textSecondary = isLight ? 'text-gray-600' : 'text-gray-400';
  const borderColor = isLight ? 'border-gray-300' : 'border-zinc-800';

  const exportOptions = [
    { type: 'full' as CMAReportType, label: 'Full CMA Report', description: 'Complete analysis with all sections' },
    { type: 'mini' as CMAReportType, label: 'Mini CMA Report', description: 'Summary only' },
    { type: 'buyer' as CMAReportType, label: 'Buyer CMA Packet', description: 'Buyer-focused analysis' },
    { type: 'seller' as CMAReportType, label: 'Seller CMA Packet', description: 'Seller-focused analysis' },
  ];

  return (
    <div className={`flex h-screen ${mainBg}`}>
      {/* Sidebar */}
      <div className="w-96 flex-shrink-0">
        <CMASidebar
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onCMASelect={handleCMASelect}
          onClearSearch={handleClearSearch}
          currentFilters={filters}
          selectedCMAId={currentCMA?.id}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${textPrimary}`}>
                Comparative Market Analysis
              </h1>
              <p className={`mt-1 ${textSecondary}`}>
                Professional property valuations and investment analysis
              </p>
            </div>

            {/* Export Dropdown Button */}
            {currentCMA && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  disabled={isExporting}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showExportDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl border z-50 ${
                        isLight
                          ? 'bg-white border-gray-200'
                          : 'bg-zinc-900 border-zinc-700'
                      }`}
                    >
                      <div className="py-2">
                        {exportOptions.map((option) => (
                          <button
                            key={option.type}
                            onClick={() => handleExportPDF(option.type)}
                            className={`w-full px-4 py-3 text-left transition-colors ${
                              isLight
                                ? 'hover:bg-gray-100'
                                : 'hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <FileText className={`w-5 h-5 mt-0.5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                              <div>
                                <div className={`font-medium ${textPrimary}`}>
                                  {option.label}
                                </div>
                                <div className={`text-xs ${textSecondary} mt-0.5`}>
                                  {option.description}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`p-12 rounded-xl border ${contentBg} ${borderColor} shadow-lg`}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className={`animate-spin rounded-full h-16 w-16 border-b-4 mb-4 ${
                    isLight ? 'border-blue-600' : 'border-emerald-500'
                  }`} />
                  <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>
                    Generating CMA Report
                  </h3>
                  <p className={textSecondary}>
                    Analyzing comparable properties and market data...
                  </p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-6 rounded-xl border ${
                  isLight
                    ? 'bg-red-50 border-red-200'
                    : 'bg-red-950/20 border-red-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className={`w-6 h-6 flex-shrink-0 ${isLight ? 'text-red-600' : 'text-red-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-1 ${isLight ? 'text-red-900' : 'text-red-100'}`}>
                      Error Generating CMA
                    </h3>
                    <p className={`text-sm ${isLight ? 'text-red-700' : 'text-red-300'}`}>
                      {error}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : currentCMA ? (
              <motion.div
                key="cma-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Advanced Analytics Grid with Mini Charts */}
                <div className={`p-6 rounded-xl border ${contentBg} ${borderColor} shadow-lg`}>
                  <div className="flex items-center gap-3 mb-6">
                    <Target className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                    <h2 className={`text-2xl font-bold ${textPrimary}`}>
                      Advanced Analytics
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Confidence Gauge Mini */}
                    {currentCMA.report.summary.confidenceScore !== undefined && currentCMA.report.summary.confidenceScore !== null && (
                      <ConfidenceGauge
                        confidenceScore={currentCMA.report.summary.confidenceScore}
                        compCount={currentCMA.report.comps.length}
                        avgDaysOnMarket={avgDaysOnMarket}
                      />
                    )}

                    {/* Appreciation Mini Chart */}
                    {transformedAppreciation && transformedAppreciation.historyYears && transformedAppreciation.historyYears.length > 0 && (
                      <AppreciationChart
                        appreciation={transformedAppreciation}
                        subjectAddress={currentCMA.subjectAddress}
                      />
                    )}

                    {/* Comparison Scatter Mini */}
                    {currentCMA.report.comps && currentCMA.report.comps.length > 0 && currentCMA.report.summary && (
                      <div className="lg:col-span-2">
                        <ComparisonScatterChart
                          summary={currentCMA.report.summary}
                          comps={currentCMA.report.comps}
                          subjectProperty={currentCMA.subjectAddress ? {
                            sqft: currentCMA.report.summary.avgSqft,
                            price: currentCMA.report.summary.estimatedValue
                          } : undefined}
                        />
                      </div>
                    )}

                    {/* Cashflow Mini Chart */}
                    {transformedCashflow && transformedCashflow.monthlyMortgage > 0 && (
                      <div className="lg:col-span-2">
                        <CashflowBarChart
                          cashflow={transformedCashflow}
                          subjectAddress={currentCMA.subjectAddress}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Predictive Analytics */}
                {(forecastData || riskData) && (
                  <div className={`p-6 rounded-xl border ${contentBg} ${borderColor} shadow-lg`}
                    style={isLight ? {
                      backdropFilter: 'blur(12px) saturate(160%)',
                    } : {
                      backdropFilter: 'blur(24px) saturate(180%)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-purple-400'}`} />
                      <h2 className={`text-2xl font-bold ${textPrimary}`}>
                        Predictive Analytics
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Forecast Chart */}
                      {forecastData ? (
                        <div className="lg:col-span-2">
                          <ForecastChart
                            forecast={forecastData}
                            subjectAddress={currentCMA.subjectAddress}
                            className=""
                            compact={false}
                          />
                        </div>
                      ) : (
                        <div className={`lg:col-span-2 p-6 rounded-lg border ${
                          isLight
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-yellow-900/20 border-yellow-700/30'
                        }`}>
                          <p className={`text-sm ${isLight ? 'text-yellow-800' : 'text-yellow-300'}`}>
                            Forecast data unavailable - insufficient historical appreciation data.
                          </p>
                        </div>
                      )}

                      {/* Risk Gauge */}
                      {riskData ? (
                        <div className="lg:col-span-2">
                          <RiskGauge
                            risk={riskData}
                            className=""
                            compact={false}
                            showRecommendations={true}
                          />
                        </div>
                      ) : (
                        <div className={`lg:col-span-2 p-6 rounded-lg border ${
                          isLight
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-yellow-900/20 border-yellow-700/30'
                        }`}>
                          <p className={`text-sm ${isLight ? 'text-yellow-800' : 'text-yellow-300'}`}>
                            Risk assessment unavailable - insufficient market data.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CMA Report */}
                <div className={`p-6 rounded-xl border ${contentBg} ${borderColor} shadow-lg`}>
                  <CMARenderer
                    cmaSummary={currentCMA.report.summary}
                    appreciationForecast={currentCMA.report.appreciation}
                    cashflowAnalysis={currentCMA.report.cashflow}
                    comps={currentCMA.report.comps}
                    subjectAddress={currentCMA.subjectAddress}
                  />
                </div>

                {/* Mortgage Calculator */}
                {currentCMA.report.summary.estimatedValue && (
                  <div className={`p-6 rounded-xl border ${contentBg} ${borderColor} shadow-lg`}>
                    <div className="flex items-center gap-3 mb-4">
                      <DollarSign className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                      <h3 className={`text-xl font-bold ${textPrimary}`}>
                        Mortgage Calculator
                      </h3>
                    </div>
                    <MortgageCalculator
                      defaultPrice={currentCMA.report.summary.estimatedValue}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`p-12 rounded-xl border ${contentBg} ${borderColor} shadow-lg`}
              >
                <div className="text-center">
                  <svg
                    className={`mx-auto h-16 w-16 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className={`mt-4 text-xl font-semibold ${textPrimary}`}>
                    Generate a CMA Report
                  </h3>
                  <p className={`mt-2 ${textSecondary} max-w-md mx-auto`}>
                    Search for a property address in the sidebar to generate a comprehensive Comparative Market Analysis with valuation, comparables, and investment metrics.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
