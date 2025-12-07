// src/app/components/mls/map/RegionNavigator.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, MapPin, Home, Building2, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface Region {
  id: string;
  name: string;
  slug: string;
  gradient: string;
}

interface City {
  _id: string;
  name: string;
  slug: string;
  listingCount?: number;
}

interface Subdivision {
  _id: string;
  name: string;
  slug: string;
  city: string;
  listingCount?: number;
}

type NavigationLevel = "region" | "county" | "city" | "subdivision";

interface Props {
  onSelectArea: (type: "city" | "subdivision", slug: string, name: string) => void;
}

const regions: Region[] = [
  {
    id: "socal",
    name: "Southern California",
    slug: "socal",
    gradient: "from-blue-500 to-purple-500",
  },
  {
    id: "central",
    name: "Central California",
    slug: "central",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "norcal",
    name: "Northern California",
    slug: "norcal",
    gradient: "from-orange-500 to-red-500",
  },
];

const counties: Record<string, Region[]> = {
  socal: [
    { id: "la", name: "Los Angeles", slug: "la", gradient: "from-purple-500 to-pink-500" },
    { id: "oc", name: "Orange", slug: "oc", gradient: "from-orange-500 to-red-500" },
    { id: "sd", name: "San Diego", slug: "sd", gradient: "from-yellow-500 to-orange-500" },
    { id: "riverside", name: "Riverside", slug: "riverside", gradient: "from-blue-500 to-cyan-500" },
    { id: "san-bern", name: "San Bernardino", slug: "san-bern", gradient: "from-green-500 to-emerald-500" },
    { id: "sb", name: "Ventura", slug: "sb", gradient: "from-indigo-500 to-purple-500" },
    { id: "imperial", name: "Imperial", slug: "imperial", gradient: "from-red-500 to-pink-500" },
    { id: "coachella", name: "Coachella Valley", slug: "coachella", gradient: "from-teal-500 to-blue-500" },
  ],
  central: [
    { id: "kern", name: "Kern", slug: "kern", gradient: "from-amber-500 to-orange-500" },
    { id: "fresno", name: "Fresno", slug: "fresno", gradient: "from-green-600 to-emerald-600" },
    { id: "monterey", name: "Monterey", slug: "monterey", gradient: "from-blue-600 to-cyan-600" },
  ],
  norcal: [
    { id: "sf", name: "San Francisco", slug: "sf", gradient: "from-red-600 to-orange-600" },
    { id: "alameda", name: "Alameda", slug: "alameda", gradient: "from-purple-600 to-pink-600" },
    { id: "santa-clara", name: "Santa Clara", slug: "santa-clara", gradient: "from-blue-600 to-indigo-600" },
  ],
};

export default function RegionNavigator({ onSelectArea }: Props) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [level, setLevel] = useState<NavigationLevel>("region");
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<Region | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false);

  // Breadcrumb navigation
  const breadcrumbs = [
    { label: "Regions", onClick: () => { setLevel("region"); setSelectedRegion(null); setSelectedCounty(null); setSelectedCity(null); } },
    selectedRegion && { label: selectedRegion.name, onClick: () => { setLevel("county"); setSelectedCounty(null); setSelectedCity(null); } },
    selectedCounty && { label: selectedCounty.name, onClick: () => { setLevel("city"); setSelectedCity(null); } },
    selectedCity && { label: selectedCity.name, onClick: () => setLevel("subdivision") },
  ].filter(Boolean);

  // Load cities when county is selected
  useEffect(() => {
    if (level === "city" && selectedCounty) {
      loadCities(selectedCounty.slug);
    }
  }, [level, selectedCounty]);

  // Load subdivisions when city is selected
  useEffect(() => {
    if (level === "subdivision" && selectedCity) {
      loadSubdivisions(selectedCity.slug);
    }
  }, [level, selectedCity]);

  const loadCities = async (countySlug: string) => {
    setLoadingCities(true);
    try {
      // For now, use hardcoded cities - replace with API call later
      // const res = await fetch(`/api/counties/${countySlug}/cities`);
      // const data = await res.json();
      // setCities(data.cities || []);

      // Mock data for testing
      setCities([
        { _id: "1", name: "Irvine", slug: "irvine", listingCount: 234 },
        { _id: "2", name: "Newport Beach", slug: "newport-beach", listingCount: 156 },
        { _id: "3", name: "Anaheim", slug: "anaheim", listingCount: 189 },
      ]);
    } catch (error) {
      console.error("Error loading cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadSubdivisions = async (citySlug: string) => {
    setLoadingSubdivisions(true);
    try {
      const res = await fetch(`/api/cities/${citySlug}/subdivisions`);
      if (res.ok) {
        const data = await res.json();
        setSubdivisions(data.subdivisions || []);
      }
    } catch (error) {
      console.error("Error loading subdivisions:", error);
    } finally {
      setLoadingSubdivisions(false);
    }
  };

  const themeClasses = {
    bg: isLight ? 'bg-white' : 'bg-gray-900',
    cardBg: isLight ? 'bg-white/90 border-gray-200' : 'bg-gray-800/60 border-gray-700',
    text: isLight ? 'text-gray-900' : 'text-white',
    textSecondary: isLight ? 'text-gray-600' : 'text-gray-400',
    hover: isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50',
    button: isLight
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-emerald-500 text-black hover:bg-emerald-400',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Navigation */}
      <div className={`p-4 border-b ${isLight ? 'border-gray-200 bg-gray-50' : 'border-gray-800 bg-gray-900/50'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {breadcrumbs.map((crumb: any, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              <button
                onClick={crumb.onClick}
                className={`text-sm font-medium transition ${
                  index === breadcrumbs.length - 1
                    ? isLight ? 'text-blue-600' : 'text-emerald-400'
                    : `${themeClasses.textSecondary} hover:${isLight ? 'text-blue-600' : 'text-emerald-400'}`
                }`}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {level === "region" && (
            <motion.div
              key="regions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {regions.map((region) => (
                <motion.button
                  key={region.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedRegion(region);
                    setLevel("county");
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${themeClasses.cardBg} ${themeClasses.hover}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${region.gradient} flex items-center justify-center`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${themeClasses.text}`}>{region.name}</h3>
                        <p className={`text-xs ${themeClasses.textSecondary}`}>Tap to explore counties</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${themeClasses.textSecondary}`} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {level === "county" && selectedRegion && (
            <motion.div
              key="counties"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {counties[selectedRegion.slug]?.map((county) => (
                <motion.button
                  key={county.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCounty(county);
                    setLevel("city");
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${themeClasses.cardBg} ${themeClasses.hover}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${county.gradient} flex items-center justify-center`}>
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${themeClasses.text}`}>{county.name}</h3>
                        <p className={`text-xs ${themeClasses.textSecondary}`}>Tap to explore cities</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${themeClasses.textSecondary}`} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {level === "city" && (
            <motion.div
              key="cities"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {loadingCities ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-6 h-6 animate-spin ${themeClasses.textSecondary}`} />
                </div>
              ) : (
                <>
                  {cities.map((city) => (
                    <motion.button
                      key={city._id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedCity(city);
                        setLevel("subdivision");
                      }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${themeClasses.cardBg} ${themeClasses.hover}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${isLight ? 'bg-blue-100' : 'bg-blue-900/50'} flex items-center justify-center`}>
                            <Home className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${themeClasses.text}`}>{city.name}</h3>
                            <p className={`text-xs ${themeClasses.textSecondary}`}>
                              {city.listingCount ? `${city.listingCount} properties` : 'View subdivisions'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${themeClasses.textSecondary}`} />
                      </div>
                    </motion.button>
                  ))}
                  {/* View All City Properties Button */}
                  {selectedCity && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => onSelectArea("city", selectedCity.slug, selectedCity.name)}
                      className={`w-full p-4 rounded-xl font-semibold transition-all ${themeClasses.button}`}
                    >
                      View All Properties in {selectedCity.name}
                    </motion.button>
                  )}
                </>
              )}
            </motion.div>
          )}

          {level === "subdivision" && selectedCity && (
            <motion.div
              key="subdivisions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {loadingSubdivisions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-6 h-6 animate-spin ${themeClasses.textSecondary}`} />
                </div>
              ) : (
                <>
                  {/* View All City Properties Button (at top) */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => onSelectArea("city", selectedCity.slug, selectedCity.name)}
                    className={`w-full p-4 rounded-xl font-semibold transition-all ${themeClasses.button}`}
                  >
                    View All Properties in {selectedCity.name}
                  </motion.button>

                  {/* Subdivisions List */}
                  {subdivisions.length > 0 ? (
                    <>
                      <p className={`text-sm font-medium ${themeClasses.textSecondary} px-1`}>Or choose a subdivision:</p>
                      {subdivisions.map((subdivision) => (
                        <motion.button
                          key={subdivision._id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onSelectArea("subdivision", subdivision.slug, subdivision.name)}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${themeClasses.cardBg} ${themeClasses.hover}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className={`font-semibold ${themeClasses.text}`}>{subdivision.name}</h3>
                              <p className={`text-xs ${themeClasses.textSecondary}`}>
                                {subdivision.listingCount ? `${subdivision.listingCount} properties` : 'View properties'}
                              </p>
                            </div>
                            <ChevronRight className={`w-5 h-5 ${themeClasses.textSecondary}`} />
                          </div>
                        </motion.button>
                      ))}
                    </>
                  ) : (
                    <p className={`text-sm text-center py-8 ${themeClasses.textSecondary}`}>
                      No subdivisions available. View all city properties instead.
                    </p>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
