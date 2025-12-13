// src/app/components/chat/AnalyticsFormulaModal.tsx
// Modal explaining chatRealty AI Analytics formulas

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, TrendingUp, Calculator } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";

export interface AnalyticsFormulaModalProps {
  metric: string;
  onClose: () => void;
}

export default function AnalyticsFormulaModal({ metric, onClose }: AnalyticsFormulaModalProps) {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary, textMuted, cardBg, cardBorder } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Formula details based on metric type
  const getFormulaDetails = () => {
    const lowerMetric = metric.toLowerCase();

    if (lowerMetric.includes("appreciation") || lowerMetric.includes("growth")) {
      return {
        title: "Property Appreciation Analytics",
        icon: <TrendingUp className="w-8 h-8" />,
        description: "Our AI calculates property appreciation using historical MLS sales data to identify market trends.",
        formulas: [
          {
            name: "Annual Appreciation Rate",
            formula: "((End Price ÷ Start Price)^(1 / Years)) - 1",
            example: "((617,000 ÷ 450,000)^(1 / 5)) - 1 = 6.5% annually"
          },
          {
            name: "Cumulative Appreciation",
            formula: "((End Price ÷ Start Price) - 1) × 100",
            example: "((617,000 ÷ 450,000) - 1) × 100 = 37.2% total"
          },
          {
            name: "Market Confidence",
            formula: "Based on transaction volume and data consistency",
            example: "500+ sales = High confidence"
          }
        ],
        dataSources: ["MLS Historical Sales Data", "Median Price Trends", "Transaction Volume Analysis"],
        methodology: "We analyze closed sales over the specified period, calculate median prices for each time period, and apply compound annual growth rate (CAGR) formulas to determine appreciation trends."
      };
    }

    if (lowerMetric.includes("price") || lowerMetric.includes("market")) {
      return {
        title: "Market Price Analytics",
        icon: <Calculator className="w-8 h-8" />,
        description: "Market statistics calculated from active MLS listings in real-time.",
        formulas: [
          {
            name: "Average Price",
            formula: "Sum of all listing prices ÷ Number of listings",
            example: "$650,000 average from 100 listings"
          },
          {
            name: "Median Price",
            formula: "Middle value when all prices are sorted",
            example: "$625,000 (50th percentile)"
          },
          {
            name: "Price per Square Foot",
            formula: "List Price ÷ Living Area",
            example: "$650,000 ÷ 2,500 sqft = $260/sqft"
          }
        ],
        dataSources: ["Active MLS Listings", "Property Characteristics", "Days on Market"],
        methodology: "We aggregate current active listings, filter by location and property type, and calculate statistical measures including mean, median, and distribution metrics."
      };
    }

    // Default generic analytics
    return {
      title: "chatRealty AI Analytics",
      icon: <BarChart3 className="w-8 h-8" />,
      description: "Our AI-powered analytics engine processes MLS data to provide accurate market insights.",
      formulas: [
        {
          name: "Data Collection",
          formula: "Real-time MLS data aggregation",
          example: "Updated every 15 minutes"
        },
        {
          name: "Statistical Analysis",
          formula: "Mean, median, percentiles, and trends",
          example: "Multi-year historical comparisons"
        },
        {
          name: "Confidence Scoring",
          formula: "Based on data volume and consistency",
          example: "High/Medium/Low confidence ratings"
        }
      ],
      dataSources: ["MLS Listings Database", "Historical Sales Records", "Market Statistics API"],
      methodology: "We use industry-standard real estate analytics methodologies combined with AI to identify patterns, trends, and insights from comprehensive MLS data."
    };
  };

  const details = getFormulaDetails();

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div
          className={`rounded-2xl p-6 md:p-8 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto ${cardBg} ${cardBorder} border-2`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                isLight ? "bg-blue-100 text-blue-600" : "bg-emerald-500/20 text-emerald-400"
              }`}>
                {details.icon}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${textPrimary}`}>
                  {details.title}
                </h2>
                <p className={`text-sm mt-1 ${textSecondary}`}>
                  {details.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isLight ? "hover:bg-gray-100 text-gray-500" : "hover:bg-gray-800 text-gray-400"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulas */}
          <div className="space-y-4 mb-6">
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Calculation Methods</h3>
            {details.formulas.map((formula, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl ${
                  isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/50 border border-gray-700"
                }`}
              >
                <h4 className={`font-semibold mb-2 ${textPrimary}`}>{formula.name}</h4>
                <code className={`block font-mono text-sm mb-2 ${
                  isLight ? "text-blue-700" : "text-emerald-400"
                }`}>
                  {formula.formula}
                </code>
                <p className={`text-sm ${textMuted}`}>
                  <span className="font-medium">Example:</span> {formula.example}
                </p>
              </div>
            ))}
          </div>

          {/* Data Sources */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${textPrimary}`}>Data Sources</h3>
            <ul className={`space-y-2 ${textSecondary}`}>
              {details.dataSources.map((source, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className={isLight ? "text-blue-500" : "text-emerald-400"}>•</span>
                  <span>{source}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Methodology */}
          <div className={`p-4 rounded-xl ${
            isLight ? "bg-blue-50 border border-blue-200" : "bg-emerald-500/10 border border-emerald-500/30"
          }`}>
            <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Methodology</h3>
            <p className={`text-sm ${textSecondary}`}>
              {details.methodology}
            </p>
          </div>

          {/* Disclaimer */}
          <div className={`mt-6 p-4 rounded-xl ${
            isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/50 border border-gray-700"
          }`}>
            <p className={`text-xs ${textMuted}`}>
              <strong>Disclaimer:</strong> Analytics are based on historical MLS data and statistical models.
              Past performance does not guarantee future results. These calculations are for informational
              purposes only and should not be considered financial or investment advice. Always consult with
              licensed real estate and financial professionals before making investment decisions.
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              }`}
            >
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
