// src/app/test/page.tsx
// Test page for static chat component editing and visualization

"use client";

import React, { useState, Suspense } from "react";

// Make this page dynamic (not SSG)
export const dynamic = 'force-dynamic';
import IntegratedChatWidget from "@/app/components/chatwidget/IntegratedChatWidget";
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { EnhancedChatProvider } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";

// CMA Chart Components
import PriceComparisonChart, { type ComparableProperty } from "@/app/components/cma/PriceComparisonChart";
import MarketTrendsChart, { type MarketTrendData } from "@/app/components/cma/MarketTrendsChart";
import PropertyTypePieChart, { type PropertyTypeData } from "@/app/components/cma/PropertyTypePieChart";
import PricePerSqftScatter, { type PricePerSqftData } from "@/app/components/cma/PricePerSqftScatter";
import InvestmentMetricsDashboard, { type InvestmentMetrics } from "@/app/components/cma/InvestmentMetricsDashboard";

// REAL API RESPONSE DATA - from "Show me 3/2 in Palm Desert Country Club"
// Query: POST /api/chat/search-listings
// Body: {"cities":["Palm Desert"],"subdivisions":["Palm Desert Country Club"],"minBeds":3,"minBaths":2,"propertyTypes":["Single Family Residence","Detached"]}
const realAPIListings: Listing[] = [
  {
    id: "20251015192215553931000000",
    price: 2700, // Note: This appears to be a rental price per month
    beds: 3,
    baths: 2,
    sqft: 1330,
    city: "Palm Desert",
    address: "77190 Minnesota Avenue, Palm Desert, CA 92211",
    image: "https://media.crmls.org/medias/cc0d0cec-5d50-4af4-84f8-73ec373d655b.jpg",
    subdivision: "Palm Desert Country Club",
    type: "Single Family Residence",
    url: "/mls-listings/77190-minnesota-avenue-palm-desert-ca-92211",
    latitude: 33.741907,
    longitude: -116.317872,
    slug: "77190-minnesota-avenue-palm-desert-ca-92211",
    slugAddress: "77190-minnesota-avenue-palm-desert-ca-92211",
  },
  {
    id: "20250731161402244646000000",
    price: 499000,
    beds: 3,
    baths: 2,
    sqft: 1330,
    city: "Palm Desert",
    address: "77190 Minnesota Avenue, Palm Desert, CA 92211",
    image: "https://media.crmls.org/medias/a3826609-0eee-4c13-bd9f-753d6295b5e0.jpg",
    subdivision: "Palm Desert Country Club",
    type: "Single Family Residence",
    url: "/mls-listings/77190-minnesota-avenue-palm-desert-ca-92211",
    latitude: 33.741908,
    longitude: -116.317873,
    slug: "77190-minnesota-avenue-palm-desert-ca-92211",
    slugAddress: "77190-minnesota-avenue-palm-desert-ca-92211",
  },
  {
    id: "20251108005145290223000000",
    price: 499000,
    beds: 3,
    baths: 2,
    sqft: 1690,
    city: "Palm Desert",
    address: "42915 Wisconsin Avenue, Palm Desert, CA 92211",
    image: "https://media.crmls.org/medias/eabfd633-1f22-4acc-a99e-2f6da9278cd1.jpg",
    subdivision: "Palm Desert Country Club",
    type: "Single Family Residence",
    url: "/mls-listings/42915-wisconsin-avenue-palm-desert-ca-92211",
    latitude: 33.737534,
    longitude: -116.320118,
    slug: "42915-wisconsin-avenue-palm-desert-ca-92211",
    slugAddress: "42915-wisconsin-avenue-palm-desert-ca-92211",
  },
];

// Map locations derived from real API listings

// CMA CHART SAMPLE DATA
// Sample comparable properties for price comparison
const sampleComparables: ComparableProperty[] = [
  {
    address: "77190 Minnesota Ave",
    price: 499000,
    beds: 3,
    baths: 2,
    sqft: 1330,
    pricePerSqft: 375,
    daysOnMarket: 45,
    isSubject: true, // This is the subject property
  },
  {
    address: "42915 Wisconsin Ave",
    price: 499000,
    beds: 3,
    baths: 2,
    sqft: 1690,
    pricePerSqft: 295,
    daysOnMarket: 30,
  },
  {
    address: "43660 Elkhorn Trail",
    price: 635000,
    beds: 3,
    baths: 2,
    sqft: 1784,
    pricePerSqft: 356,
    daysOnMarket: 45,
  },
  {
    address: "76701 California Dr",
    price: 634900,
    beds: 3,
    baths: 1.75,
    sqft: 2136,
    pricePerSqft: 297,
    daysOnMarket: 30,
  },
  {
    address: "43725 Texas Ave",
    price: 599995,
    beds: 3,
    baths: 1.75,
    sqft: 1494,
    pricePerSqft: 402,
    daysOnMarket: 15,
  },
];

// Sample market trends data
const sampleMarketTrends: MarketTrendData[] = [
  { date: "Jan 2024", avgPrice: 580000, medianPrice: 565000, avgDaysOnMarket: 42, listingsCount: 145 },
  { date: "Feb 2024", avgPrice: 592000, medianPrice: 575000, avgDaysOnMarket: 38, listingsCount: 158 },
  { date: "Mar 2024", avgPrice: 605000, medianPrice: 590000, avgDaysOnMarket: 35, listingsCount: 172 },
  { date: "Apr 2024", avgPrice: 618000, medianPrice: 605000, avgDaysOnMarket: 32, listingsCount: 165 },
  { date: "May 2024", avgPrice: 625000, medianPrice: 610000, avgDaysOnMarket: 30, listingsCount: 182 },
  { date: "Jun 2024", avgPrice: 615000, medianPrice: 600000, avgDaysOnMarket: 33, listingsCount: 195 },
  { date: "Jul 2024", avgPrice: 608000, medianPrice: 595000, avgDaysOnMarket: 36, listingsCount: 188 },
  { date: "Aug 2024", avgPrice: 612000, medianPrice: 598000, avgDaysOnMarket: 34, listingsCount: 175 },
  { date: "Sep 2024", avgPrice: 620000, medianPrice: 605000, avgDaysOnMarket: 31, listingsCount: 168 },
  { date: "Oct 2024", avgPrice: 628000, medianPrice: 612000, avgDaysOnMarket: 29, listingsCount: 162 },
  { date: "Nov 2024", avgPrice: 635000, medianPrice: 618000, avgDaysOnMarket: 27, listingsCount: 155 },
];

// Sample property type distribution
const samplePropertyTypes: PropertyTypeData[] = [
  { type: "Single Family", count: 145, avgPrice: 625000 },
  { type: "Condo", count: 89, avgPrice: 425000 },
  { type: "Townhouse", count: 42, avgPrice: 485000 },
  { type: "Multi-Family", count: 18, avgPrice: 895000 },
];

// Sample price per sqft scatter data
const samplePricePerSqft: PricePerSqftData[] = sampleComparables;

// Sample investment metrics
const sampleInvestmentMetrics: InvestmentMetrics = {
  capRate: 5.8,
  cashOnCashReturn: 9.2,
  grossRentMultiplier: 13.5,
  debtServiceCoverageRatio: 1.42,
  onePercentRule: true,
  estimatedMonthlyRent: 4200,
  purchasePrice: 499000,
  downPayment: 99800, // 20%
  annualExpenses: 18000,
};

export default function TestPage() {
  const [activeComponent, setActiveComponent] = useState<string>("all");

  const components = [
    { id: "all", name: "All Components", description: "View all components at once" },
    { id: "ai-response", name: "AI Response Simulation", description: "Simulated chat response with real API data" },
    { id: "listing-carousel", name: "Listing Carousel", description: "Property listing cards in horizontal scroll" },
    { id: "map-view", name: "Map View", description: "Interactive map with property markers" },
    { id: "cma-charts", name: "CMA Charts", description: "All CMA chart components for market analysis" },
    { id: "integrated-chat", name: "Integrated Chat (Full)", description: "Full-page chat experience" },
  ];

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading...</div>}>
      <MLSProvider>
        <ChatProvider>
          <EnhancedChatProvider>
            <div className="min-h-screen bg-gray-950 text-white">
          {/* Header */}
          <div className="border-b border-gray-800 bg-gray-900">
            <div className="container mx-auto px-6 py-8">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chat Component Test Page
              </h1>
              <p className="text-gray-400">
                Static view of all chat components for development and testing
              </p>
            </div>
          </div>

          {/* Component Selector */}
          <div className="border-b border-gray-800 bg-gray-900/50">
            <div className="container mx-auto px-6 py-4">
              <div className="flex gap-2 flex-wrap">
                {components.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => setActiveComponent(comp.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeComponent === comp.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {comp.name}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-400">
                {components.find((c) => c.id === activeComponent)?.description}
              </p>
            </div>
          </div>

          {/* Component Display Area */}
          <div className="container mx-auto px-6 py-8">
            {/* AI Response Simulation */}
            {(activeComponent === "all" || activeComponent === "ai-response") && (
              <div className="mb-12">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-1">AI Response Simulation</h2>
                  <p className="text-gray-400 text-sm">
                    Real data from API endpoint: POST /api/chat/search-listings
                  </p>
                  <p className="text-blue-400 text-sm mt-1">
                    Query: "Show me 3/2 in Palm Desert Country Club"
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  {/* Simulated User Message */}
                  <div className="mb-4 flex justify-end">
                    <div className="max-w-[80%] px-4 py-2 rounded-lg bg-blue-600 text-white">
                      <p className="text-sm">Show me 3/2 in Palm Desert Country Club</p>
                    </div>
                  </div>

                  {/* Simulated AI Response */}
                  <div className="mb-4 flex justify-start">
                    <div className="max-w-[80%] px-4 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
                      <p className="text-sm">
                        I found 3 properties in Palm Desert Country Club with 3 bedrooms and 2 bathrooms.
                        Let me show you what's available!
                      </p>
                    </div>
                  </div>

                  {/* Listing Results */}
                  <div className="flex justify-start">
                    <div className="w-full">
                      <ListingCarousel
                        listings={realAPIListings}
                        title={`${realAPIListings.length} properties found`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Listing Carousel */}
            {(activeComponent === "all" || activeComponent === "listing-carousel") && (
              <div className="mb-12">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-1">Listing Carousel (Standalone)</h2>
                  <p className="text-gray-400 text-sm">
                    src/app/components/chat/ListingCarousel.tsx
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <ListingCarousel
                    listings={realAPIListings}
                    title="Properties in Palm Desert Country Club"
                  />
                </div>
              </div>
            )}

            {/* Map View */}
            {(activeComponent === "all" || activeComponent === "map-view") && (
              <div className="mb-12">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-1">Map View</h2>
                  <p className="text-gray-400 text-sm">
                    src/app/components/chat/MapView.tsx
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <ChatMapView listings={realAPIListings} />
                </div>
              </div>
            )}

            {/* CMA Charts Section */}
            {(activeComponent === "all" || activeComponent === "cma-charts") && (
              <div className="mb-12">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    CMA Chart Components
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Comprehensive Comparative Market Analysis visualization suite
                  </p>
                </div>

                {/* Price Comparison Bar Chart */}
                <div className="mb-8">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-white">Price Comparison Chart</h3>
                    <p className="text-gray-400 text-sm">
                      src/app/components/cma/PriceComparisonChart.tsx
                    </p>
                  </div>
                  <PriceComparisonChart properties={sampleComparables} />
                </div>

                {/* Market Trends Line Chart */}
                <div className="mb-8">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-white">Market Trends Chart</h3>
                    <p className="text-gray-400 text-sm">
                      src/app/components/cma/MarketTrendsChart.tsx
                    </p>
                  </div>
                  <MarketTrendsChart data={sampleMarketTrends} showDaysOnMarket={true} />
                </div>

                {/* Property Type Pie Chart */}
                <div className="mb-8">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-white">Property Type Distribution</h3>
                    <p className="text-gray-400 text-sm">
                      src/app/components/cma/PropertyTypePieChart.tsx
                    </p>
                  </div>
                  <PropertyTypePieChart data={samplePropertyTypes} />
                </div>

                {/* Price Per Sqft Scatter Plot */}
                <div className="mb-8">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-white">Price per Sqft Analysis</h3>
                    <p className="text-gray-400 text-sm">
                      src/app/components/cma/PricePerSqftScatter.tsx
                    </p>
                  </div>
                  <PricePerSqftScatter data={samplePricePerSqft} />
                </div>

                {/* Investment Metrics Dashboard */}
                <div className="mb-8">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-white">Investment Analysis Dashboard</h3>
                    <p className="text-gray-400 text-sm">
                      src/app/components/cma/InvestmentMetricsDashboard.tsx
                    </p>
                  </div>
                  <InvestmentMetricsDashboard metrics={sampleInvestmentMetrics} />
                </div>
              </div>
            )}

            {/* Integrated Chat Widget (Full) */}
            {(activeComponent === "all" || activeComponent === "integrated-chat") && (
              <div className="mb-12">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-1">Integrated Chat Widget (Full-Page)</h2>
                  <p className="text-gray-400 text-sm">
                    src/app/components/chatwidget/IntegratedChatWidget.tsx
                  </p>
                  <p className="text-yellow-400 text-sm mt-2">
                    ⚠️ This is a full-page component. Best viewed in isolation mode.
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div style={{ height: "800px" }}>
                    <IntegratedChatWidget />
                  </div>
                </div>
              </div>
            )}

            {/* Info Panel */}
            <div className="mt-12 bg-blue-900/20 border border-blue-700/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-blue-400">Development Notes</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    <strong>AI Response Simulation:</strong> Shows how chat messages and listings render together with REAL API data
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    <strong>Listing Carousel:</strong> Horizontal scrolling property cards with live MLS images and details
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    <strong>Map View:</strong> Interactive Mapbox-powered map showing actual property coordinates
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    <strong>Integrated Chat:</strong> Full-page chat experience with sidebar, dashboard, and advanced features
                  </span>
                </li>
              </ul>

              <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                <p className="text-green-400 text-sm font-semibold mb-1">✅ Real API Data Loaded</p>
                <p className="text-gray-300 text-xs">
                  All components now display actual listing data from <code className="bg-gray-800 px-1 rounded">POST /api/chat/search-listings</code>
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Query: 3 bed / 2 bath homes in Palm Desert Country Club subdivision
                </p>
              </div>
            </div>

            {/* CMA Charts Completed Section */}
            <div className="mt-12 bg-purple-900/20 border border-purple-700/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-purple-400">✅ CMA Chart Components - COMPLETED!</h3>
              <p className="text-gray-300 text-sm mb-4">
                All CMA (Comparative Market Analysis) chart components are now live and ready to use:
              </p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓ 📊</span>
                  <span>
                    <strong>Price Comparison Bar Chart:</strong> Interactive price analysis with subject property highlighting
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓ 📈</span>
                  <span>
                    <strong>Market Trends Line Chart:</strong> Multi-series trends with avg/median prices and days on market
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓ 🥧</span>
                  <span>
                    <strong>Property Type Pie Chart:</strong> Distribution visualization with interactive tooltips
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓ 📉</span>
                  <span>
                    <strong>Price per Sqft Scatter Plot:</strong> Bubble chart analyzing value across comparables
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓ 💰</span>
                  <span>
                    <strong>Investment Metrics Dashboard:</strong> Cap Rate, Cash-on-Cash, GRM, DSCR, 1% Rule with visual indicators
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700/20 rounded-lg">
                <p className="text-purple-300 text-xs font-semibold mb-1">📦 Built with:</p>
                <p className="text-gray-400 text-xs">
                  Recharts + Tailwind CSS + TypeScript - Fully responsive and type-safe
                </p>
              </div>
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/20 rounded-lg">
                <p className="text-blue-300 text-xs font-semibold mb-1">🎯 Next Steps:</p>
                <p className="text-gray-400 text-xs">
                  Ready to integrate into chat responses, listing detail pages, and neighborhood pages via the CMA API endpoint
                </p>
              </div>
            </div>
            </div>
          </div>
        </EnhancedChatProvider>
      </ChatProvider>
    </MLSProvider>
  </Suspense>
  );
}
