// src/app/testy/page.tsx
// Simplified test page to avoid hydration errors

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import IntegratedChatWidget from "@/app/components/chatwidget/IntegratedChatWidget";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { EnhancedChatProvider } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { FileText } from "lucide-react";

// Chat Components
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";

// CMA Components
import InvestmentMetricsDashboard from "@/app/components/cma/InvestmentMetricsDashboard";
import CMADisplay from "@/app/components/chat/CMADisplay";
import { generateClientCMA, type CMAResult } from "@/lib/cma-calculator";

export const dynamic = 'force-dynamic';

function TestyPageContent() {
  const [activeTest, setActiveTest] = useState<string>("chat-subdivision");
  const [mounted, setMounted] = useState(false);

  // API CMA data
  const [cmaApiData, setCmaApiData] = useState<any | null>(null);
  const [cmaApiLoading, setCmaApiLoading] = useState(false);

  // Listings data
  const [subdivisionListings, setSubdivisionListings] = useState<Listing[]>([]);
  const [cityListings, setCityListings] = useState<Listing[]>([]);
  const [chatLoading, setChatLoading] = useState(true);

  // State for selected properties for CMA generation
  const [selectedSubdivisionListings, setSelectedSubdivisionListings] = useState<Listing[]>([]);
  const [selectedCityListings, setSelectedCityListings] = useState<Listing[]>([]);
  const [generatingCMA, setGeneratingCMA] = useState(false);
  const [generatedCMA, setGeneratedCMA] = useState<CMAResult | null>(null);

  // Avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle INSTANT CMA generation for selected properties (client-side only)
  const handleGenerateCMA = (selectedListings: Listing[]) => {
    if (selectedListings.length === 0) {
      alert("Please select at least one property to generate a CMA.");
      return;
    }

    setGeneratingCMA(true);
    setGeneratedCMA(null);

    setTimeout(() => {
      const cmaResult = generateClientCMA(selectedListings);
      setGeneratedCMA(cmaResult);
      setGeneratingCMA(false);
      console.log("Generated Instant CMA:", cmaResult);
    }, 100);
  };

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
      id: "cma-api",
      name: "CMA API (Real Investment Analysis)",
      description: "Full CMA from /api/ai/cma with investment metrics"
    },
  ];

  // Fetch CMA from REAL API endpoint
  useEffect(() => {
    async function fetchCMAFromAPI() {
      try {
        setCmaApiLoading(true);

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

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Testy Page - Clean API-Only Tests
          </h1>
          <p className="text-gray-400">
            Testing chat widgets with live API calls (NO static/mock data)
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
                  <div className="mb-6 flex justify-end">
                    <div className="max-w-[80%] px-4 py-3 rounded-lg bg-blue-600 text-white">
                      <p className="text-sm font-medium">Show me homes in Palm Desert Country Club</p>
                    </div>
                  </div>

                  <div className="mb-6 flex justify-start">
                    <div className="max-w-[80%] px-4 py-3 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
                      <p className="text-sm">
                        I found {subdivisionListings.length} beautiful properties in Palm Desert Country Club.
                        This community is known for its golf course access and resort-style amenities.
                        Let me show you what's available!
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="w-full">
                      <ListingCarousel
                        listings={subdivisionListings}
                        title={`${subdivisionListings.length} properties in Palm Desert Country Club`}
                        onSelectionChange={setSelectedSubdivisionListings}
                        selectedListings={selectedSubdivisionListings}
                      />

                      {selectedSubdivisionListings.length > 0 && (
                        <div className="mt-4 flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-200">
                              {selectedSubdivisionListings.length} {selectedSubdivisionListings.length === 1 ? 'property' : 'properties'} selected
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Generate a Comparative Market Analysis for the selected properties
                            </p>
                          </div>
                          <button
                            onClick={() => handleGenerateCMA(selectedSubdivisionListings)}
                            disabled={generatingCMA}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FileText className="w-5 h-5" />
                            <span>{generatingCMA ? 'Generating...' : 'Generate CMA'}</span>
                          </button>
                        </div>
                      )}

                      {generatedCMA && (
                        <div className="mt-6 flex justify-start">
                          <div className="w-full">
                            <CMADisplay cmaData={generatedCMA} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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
                  <div className="mb-6 flex justify-end">
                    <div className="max-w-[80%] px-4 py-3 rounded-lg bg-blue-600 text-white">
                      <p className="text-sm font-medium">Show me homes in La Quinta</p>
                    </div>
                  </div>

                  <div className="mb-6 flex justify-start">
                    <div className="max-w-[80%] px-4 py-3 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
                      <p className="text-sm">
                        I found {cityListings.length} fantastic homes in La Quinta!
                        La Quinta offers stunning mountain views, world-class golf courses, and a family-friendly atmosphere.
                        Here are some great options for you:
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="w-full">
                      <ListingCarousel
                        listings={cityListings}
                        title={`${cityListings.length} properties in La Quinta`}
                        onSelectionChange={setSelectedCityListings}
                        selectedListings={selectedCityListings}
                      />

                      {selectedCityListings.length > 0 && (
                        <div className="mt-4 flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-200">
                              {selectedCityListings.length} {selectedCityListings.length === 1 ? 'property' : 'properties'} selected
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Generate a Comparative Market Analysis for the selected properties
                            </p>
                          </div>
                          <button
                            onClick={() => handleGenerateCMA(selectedCityListings)}
                            disabled={generatingCMA}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FileText className="w-5 h-5" />
                            <span>{generatingCMA ? 'Generating...' : 'Generate CMA'}</span>
                          </button>
                        </div>
                      )}

                      {generatedCMA && (
                        <div className="mt-6 flex justify-start">
                          <div className="w-full">
                            <CMADisplay cmaData={generatedCMA} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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

        {/* CMA API Test */}
        {activeTest === "cma-api" && (
          <div className="container mx-auto px-6 py-8 overflow-y-auto h-full">
            {cmaApiLoading ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-400">Loading CMA from /api/ai/cma...</p>
                <p className="text-sm text-gray-500 mt-2">Running investment analysis calculations</p>
              </div>
            ) : cmaApiData ? (
              <div className="space-y-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-2xl font-bold mb-2">CMA from Real API</h2>
                  <p className="text-gray-400">
                    Full Comparative Market Analysis with investment calculations
                  </p>
                  <p className="text-sm text-emerald-400 mt-2">
                    Data source: /api/ai/cma (POST)
                  </p>
                </div>

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
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-red-400">Failed to load CMA from API</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-6 py-4">
          <div className="text-sm text-gray-400">
            <strong className="text-white">API Routes:</strong> /api/chat (Groq AI) | /api/ai/cma (Investment Analysis)
            <span className="mx-2">•</span>
            <strong className="text-white">Debug:</strong> Open DevTools → Network tab to see real API calls
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestyPage() {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>}>
          <MLSProvider>
            <ChatProvider>
              <EnhancedChatProvider>
                <TestyPageContent />
              </EnhancedChatProvider>
            </ChatProvider>
          </MLSProvider>
        </Suspense>
      </ThemeProvider>
    </SessionProvider>
  );
}
