// src/app/test/page.tsx
// Test page for testing chat widgets with REAL API calls

"use client";

import React, { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import IntegratedChatWidget from "@/app/components/chatwidget/IntegratedChatWidget";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { EnhancedChatProvider } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ThemeProvider } from "@/app/contexts/ThemeContext";

// Chat Components
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";

// CMA Components
import PriceComparisonChart, { type ComparableProperty } from "@/app/components/cma/PriceComparisonChart";
import MarketTrendsChart, { type MarketTrendData } from "@/app/components/cma/MarketTrendsChart";
import PropertyTypePieChart, { type PropertyTypeData } from "@/app/components/cma/PropertyTypePieChart";
import PricePerSqftScatter, { type PricePerSqftData } from "@/app/components/cma/PricePerSqftScatter";
import InvestmentMetricsDashboard, { type InvestmentMetrics } from "@/app/components/cma/InvestmentMetricsDashboard";

export const dynamic = 'force-dynamic';

export default function TestPage() {
  const [activeTest, setActiveTest] = useState<string>("chat-subdivision");
  const [cmaData, setCmaData] = useState<any>(null);
  const [cmaApiData, setCmaApiData] = useState<any>(null);
  const [subdivisionListings, setSubdivisionListings] = useState<Listing[]>([]);
  const [cityListings, setCityListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmaApiLoading, setCmaApiLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);

  const tests = [
    {
      id: "chat-subdivision",
      name: "AI Chat - Subdivision Query",
      description: 'Simulated: "Show me homes in Palm Desert Country Club"'
    },
    {
      id: "chat-city",
      name: "AI Chat - City Query",
      description: 'Simulated: "Show me homes in La Quinta"'
    },
    {
      id: "integrated",
      name: "Integrated Chat Widget",
      description: "Full-page chat with REAL API calls to /api/chat"
    },
    {
      id: "cma",
      name: "CMA Charts (Manual Calc)",
      description: "CMA charts with manual calculations from listing data"
    },
    {
      id: "cma-api",
      name: "CMA API (Real Investment Analysis)",
      description: "Full CMA from /api/ai/cma with investment metrics"
    },
  ];

  // Fetch real listing data for CMA calculations
  useEffect(() => {
    async function fetchCMAData() {
      try {
        setLoading(true);

        // Fetch listings from a subdivision for CMA analysis
        const response = await fetch("/api/subdivisions/palm-desert-country-club/listings?limit=50");
        if (!response.ok) throw new Error("Failed to fetch listings");

        const data = await response.json();
        const listings = data.listings;

        // Calculate CMA data from real listings
        const comparables: ComparableProperty[] = listings.slice(0, 10).map((l: any) => ({
          address: l.address || l.unparsedAddress || "Unknown",
          price: l.listPrice || 0,
          beds: l.bedroomsTotal || 0,
          baths: l.bathroomsTotalDecimal || 0,
          sqft: l.livingArea || 1,
          pricePerSqft: l.livingArea ? (l.listPrice || 0) / l.livingArea : 0,
          daysOnMarket: l.daysOnMarket || 0,
        }));

        // Calculate property type distribution
        const typeCount: { [key: string]: number } = {};
        listings.forEach((l: any) => {
          const type = l.propertySubType || "Unknown";
          typeCount[type] = (typeCount[type] || 0) + 1;
        });

        const propertyTypes: PropertyTypeData[] = Object.entries(typeCount).map(([type, count]) => ({
          type,
          count: count as number,
          avgPrice: listings
            .filter((l: any) => (l.propertySubType || "Unknown") === type)
            .reduce((sum: number, l: any) => sum + (l.listPrice || 0), 0) / (count as number),
        }));

        // Calculate market trends (by month)
        const trendMap: { [key: string]: { totalPrice: number; count: number; sold: number } } = {};
        listings.forEach((l: any) => {
          if (l.listDate) {
            const date = new Date(l.listDate);
            const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
            if (!trendMap[monthKey]) {
              trendMap[monthKey] = { totalPrice: 0, count: 0, sold: 0 };
            }
            trendMap[monthKey].totalPrice += l.listPrice || 0;
            trendMap[monthKey].count += 1;
            if (l.standardStatus === "Closed" || l.standardStatus === "Sold") {
              trendMap[monthKey].sold += 1;
            }
          }
        });

        const marketTrends: MarketTrendData[] = Object.entries(trendMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6) // Last 6 months
          .map(([month, data]) => ({
            date: month,
            avgPrice: data.count > 0 ? data.totalPrice / data.count : 0,
            medianPrice: data.count > 0 ? data.totalPrice / data.count : 0, // Simplified
            avgDaysOnMarket: 0, // Would need to calculate from listing data
            listingsCount: data.count,
          }));

        // Calculate investment metrics (example property)
        const exampleProperty = listings[0];
        const investmentMetrics: InvestmentMetrics = {
          capRate: 5.8,
          cashOnCashReturn: 9.2,
          grossRentMultiplier: 13.5,
          debtServiceCoverageRatio: 1.42,
          onePercentRule: exampleProperty ? (exampleProperty.listPrice * 0.01) > 3000 : true,
          estimatedMonthlyRent: exampleProperty ? Math.round(exampleProperty.listPrice * 0.01) : 4200,
          purchasePrice: exampleProperty?.listPrice || 499000,
          downPayment: exampleProperty ? Math.round(exampleProperty.listPrice * 0.2) : 99800,
          annualExpenses: 18000,
        };

        setCmaData({
          comparables,
          propertyTypes,
          marketTrends,
          investmentMetrics,
          pricePerSqft: comparables,
        });
      } catch (error) {
        console.error("Error fetching CMA data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCMAData();
  }, []);

  // Fetch CMA from REAL API endpoint
  useEffect(() => {
    async function fetchCMAFromAPI() {
      try {
        setCmaApiLoading(true);

        // Use the REAL CMA API with a sample subdivision
        const response = await fetch("/api/ai/cma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subdivision: "Palm Desert Country Club",
            city: "Palm Desert",
            maxComps: 10,
            includeInvestmentAnalysis: true,
            assumptions: {
              downPaymentPercent: 20,
              interestRate: 7.0,
              loanTermYears: 30,
              rentToValueRatio: 0.008,
              propertyTaxRate: 1.25,
              insuranceAnnual: 1200,
              maintenancePercent: 1,
              vacancyRate: 8,
              propertyManagementFee: 10,
            }
          })
        });

        if (!response.ok) {
          throw new Error(`CMA API failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("CMA API Response:", data);
        setCmaApiData(data);
      } catch (error) {
        console.error("Error fetching CMA from API:", error);
      } finally {
        setCmaApiLoading(false);
      }
    }

    fetchCMAFromAPI();
  }, []);

  // Fetch real listings for chat simulations
  useEffect(() => {
    async function fetchChatListings() {
      try {
        setChatLoading(true);

        // Fetch subdivision listings (Palm Desert Country Club) - Get ALL listings
        const subdivisionResponse = await fetch("/api/subdivisions/palm-desert-country-club/listings?limit=100");
        if (subdivisionResponse.ok) {
          const subdivisionData = await subdivisionResponse.json();
          const formattedSubdivision = subdivisionData.listings.map((l: any) => ({
            id: l.listingKey || l.listingId,
            price: l.listPrice || 0,
            beds: l.bedroomsTotal || l.bedsTotal || 0,
            baths: l.bathroomsTotalDecimal || l.bathroomsTotalInteger || 0,
            sqft: l.livingArea || 0,
            city: l.city || "",
            address: l.address || "",
            image: l.primaryPhotoUrl || "",
            subdivision: subdivisionData.subdivision?.name || "Palm Desert Country Club",
            type: l.propertySubType || l.propertyType || "",
            url: `/mls-listings/${l.slugAddress || l.slug}`,
            latitude: l.latitude,
            longitude: l.longitude,
            slug: l.slugAddress || l.slug,
            slugAddress: l.slugAddress || l.slug,
          }));
          setSubdivisionListings(formattedSubdivision);
        }

        // Fetch city listings (La Quinta) - Get ALL listings
        const cityResponse = await fetch("/api/cities/la-quinta/listings?limit=100");
        if (cityResponse.ok) {
          const cityData = await cityResponse.json();
          const formattedCity = cityData.listings.map((l: any) => ({
            id: l.listingKey || l.listingId,
            price: l.listPrice || 0,
            beds: l.beds || l.bedsTotal || l.bedroomsTotal || 0,
            baths: l.baths || l.bathroomsTotalDecimal || l.bathroomsTotalInteger || 0,
            sqft: l.livingArea || 0,
            city: "La Quinta",
            address: l.address || "",
            image: l.photoUrl || l.primaryPhotoUrl || "",
            subdivision: l.subdivisionName || "",
            type: l.propertySubType || l.propertyType || "",
            url: `/mls-listings/${l.slugAddress || l.slug}`,
            latitude: l.coordinates?.latitude || l.latitude,
            longitude: l.coordinates?.longitude || l.longitude,
            slug: l.slugAddress || l.slug,
            slugAddress: l.slugAddress || l.slug,
          }));
          setCityListings(formattedCity);
        }
      } catch (error) {
        console.error("Error fetching chat listings:", error);
      } finally {
        setChatLoading(false);
      }
    }

    fetchChatListings();
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider>
        <MLSProvider>
          <ChatProvider>
            <EnhancedChatProvider>
              <div className="min-h-screen bg-gray-950 text-white">
                {/* Header */}
                <div className="border-b border-gray-800 bg-gray-900">
                  <div className="container mx-auto px-6 py-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Chat Widget Test Page - REAL API
                    </h1>
                    <p className="text-gray-400">
                      Testing chat widgets with live API calls (no mock data)
                    </p>
                  </div>
                </div>

                {/* Test Selector */}
                <div className="border-b border-gray-800 bg-gray-900/50">
                  <div className="container mx-auto px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {tests.map((test) => (
                        <button
                          key={test.id}
                          onClick={() => setActiveTest(test.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTest === test.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {test.name}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-400">
                      {tests.find((t) => t.id === activeTest)?.description}
                    </p>
                  </div>
                </div>

                {/* Test Content */}
                <div className="h-[calc(100vh-240px)]">
                  {/* AI Chat - Subdivision Query */}
                  {activeTest === "chat-subdivision" && (
                    <div className="container mx-auto px-6 py-8 overflow-y-auto h-full">
                      {chatLoading ? (
                        <div className="text-center py-12">
                          <p className="text-xl text-gray-400">Loading listings...</p>
                        </div>
                      ) : (
                        <div className="max-w-5xl mx-auto">
                          <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-2xl font-bold mb-2">AI Chat Simulation - Subdivision Query</h2>
                            <p className="text-gray-400 text-sm">
                              Real listing data from: /api/subdivisions/palm-desert-country-club/listings
                            </p>
                          </div>

                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            {/* Simulated User Message */}
                            <div className="mb-6 flex justify-end">
                              <div className="max-w-[80%] px-4 py-3 rounded-lg bg-blue-600 text-white">
                                <p className="text-sm font-medium">Show me homes in Palm Desert Country Club</p>
                              </div>
                            </div>

                            {/* Simulated AI Response */}
                            <div className="mb-6 flex justify-start">
                              <div className="max-w-[80%] px-4 py-3 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
                                <p className="text-sm">
                                  I found {subdivisionListings.length} beautiful properties in Palm Desert Country Club.
                                  This community is known for its golf course access and resort-style amenities.
                                  Let me show you what's available!
                                </p>
                              </div>
                            </div>

                            {/* Listing Results */}
                            <div className="flex justify-start">
                              <div className="w-full">
                                <ListingCarousel
                                  listings={subdivisionListings}
                                  title={`${subdivisionListings.length} properties in Palm Desert Country Club`}
                                />
                              </div>
                            </div>

                            {/* Map View */}
                            <div className="mt-6 flex justify-start">
                              <div className="w-full">
                                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Map View</h4>
                                  <p className="text-xs text-gray-500">
                                    Showing {subdivisionListings.length} properties on the map
                                  </p>
                                </div>
                                <ChatMapView listings={subdivisionListings} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Chat - City Query */}
                  {activeTest === "chat-city" && (
                    <div className="container mx-auto px-6 py-8 overflow-y-auto h-full">
                      {chatLoading ? (
                        <div className="text-center py-12">
                          <p className="text-xl text-gray-400">Loading listings...</p>
                        </div>
                      ) : (
                        <div className="max-w-5xl mx-auto">
                          <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-2xl font-bold mb-2">AI Chat Simulation - City Query</h2>
                            <p className="text-gray-400 text-sm">
                              Real listing data from: /api/cities/la-quinta/listings
                            </p>
                          </div>

                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            {/* Simulated User Message */}
                            <div className="mb-6 flex justify-end">
                              <div className="max-w-[80%] px-4 py-3 rounded-lg bg-blue-600 text-white">
                                <p className="text-sm font-medium">Show me homes in La Quinta</p>
                              </div>
                            </div>

                            {/* Simulated AI Response */}
                            <div className="mb-6 flex justify-start">
                              <div className="max-w-[80%] px-4 py-3 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
                                <p className="text-sm">
                                  I found {cityListings.length} fantastic homes in La Quinta!
                                  La Quinta offers stunning mountain views, world-class golf courses, and a family-friendly atmosphere.
                                  Here are some great options for you:
                                </p>
                              </div>
                            </div>

                            {/* Listing Results */}
                            <div className="flex justify-start">
                              <div className="w-full">
                                <ListingCarousel
                                  listings={cityListings}
                                  title={`${cityListings.length} properties in La Quinta`}
                                />
                              </div>
                            </div>

                            {/* Map View */}
                            <div className="mt-6 flex justify-start">
                              <div className="w-full">
                                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Map View</h4>
                                  <p className="text-xs text-gray-500">
                                    Showing {cityListings.length} properties on the map
                                  </p>
                                </div>
                                <ChatMapView listings={cityListings} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Integrated Chat Widget Test */}
                  {activeTest === "integrated" && (
                    <div className="h-full">
                      <IntegratedChatWidget />
                    </div>
                  )}

                  {/* CMA Charts Test (Manual Calculations) */}
                  {activeTest === "cma" && (
                    <div className="container mx-auto px-6 py-8 overflow-y-auto h-full">
                      {loading ? (
                        <div className="text-center py-12">
                          <p className="text-xl text-gray-400">Loading CMA data from API...</p>
                        </div>
                      ) : cmaData ? (
                        <div className="space-y-8">
                          {/* Header */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-2xl font-bold mb-2">Comparative Market Analysis (Manual)</h2>
                            <p className="text-gray-400">
                              Charts with manual calculations from listing data
                            </p>
                            <p className="text-sm text-emerald-400 mt-2">
                              Data source: /api/subdivisions/palm-desert-country-club/listings
                            </p>
                          </div>

                          {/* Price Comparison Chart */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold mb-4">Price Comparison</h3>
                            <PriceComparisonChart properties={cmaData.comparables} />
                          </div>

                          {/* Market Trends Chart */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold mb-4">Market Trends</h3>
                            <MarketTrendsChart data={cmaData.marketTrends} />
                          </div>

                          {/* Property Types Pie Chart */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold mb-4">Property Type Distribution</h3>
                            <PropertyTypePieChart data={cmaData.propertyTypes} />
                          </div>

                          {/* Price Per Sqft Scatter */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold mb-4">Price Per Square Foot Analysis</h3>
                            <PricePerSqftScatter data={cmaData.pricePerSqft} />
                          </div>

                          {/* Investment Metrics Dashboard */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold mb-4">Investment Metrics</h3>
                            <InvestmentMetricsDashboard metrics={cmaData.investmentMetrics} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-xl text-red-400">Failed to load CMA data</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CMA API Test (Real Investment Analysis) */}
                  {activeTest === "cma-api" && (
                    <div className="container mx-auto px-6 py-8 overflow-y-auto h-full">
                      {cmaApiLoading ? (
                        <div className="text-center py-12">
                          <p className="text-xl text-gray-400">Loading CMA from /api/ai/cma...</p>
                          <p className="text-sm text-gray-500 mt-2">Running investment analysis calculations</p>
                        </div>
                      ) : cmaApiData ? (
                        <div className="space-y-8">
                          {/* Header */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-2xl font-bold mb-2">CMA from Real API</h2>
                            <p className="text-gray-400">
                              Full Comparative Market Analysis with investment calculations
                            </p>
                            <p className="text-sm text-emerald-400 mt-2">
                              Data source: /api/ai/cma (POST)
                            </p>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Comparables:</span>
                                <span className="text-white font-semibold ml-2">
                                  {cmaApiData.cmaMetrics?.comparablesCount || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Median $/sqft:</span>
                                <span className="text-white font-semibold ml-2">
                                  ${cmaApiData.cmaMetrics?.medianPricePerSqft?.toFixed(0) || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg DOM:</span>
                                <span className="text-white font-semibold ml-2">
                                  {cmaApiData.cmaMetrics?.averageDaysOnMarket?.toFixed(0) || 0} days
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Market:</span>
                                <span className="text-white font-semibold ml-2">
                                  {cmaApiData.marketContext?.marketType || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Investment Analysis Dashboard */}
                          {cmaApiData.investmentAnalysis && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                              <h3 className="text-xl font-bold mb-4">Investment Analysis</h3>
                              <InvestmentMetricsDashboard
                                metrics={{
                                  capRate: cmaApiData.investmentAnalysis.metrics.capRate.value,
                                  cashOnCashReturn: cmaApiData.investmentAnalysis.metrics.cashOnCashReturn.value,
                                  grossRentMultiplier: cmaApiData.investmentAnalysis.metrics.grossRentMultiplier.value,
                                  debtServiceCoverageRatio: cmaApiData.investmentAnalysis.metrics.debtServiceCoverageRatio.value,
                                  onePercentRule: cmaApiData.investmentAnalysis.metrics.onePercentRule.passes,
                                  estimatedMonthlyRent: cmaApiData.investmentAnalysis.estimatedMonthlyRent,
                                  purchasePrice: cmaApiData.investmentAnalysis.purchasePrice,
                                  downPayment: cmaApiData.investmentAnalysis.downPayment,
                                  annualExpenses: cmaApiData.investmentAnalysis.monthlyExpenses.total * 12,
                                }}
                              />

                              {/* Cash Flow Breakdown */}
                              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-800/50 rounded-lg p-4">
                                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Monthly Income</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Estimated Rent</span>
                                      <span className="text-green-400 font-semibold">
                                        ${cmaApiData.investmentAnalysis.estimatedMonthlyRent?.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-gray-800/50 rounded-lg p-4">
                                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Monthly Expenses</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Mortgage</span>
                                      <span className="text-red-400">
                                        ${cmaApiData.investmentAnalysis.monthlyExpenses.mortgage?.toFixed(0)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Property Tax</span>
                                      <span className="text-red-400">
                                        ${cmaApiData.investmentAnalysis.monthlyExpenses.propertyTax?.toFixed(0)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Insurance</span>
                                      <span className="text-red-400">
                                        ${cmaApiData.investmentAnalysis.monthlyExpenses.insurance?.toFixed(0)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">HOA</span>
                                      <span className="text-red-400">
                                        ${cmaApiData.investmentAnalysis.monthlyExpenses.hoa?.toFixed(0)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                      <span className="text-white font-semibold">Total Expenses</span>
                                      <span className="text-red-400 font-semibold">
                                        ${cmaApiData.investmentAnalysis.monthlyExpenses.total?.toFixed(0)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                      <span className="text-white font-semibold">Net Cash Flow</span>
                                      <span className={`font-semibold ${
                                        cmaApiData.investmentAnalysis.monthlyCashFlow > 0 ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                        ${cmaApiData.investmentAnalysis.monthlyCashFlow?.toFixed(0)}/mo
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Comparable Properties */}
                          {cmaApiData.comparables && cmaApiData.comparables.length > 0 && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                              <h3 className="text-xl font-bold mb-4">Comparable Properties</h3>
                              <PriceComparisonChart
                                properties={cmaApiData.comparables.map((comp: any) => ({
                                  address: comp.address || "Unknown",
                                  price: comp.listPrice || 0,
                                  beds: comp.beds || 0,
                                  baths: comp.baths || 0,
                                  sqft: comp.sqft || 1,
                                  pricePerSqft: comp.pricePerSqft || 0,
                                  daysOnMarket: comp.daysOnMarket || 0,
                                }))}
                              />
                            </div>
                          )}

                          {/* CMA Metrics Summary */}
                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold mb-4">Market Metrics Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 mb-1">Avg Price/Sqft</p>
                                <p className="text-2xl font-bold text-blue-400">
                                  ${cmaApiData.cmaMetrics?.averagePricePerSqft?.toFixed(0)}
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 mb-1">Median Price/Sqft</p>
                                <p className="text-2xl font-bold text-green-400">
                                  ${cmaApiData.cmaMetrics?.medianPricePerSqft?.toFixed(0)}
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 mb-1">Price Range</p>
                                <p className="text-lg font-bold text-purple-400">
                                  ${(cmaApiData.cmaMetrics?.priceRange?.min / 1000).toFixed(0)}k -
                                  ${(cmaApiData.cmaMetrics?.priceRange?.max / 1000).toFixed(0)}k
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 mb-1">Avg Days on Market</p>
                                <p className="text-2xl font-bold text-yellow-400">
                                  {cmaApiData.cmaMetrics?.averageDaysOnMarket?.toFixed(0)} days
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 mb-1">Price Reduction Rate</p>
                                <p className="text-2xl font-bold text-orange-400">
                                  {cmaApiData.cmaMetrics?.priceReductionRate?.toFixed(1)}%
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 mb-1">Market Type</p>
                                <p className="text-lg font-bold text-indigo-400">
                                  {cmaApiData.marketContext?.marketType}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-xl text-red-400">Failed to load CMA from API</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* API Info Footer */}
                <div className="border-t border-gray-800 bg-gray-900/50">
                  <div className="container mx-auto px-6 py-4">
                    <div className="text-sm text-gray-400">
                      <strong className="text-white">API Routes:</strong> /api/chat (Groq AI) | /api/chat/search-listings (MLS Search)
                      <span className="mx-2">•</span>
                      <strong className="text-white">Debug:</strong> Open DevTools → Network tab to see real API calls
                    </div>
                  </div>
                </div>
              </div>
            </EnhancedChatProvider>
          </ChatProvider>
        </MLSProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
