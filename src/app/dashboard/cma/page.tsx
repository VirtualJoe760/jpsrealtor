'use client';

// src/app/dashboard/cma/page.tsx
// CMA dashboard module showing overview and recent CMAs with analytics

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FileText, TrendingUp, DollarSign, Home, ChevronRight, Target } from 'lucide-react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import CMAPreviewCard from '@/app/components/cma/CMAPreviewCard';
import { getRecentCMAs, getCMACount, type SavedCMA } from '@/app/utils/cma/saveCMA';
import { loadRecentCMAs } from '@/app/utils/cma/loadCMA';
import type { AppreciationForecast, CashflowAnalysis } from '@/lib/cma/cmaTypes';

// Import mini chart components
import AppreciationChart from '@/app/components/cma/charts/AppreciationChart';
import CashflowBarChart from '@/app/components/cma/charts/CashflowBarChart';
import ComparisonScatterChart from '@/app/components/cma/charts/ComparisonScatterChart';
import ConfidenceGauge from '@/app/components/cma/charts/ConfidenceGauge';

export default function CMADashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentTheme } = useTheme();
  const themeClasses = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [recentCMAs, setRecentCMAs] = useState<SavedCMA[]>([]);
  const [totalCMAs, setTotalCMAs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load CMA data
  useEffect(() => {
    loadCMAData();
  }, []);

  const loadCMAData = async () => {
    setIsLoading(true);
    try {
      const recent = getRecentCMAs(5);
      const count = getCMACount();
      setRecentCMAs(recent);
      setTotalCMAs(count);
    } catch (error) {
      console.error('Failed to load CMA data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCMAClick = (cma: SavedCMA) => {
    // Navigate to CMA page with the selected CMA
    router.push(`/cma?id=${cma.id}`);
  };

  const handleViewAllCMAs = () => {
    router.push('/cma');
  };

  const handleGenerateNew = () => {
    router.push('/cma');
  };

  // Calculate stats from recent CMAs
  const avgEstimatedValue =
    recentCMAs.length > 0
      ? recentCMAs.reduce((sum, cma) => sum + (cma.previewData.estimatedValue || 0), 0) / recentCMAs.length
      : 0;

  const avgConfidence =
    recentCMAs.length > 0
      ? recentCMAs.reduce((sum, cma) => sum + (cma.previewData.confidenceScore || 0), 0) / recentCMAs.length
      : 0;

  const totalComps = recentCMAs.reduce((sum, cma) => sum + cma.previewData.compCount, 0);

  // Get most recent CMA for analytics display
  const latestCMA = recentCMAs.length > 0 ? recentCMAs[0] : null;

  // Transform appreciation data for chart
  const transformedAppreciation: AppreciationForecast | undefined = latestCMA?.report?.appreciation ? {
    cagr1: 'cagr1' in latestCMA.report.appreciation ? latestCMA.report.appreciation.cagr1 : null,
    cagr3: 'cagr3' in latestCMA.report.appreciation ? latestCMA.report.appreciation.cagr3 : null,
    cagr5: 'cagr5' in latestCMA.report.appreciation ? latestCMA.report.appreciation.cagr5 : null,
    projected5Year: 'projected5Year' in latestCMA.report.appreciation ? latestCMA.report.appreciation.projected5Year : null,
    historyYears: 'historyYears' in latestCMA.report.appreciation ? latestCMA.report.appreciation.historyYears : [],
    volatilityIndex: 'volatilityIndex' in latestCMA.report.appreciation ? latestCMA.report.appreciation.volatilityIndex : null,
  } : undefined;

  // Transform cashflow data for chart
  const transformedCashflow: CashflowAnalysis | undefined = latestCMA?.report?.cashflow ? {
    monthlyRent: latestCMA.report.cashflow.rentEstimate || 0,
    monthlyMortgage: latestCMA.report.cashflow.mortgage || 0,
    monthlyTaxes: latestCMA.report.cashflow.taxes || 0,
    monthlyInsurance: latestCMA.report.cashflow.insurance || 0,
    monthlyMaintenance: latestCMA.report.cashflow.maintenance || 0,
    monthlyHOA: latestCMA.report.cashflow.hoa || 0,
    monthlyUtilities: 0,
    monthlyCashflow: latestCMA.report.cashflow.noi || 0,
    annualCashflow: (latestCMA.report.cashflow.noi || 0) * 12,
    cocReturn: latestCMA.report.cashflow.cocReturn || 0,
    capRate: latestCMA.report.cashflow.capRate || 0,
  } : undefined;

  // Calculate avgDaysOnMarket from latest CMA
  const avgDaysOnMarket = latestCMA?.report?.comps && latestCMA.report.comps.length > 0
    ? Math.round(latestCMA.report.comps.reduce((sum, comp) => sum + (comp.dom || 0), 0) / latestCMA.report.comps.length)
    : undefined;

  // Overview cards
  const overviewCards = [
    {
      title: 'Total CMAs',
      value: totalCMAs.toString(),
      icon: FileText,
      color: isLight ? 'text-blue-600' : 'text-blue-400',
      bgColor: isLight ? 'bg-blue-100' : 'bg-blue-900/20',
    },
    {
      title: 'Avg. Estimated Value',
      value: avgEstimatedValue > 0 ? `$${Math.round(avgEstimatedValue).toLocaleString()}` : 'N/A',
      icon: DollarSign,
      color: isLight ? 'text-green-600' : 'text-green-400',
      bgColor: isLight ? 'bg-green-100' : 'bg-green-900/20',
    },
    {
      title: 'Avg. Confidence',
      value: avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : 'N/A',
      icon: TrendingUp,
      color: isLight ? 'text-purple-600' : 'text-purple-400',
      bgColor: isLight ? 'bg-purple-100' : 'bg-purple-900/20',
    },
    {
      title: 'Total Comparables',
      value: totalComps.toString(),
      icon: Home,
      color: isLight ? 'text-orange-600' : 'text-orange-400',
      bgColor: isLight ? 'bg-orange-100' : 'bg-orange-900/20',
    },
  ];

  const glassmorphismStyle = isLight ? {
    backdropFilter: "blur(12px) saturate(160%)",
    WebkitBackdropFilter: "blur(12px) saturate(160%)",
  } : {};

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClasses.pageBg}`}>
        <div className="container mx-auto p-8">
          <div className="flex items-center justify-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isLight ? 'border-blue-500' : 'border-emerald-500'}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <div className="container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${themeClasses.textPrimary}`}>
              CMA Dashboard
            </h1>
            <p className={`mt-2 ${themeClasses.textSecondary}`}>
              View and manage your Comparative Market Analysis reports
            </p>
          </div>

          <button
            onClick={handleGenerateNew}
            className={`px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            Generate New CMA
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  ${themeClasses.cardBg} border ${themeClasses.cardBorder}
                  rounded-xl p-6 shadow-sm
                `}
                style={glassmorphismStyle}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold ${themeClasses.textPrimary} mt-1`}>
                    {card.value}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Analytics Overview - New Section */}
        {latestCMA && latestCMA.report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`
              ${themeClasses.cardBg} border ${themeClasses.cardBorder}
              rounded-xl p-6 shadow-lg
            `}
            style={glassmorphismStyle}
          >
            <div className="flex items-center gap-3 mb-6">
              <Target className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                Analytics Overview
              </h2>
              <span className={`text-sm ${themeClasses.textSecondary} ml-auto`}>
                Based on latest CMA: {latestCMA.subjectAddress}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mini Appreciation Chart */}
              {transformedAppreciation && transformedAppreciation.historyYears && transformedAppreciation.historyYears.length > 0 && (
                <AppreciationChart
                  appreciation={transformedAppreciation}
                  subjectAddress={latestCMA.subjectAddress}
                />
              )}

              {/* Mini Confidence Gauge */}
              {latestCMA.report.summary?.confidenceScore !== undefined && latestCMA.report.summary.confidenceScore !== null && (
                <ConfidenceGauge
                  confidenceScore={latestCMA.report.summary.confidenceScore}
                  compCount={latestCMA.report.comps?.length}
                  avgDaysOnMarket={avgDaysOnMarket}
                />
              )}

              {/* Mini Cashflow Chart */}
              {transformedCashflow && transformedCashflow.monthlyMortgage > 0 && (
                <div className="md:col-span-2">
                  <CashflowBarChart
                    cashflow={transformedCashflow}
                    subjectAddress={latestCMA.subjectAddress}
                  />
                </div>
              )}

              {/* Mini Comparison Scatter */}
              {latestCMA.report.comps && latestCMA.report.comps.length > 0 && latestCMA.report.summary && (
                <div className="md:col-span-2">
                  <ComparisonScatterChart
                    summary={latestCMA.report.summary}
                    comps={latestCMA.report.comps}
                    subjectProperty={latestCMA.subjectAddress ? {
                      sqft: latestCMA.report.summary.avgSqft,
                      price: latestCMA.report.summary.estimatedValue
                    } : undefined}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Recent CMAs */}
        <div
          className={`${themeClasses.cardBg} border ${themeClasses.cardBorder} rounded-xl p-6 shadow-sm`}
          style={glassmorphismStyle}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${themeClasses.textPrimary}`}>
              Recent CMAs
            </h2>
            {recentCMAs.length > 0 && (
              <button
                onClick={handleViewAllCMAs}
                className={`flex items-center gap-1 text-sm hover:underline ${
                  isLight ? 'text-blue-600' : 'text-blue-400'
                }`}
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {recentCMAs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className={`mx-auto h-16 w-16 mb-4 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>
                No CMAs Generated Yet
              </h3>
              <p className={`${themeClasses.textSecondary} mb-6 max-w-md mx-auto`}>
                Generate your first Comparative Market Analysis to see property valuations, market trends, and investment metrics.
              </p>
              <button
                onClick={handleGenerateNew}
                className={`px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2 ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <FileText className="w-5 h-5" />
                Generate Your First CMA
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentCMAs.map((cma) => (
                <CMAPreviewCard
                  key={cma.id}
                  cma={cma}
                  onClick={() => handleCMAClick(cma)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`
              ${themeClasses.cardBg} border ${themeClasses.cardBorder}
              rounded-xl p-6 shadow-sm cursor-pointer
              hover:shadow-md transition-shadow
            `}
            style={glassmorphismStyle}
            onClick={handleGenerateNew}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isLight ? 'bg-blue-100' : 'bg-blue-900/20'}`}>
                <FileText className={`w-8 h-8 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${themeClasses.textPrimary}`}>
                  Generate New CMA
                </h3>
                <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                  Create a professional property valuation report
                </p>
              </div>
              <ChevronRight className={`w-5 h-5 ${themeClasses.textSecondary}`} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`
              ${themeClasses.cardBg} border ${themeClasses.cardBorder}
              rounded-xl p-6 shadow-sm cursor-pointer
              hover:shadow-md transition-shadow
            `}
            style={glassmorphismStyle}
            onClick={handleViewAllCMAs}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isLight ? 'bg-purple-100' : 'bg-purple-900/20'}`}>
                <TrendingUp className={`w-8 h-8 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${themeClasses.textPrimary}`}>
                  View All CMAs
                </h3>
                <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                  Browse and manage your saved CMA reports
                </p>
              </div>
              <ChevronRight className={`w-5 h-5 ${themeClasses.textSecondary}`} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
