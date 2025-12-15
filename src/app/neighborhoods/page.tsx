"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Globe, Building2, MapPin, Home, DollarSign, TrendingUp, Percent } from "lucide-react";

// Region-based data structure
interface Subdivision {
  name: string;
  slug: string;
  listings: number;
}

interface City {
  name: string;
  slug: string;
  listings: number;
  subdivisions: Subdivision[];
}

interface County {
  name: string;
  slug: string;
  listings: number;
  cities: City[];
}

interface Region {
  name: string;
  slug: string;
  listings: number;
  counties: County[];
}

export default function NeighborhoodsPage() {
  const router = useRouter();
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    shadow,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedCounties, setExpandedCounties] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [neighborhoodsData, setNeighborhoodsData] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avgPropertyTax, setAvgPropertyTax] = useState<number>(1.15); // Default CA average

  // Fetch neighborhoods data from API
  useEffect(() => {
    async function fetchNeighborhoods() {
      try {
        setLoading(true);
        const response = await fetch('/api/neighborhoods/directory');
        const result = await response.json();

        if (result.success) {
          setNeighborhoodsData(result.data);
        } else {
          setError(result.error || 'Failed to load neighborhoods');
        }
      } catch (err: any) {
        console.error('Error fetching neighborhoods:', err);
        setError('Failed to load neighborhoods data');
      } finally {
        setLoading(false);
      }
    }

    fetchNeighborhoods();
  }, []);

  // Fetch average property tax rate for California
  useEffect(() => {
    async function fetchAvgPropertyTax() {
      try {
        // Fetch property tax data from major CA counties
        const majorCounties = ['Los Angeles', 'San Diego', 'Orange', 'Riverside', 'San Bernardino'];
        const taxRates: number[] = [];

        for (const county of majorCounties) {
          try {
            const response = await fetch(`/api/analytics/market-stats?county=${encodeURIComponent(county)}&stats=tax`);
            if (response.ok) {
              const data = await response.json();
              if (data.propertyTax?.averageRate) {
                taxRates.push(data.propertyTax.averageRate);
              }
            }
          } catch (err) {
            console.error(`Error fetching tax rate for ${county}:`, err);
          }
        }

        // Calculate average if we got any data
        if (taxRates.length > 0) {
          const avg = taxRates.reduce((sum, rate) => sum + rate, 0) / taxRates.length;
          setAvgPropertyTax(avg);
        }
      } catch (error) {
        console.error('Error fetching average property tax:', error);
        // Keep default of 1.15%
      }
    }

    fetchAvgPropertyTax();
  }, []);

  const toggleRegion = (slug: string) => {
    const newSet = new Set(expandedRegions);
    if (newSet.has(slug)) {
      newSet.delete(slug);
    } else {
      newSet.add(slug);
    }
    setExpandedRegions(newSet);
  };

  const toggleCounty = (slug: string) => {
    const newSet = new Set(expandedCounties);
    if (newSet.has(slug)) {
      newSet.delete(slug);
    } else {
      newSet.add(slug);
    }
    setExpandedCounties(newSet);
  };

  const toggleCity = (slug: string) => {
    const newSet = new Set(expandedCities);
    if (newSet.has(slug)) {
      newSet.delete(slug);
    } else {
      newSet.add(slug);
    }
    setExpandedCities(newSet);
  };

  const handleNavigation = (type: 'region' | 'county' | 'city' | 'subdivision', slug: string) => {
    router.push(`/neighborhoods/${slug}`);
  };

  // Filter out "Other" region (database inconsistencies)
  const filteredData = neighborhoodsData.filter(region => region.name !== 'Other');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 md:pt-12 px-4">
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid ${isLight ? 'border-blue-600 border-t-transparent' : 'border-blue-400 border-t-transparent'}`}></div>
          <p className={`mt-4 text-lg ${textSecondary}`}>Loading neighborhoods...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 md:pt-12 px-4">
        <div className="text-center">
          <p className={`text-xl ${textPrimary} mb-2`}>Failed to load neighborhoods</p>
          <p className={`${textSecondary}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`mt-4 px-6 py-2 rounded-lg ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4" data-page="neighborhoods-directory">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-3`}>
            California Real Estate Markets
          </h1>
          <p className={`text-lg ${textSecondary}`}>
            Explore neighborhoods across California's diverse regions and communities
          </p>
        </motion.div>

        {/* Market Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Active Listings Card */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} hover:shadow-xl transition-shadow`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                <Building2 className={`w-10 h-10 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
            </div>
            <div className={`text-4xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'} mb-2`}>
              {filteredData.reduce((sum, r) => sum + r.listings, 0).toLocaleString()}
            </div>
            <div className={`text-base font-semibold ${textPrimary} mb-1`}>Active Listings</div>
            <div className={`text-sm ${textMuted}`}>
              Across {filteredData.length} regions
            </div>
          </div>

          {/* Property Tax Rate Card */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} hover:shadow-xl transition-shadow`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${isLight ? 'bg-emerald-100' : 'bg-emerald-900/30'}`}>
                <Percent className={`w-10 h-10 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              </div>
            </div>
            <div className={`text-4xl font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'} mb-2`}>
              {avgPropertyTax.toFixed(2)}%
            </div>
            <div className={`text-base font-semibold ${textPrimary} mb-1`}>CA Property Tax</div>
            <div className={`text-sm ${textMuted}`}>
              Average effective rate
            </div>
          </div>

          {/* Markets Covered Card */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} hover:shadow-xl transition-shadow`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'}`}>
                <MapPin className={`w-10 h-10 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              </div>
            </div>
            <div className={`text-4xl font-bold ${isLight ? 'text-purple-600' : 'text-purple-400'} mb-2`}>
              {filteredData.reduce((sum, region) => sum + region.counties.reduce((s, county) => s + county.cities.length, 0), 0)}
            </div>
            <div className={`text-base font-semibold ${textPrimary} mb-1`}>Cities Covered</div>
            <div className={`text-sm ${textMuted}`}>
              Statewide coverage
            </div>
          </div>

          {/* Market Appreciation Card */}
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} hover:shadow-xl transition-shadow`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${isLight ? 'bg-indigo-100' : 'bg-indigo-900/30'}`}>
                <TrendingUp className={`w-10 h-10 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              </div>
            </div>
            <div className={`text-4xl font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'} mb-2`}>
              {filteredData.reduce((sum, region) => sum + region.counties.length, 0)}
            </div>
            <div className={`text-base font-semibold ${textPrimary} mb-1`}>Counties</div>
            <div className={`text-sm ${textMuted}`}>
              Diverse markets
            </div>
          </div>
        </motion.div>

        {/* Directory List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {filteredData.map((region, regionIndex) => (
            <div
              key={region.slug}
              className={`rounded-2xl overflow-hidden transition-all duration-200 ${cardBg} ${cardBorder} border ${shadow} hover:shadow-2xl`}
            >
              {/* Region Header */}
              <button
                onClick={() => toggleRegion(region.slug)}
                className={`w-full px-6 py-6 flex items-center justify-between transition-colors ${
                  isLight ? 'hover:bg-gray-50/50' : 'hover:bg-gray-700/30'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-xl ${isLight ? 'bg-indigo-100' : 'bg-indigo-900/30'}`}>
                    <Globe className={`w-8 h-8 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                  </div>
                  <div className="text-left">
                    <h2 className={`text-2xl font-bold ${textPrimary} mb-1`}>
                      {region.name}
                    </h2>
                    <p className={`text-sm ${textMuted}`}>
                      {region.listings.toLocaleString()} active listings • {region.counties.length} counties
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {expandedRegions.has(region.slug) ? (
                    <ChevronDownIcon className={`w-6 h-6 ${textSecondary}`} />
                  ) : (
                    <ChevronRightIcon className={`w-6 h-6 ${textSecondary}`} />
                  )}
                </div>
              </button>

              {/* Counties List */}
              <AnimatePresence>
                {expandedRegions.has(region.slug) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}
                  >
                    {region.counties.map((county, countyIndex) => (
                      <div
                        key={county.slug}
                        className={`${countyIndex > 0 && 'border-t'} ${isLight ? 'border-gray-100' : 'border-gray-750'}`}
                      >
                        {/* County Header */}
                        <button
                          onClick={() => toggleCounty(county.slug)}
                          className={`w-full px-6 py-5 pl-16 flex items-center justify-between transition-colors ${
                            isLight ? 'hover:bg-blue-50/50' : 'hover:bg-blue-900/10'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                              <Building2 className={`w-7 h-7 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                            </div>
                            <div className="text-left">
                              <h3 className={`text-xl font-bold ${textPrimary}`}>
                                {county.name}
                              </h3>
                              <p className={`text-sm ${textMuted}`}>
                                {county.listings.toLocaleString()} active listings • {county.cities.length} cities
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigation('county', county.slug);
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                isLight
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                              }`}
                            >
                              View Listings
                            </button>
                            {expandedCounties.has(county.slug) ? (
                              <ChevronDownIcon className={`w-5 h-5 ${textSecondary}`} />
                            ) : (
                              <ChevronRightIcon className={`w-5 h-5 ${textSecondary}`} />
                            )}
                          </div>
                        </button>

                        {/* Cities List */}
                        <AnimatePresence>
                          {expandedCounties.has(county.slug) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`border-t ${isLight ? 'border-gray-100' : 'border-gray-750'}`}
                            >
                              {county.cities.map((city, cityIndex) => (
                                <div key={city.slug} className={`${cityIndex > 0 && 'border-t'} ${isLight ? 'border-gray-50' : 'border-gray-800'}`}>
                                  {/* City Header */}
                                  <button
                                    onClick={() => toggleCity(city.slug)}
                                    className={`w-full px-6 py-4 pl-24 flex items-center justify-between transition-colors ${
                                      isLight ? 'hover:bg-emerald-50/50' : 'hover:bg-emerald-900/10'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${isLight ? 'bg-emerald-100' : 'bg-emerald-900/30'}`}>
                                        <MapPin className={`w-6 h-6 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                                      </div>
                                      <div className="text-left">
                                        <h3 className={`text-lg font-semibold ${textPrimary}`}>
                                          {city.name}
                                        </h3>
                                        <p className={`text-sm ${textSecondary}`}>
                                          {city.listings.toLocaleString()} listings
                                          {city.subdivisions.length > 0 && ` • ${city.subdivisions.length} subdivisions`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleNavigation('city', city.slug);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                          isLight
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                            : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50'
                                        }`}
                                      >
                                        View
                                      </button>
                                      {city.subdivisions.length > 0 && (
                                        expandedCities.has(city.slug) ? (
                                          <ChevronDownIcon className={`w-4 h-4 ${textSecondary}`} />
                                        ) : (
                                          <ChevronRightIcon className={`w-4 h-4 ${textSecondary}`} />
                                        )
                                      )}
                                    </div>
                                  </button>

                                  {/* Subdivisions List */}
                                  <AnimatePresence>
                                    {expandedCities.has(city.slug) && city.subdivisions.length > 0 && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`border-t ${isLight ? 'border-gray-50' : 'border-gray-800'}`}
                                      >
                                        {city.subdivisions.map((subdivision, subIndex) => (
                                          <button
                                            key={subdivision.slug}
                                            onClick={() => handleNavigation('subdivision', subdivision.slug)}
                                            className={`w-full px-6 py-3 pl-36 flex items-center justify-between transition-colors ${
                                              isLight ? 'hover:bg-purple-50' : 'hover:bg-gray-800/50'
                                            } ${subIndex > 0 && 'border-t'} ${isLight ? 'border-gray-50' : 'border-gray-800'}`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className={`p-1.5 rounded-md ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'}`}>
                                                <Home className={`w-5 h-5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                                              </div>
                                              <div className="text-left">
                                                <h4 className={`text-base font-medium ${textPrimary}`}>
                                                  {subdivision.name}
                                                </h4>
                                                <p className={`text-xs ${textSecondary}`}>
                                                  {subdivision.listings} listings
                                                </p>
                                              </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                              isLight
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-purple-900/50 text-purple-300'
                                            }`}>
                                              View
                                            </div>
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        {/* No Results */}
        {filteredData.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-16 ${textSecondary}`}
          >
            <p className="text-xl mb-2">No neighborhoods found</p>
            <p className="text-sm">Try a different search term</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
