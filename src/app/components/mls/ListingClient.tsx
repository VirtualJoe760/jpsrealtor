// src/app/components/mls/ListingClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Phone, MapPinned, Share2, Bed, Bath, Square, TreePine, DollarSign, Calendar as CalendarIcon, Home as HomeIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";

import CollageHero from "@/app/components/mls/CollageHero";
import MortgageCalculator from "@/app/components/mls/map/MortgageCalculator";
import ListingAttribution from "@/app/components/mls/ListingAttribution";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import type { IListing } from "@/models/listings";

function calculateDaysOnMarket(dateString?: string | Date) {
  if (!dateString) return null;
  const listedDate = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - listedDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Map property type codes to human-readable names
function getPropertyTypeLabel(code?: string): string {
  if (!code) return "";

  const mapping: Record<string, string> = {
    'A': 'Residential',
    'B': 'Residential Lease',
    'C': 'Residential Income',
    'D': 'Land',
    'E': 'Manufactured In Park',
    'F': 'Commercial Sale',
    'G': 'Commercial Lease',
    'H': 'Business Opportunity',
    'I': 'Vacation Rental',
  };

  return mapping[code.toUpperCase()] || code;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function ListingClient({
  listing,
  media,
  address,
}: {
  listing: IListing;
  media: {
    type: "photo";
    src: string;
    alt: string;
  }[];
  address: string;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [copied, setCopied] = useState(false);
  const daysOnMarket = calculateDaysOnMarket(listing.listingContractDate);

  // Generate subdivision URL
  const getSubdivisionUrl = () => {
    if (!listing.subdivisionName || !listing.city) return null;

    // Filter out non-applicable subdivisions
    const nonApplicableValues = ['not applicable', 'n/a', 'none', 'other', 'na', 'no hoa'];
    const lowerSubdivision = listing.subdivisionName.toLowerCase().trim();
    if (nonApplicableValues.some(val => lowerSubdivision.includes(val))) {
      return null;
    }

    // Import the findCityByName function to get the proper cityId
    const { findCityByName } = require('@/app/constants/counties');

    const cityData = findCityByName(listing.city);
    if (!cityData) return null;

    // Use the city's ID from the counties constant
    const cityId = cityData.city.id;

    // Create subdivision slug from name - this should match the database slug
    const subdivisionSlug = listing.subdivisionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `/neighborhoods/${cityId}/${subdivisionSlug}`;
  };

  const subdivisionUrl = getSubdivisionUrl();

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="w-full">
          <CollageHero media={media} />
        </div>

        {/* Main Content with Panels */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-4 py-8 space-y-6"
        >
          {/* Header Panel - Price & Address */}
          <motion.div
            variants={itemVariants}
            className={`backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl ${
              isLight
                ? 'bg-white/80 border-2 border-gray-300'
                : 'bg-black/40 border border-neutral-800/50'
            }`}
            style={isLight ? {
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
            } : undefined}
          >
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              {/* Left - Address & Info */}
              <div className="flex-1">
                <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  {address}
                </h1>
                <div className={`flex flex-wrap items-center gap-3 text-sm mb-4 ${
                  isLight ? 'text-gray-600' : 'text-neutral-400'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <HomeIcon className="w-4 h-4" />
                    MLS# {listing.listingId}
                  </span>
                  <span>•</span>
                  <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                  <span>•</span>
                  <span>{listing.propertySubType || "Unknown Subtype"}</span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      listing.standardStatus === "Active"
                        ? isLight
                          ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isLight
                          ? "bg-gray-200 text-gray-700 border-2 border-gray-300"
                          : "bg-neutral-700/50 text-neutral-300 border border-neutral-600/30"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${listing.standardStatus === "Active"
                      ? isLight ? "bg-emerald-600 animate-pulse" : "bg-emerald-400 animate-pulse"
                      : isLight ? "bg-gray-600" : "bg-neutral-400"
                    }`} />
                    {listing.standardStatus}
                  </span>
                  {daysOnMarket !== null && (
                    <span className={`flex items-center gap-1.5 text-sm ${
                      isLight ? 'text-gray-600' : 'text-neutral-400'
                    }`}>
                      <CalendarIcon className="w-4 h-4" />
                      {daysOnMarket} days on market
                    </span>
                  )}
                </div>
              </div>

              {/* Right - Price */}
              <div className="text-right lg:text-right">
                <div className={`text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text mb-2 ${
                  isLight
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                    : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                }`}>
                  ${listing.listPrice?.toLocaleString()}
                  {listing.propertyType?.toLowerCase().includes("lease") && (
                    <span className="text-3xl md:text-4xl">/mo</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
              {(listing.bedroomsTotal !== undefined || listing.bedsTotal !== undefined) && (
                <div className={`flex items-center gap-3 rounded-xl p-3 ${
                  isLight
                    ? 'bg-emerald-50 border-2 border-emerald-200'
                    : 'bg-neutral-900/50 border border-neutral-700/30'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-emerald-100' : 'bg-emerald-500/10'
                  }`}>
                    <Bed className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.bedroomsTotal || listing.bedsTotal}</div>
                    <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Beds</div>
                  </div>
                </div>
              )}

              {listing.bathroomsTotalInteger !== undefined && (
                <div className={`flex items-center gap-3 rounded-xl p-3 ${
                  isLight
                    ? 'bg-cyan-50 border-2 border-cyan-200'
                    : 'bg-neutral-900/50 border border-neutral-700/30'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-cyan-100' : 'bg-cyan-500/10'
                  }`}>
                    <Bath className={`w-5 h-5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.bathroomsTotalInteger}</div>
                    <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Baths</div>
                  </div>
                </div>
              )}

              {listing.livingArea !== undefined && (
                <div className={`flex items-center gap-3 rounded-xl p-3 ${
                  isLight
                    ? 'bg-purple-50 border-2 border-purple-200'
                    : 'bg-neutral-900/50 border border-neutral-700/30'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-purple-100' : 'bg-purple-500/10'
                  }`}>
                    <Square className={`w-5 h-5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.livingArea.toLocaleString()}</div>
                    <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Sq Ft</div>
                  </div>
                </div>
              )}

              {listing.lotSizeArea !== undefined && (
                <div className={`flex items-center gap-3 rounded-xl p-3 ${
                  isLight
                    ? 'bg-green-50 border-2 border-green-200'
                    : 'bg-neutral-900/50 border border-neutral-700/30'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-green-100' : 'bg-green-500/10'
                  }`}>
                    <TreePine className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{Math.round(listing.lotSizeArea).toLocaleString()}</div>
                    <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Lot Sq Ft</div>
                  </div>
                </div>
              )}

              {typeof listing.associationFee === "number" && listing.associationFee > 0 && (
                <div className={`flex items-center gap-3 rounded-xl p-3 ${
                  isLight
                    ? 'bg-orange-50 border-2 border-orange-200'
                    : 'bg-neutral-900/50 border border-neutral-700/30'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-orange-100' : 'bg-orange-500/10'
                  }`}>
                    <DollarSign className={`w-5 h-5 ${isLight ? 'text-orange-600' : 'text-orange-400'}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>${listing.associationFee.toLocaleString()}</div>
                    <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>HOA/mo</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Link
                href="/book-appointment"
                className={`flex items-center justify-center gap-2 h-12 rounded-xl font-semibold transition-all shadow-lg ${
                  isLight
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white hover:shadow-blue-500/50'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black hover:shadow-emerald-500/50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="hidden sm:inline">Schedule</span>
              </Link>

              <a
                href="tel:7603333676"
                className={`flex items-center justify-center gap-2 h-12 rounded-xl font-semibold transition-all ${
                  isLight
                    ? 'border-2 border-gray-300 bg-white/60 hover:bg-white text-gray-900'
                    : 'border border-neutral-600 bg-neutral-900/50 hover:bg-neutral-800/50 text-white'
                }`}
              >
                <Phone className="w-5 h-5" />
                <span className="hidden sm:inline">Call</span>
              </a>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 h-12 rounded-xl font-semibold transition-all ${
                  isLight
                    ? 'border-2 border-gray-300 bg-white/60 hover:bg-white text-gray-900'
                    : 'border border-neutral-600 bg-neutral-900/50 hover:bg-neutral-800/50 text-white'
                }`}
              >
                <MapPinned className="w-5 h-5" />
                <span className="hidden sm:inline">Directions</span>
              </a>

              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`flex items-center justify-center gap-2 h-12 rounded-xl font-semibold transition-all relative ${
                  isLight
                    ? 'border-2 border-gray-300 bg-white/60 hover:bg-white text-gray-900'
                    : 'border border-neutral-600 bg-neutral-900/50 hover:bg-neutral-800/50 text-white'
                }`}
              >
                <Share2 className="w-5 h-5" />
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Description & Features */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description Panel */}
              {listing.publicRemarks && (
                <motion.div
                  variants={itemVariants}
                  className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl ${
                    isLight
                      ? 'bg-white/80 border-2 border-gray-300'
                      : 'bg-black/40 border border-neutral-800/50'
                  }`}
                  style={isLight ? {
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  } : undefined}
                >
                  <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}>
                    <div className={`w-1 h-6 rounded-full ${
                      isLight
                        ? 'bg-gradient-to-b from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-b from-emerald-400 to-cyan-400'
                    }`} />
                    Property Description
                  </h2>
                  <p className={`text-lg leading-relaxed whitespace-pre-line ${
                    isLight ? 'text-gray-700' : 'text-neutral-300'
                  }`}>
                    {listing.publicRemarks}
                  </p>
                </motion.div>
              )}

              {/* Features Panel */}
              <motion.div
                variants={itemVariants}
                className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl ${
                  isLight
                    ? 'bg-white/80 border-2 border-gray-300'
                    : 'bg-black/40 border border-neutral-800/50'
                }`}
                style={isLight ? {
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                } : undefined}
              >
                <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  <div className={`w-1 h-6 rounded-full ${
                    isLight
                      ? 'bg-gradient-to-b from-purple-500 to-pink-500'
                      : 'bg-gradient-to-b from-purple-400 to-pink-400'
                  }`} />
                  Features & Amenities
                </h2>

                <div className="flex flex-wrap gap-2">
                  {listing.subdivisionName && listing.subdivisionName.toLowerCase() !== "other" && (
                    subdivisionUrl ? (
                      <Link
                        href={subdivisionUrl}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/50'
                        }`}
                      >
                        {listing.subdivisionName}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {listing.subdivisionName}
                      </span>
                    )
                  )}
                  {listing.landType && (
                    <span className={`px-4 py-2 rounded-full text-sm ${
                      isLight
                        ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
                        : 'bg-neutral-800/70 text-white border border-neutral-700/30'
                    }`}>
                      {listing.landType}
                    </span>
                  )}
                  {listing.terms && listing.terms.length > 0 && (
                    <span className={`px-4 py-2 rounded-full text-sm ${
                      isLight
                        ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
                        : 'bg-neutral-800/70 text-white border border-neutral-700/30'
                    }`}>
                      {listing.terms.join(", ")}
                    </span>
                  )}
                  {listing.yearBuilt && (
                    <span className={`px-4 py-2 rounded-full text-sm ${
                      isLight
                        ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
                        : 'bg-neutral-800/70 text-white border border-neutral-700/30'
                    }`}>
                      Built {listing.yearBuilt}
                    </span>
                  )}
                  {listing.poolYn && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      isLight
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      🏊 Pool
                    </span>
                  )}
                  {listing.spaYn && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      isLight
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      🧖 Spa
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Property Details Panel */}
              <motion.div
                variants={itemVariants}
                className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl ${
                  isLight
                    ? 'bg-white/80 border-2 border-gray-300'
                    : 'bg-black/40 border border-neutral-800/50'
                }`}
                style={isLight ? {
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                } : undefined}
              >
                <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  <div className={`w-1 h-6 rounded-full ${
                    isLight
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-500'
                      : 'bg-gradient-to-b from-cyan-400 to-blue-400'
                  }`} />
                  Property Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listing.subdivisionName && (
                    <div className={`rounded-xl p-4 ${
                      isLight
                        ? 'bg-gray-50 border-2 border-gray-200'
                        : 'bg-neutral-900/30 border border-neutral-700/20'
                    }`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Subdivision</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.subdivisionName}</div>
                    </div>
                  )}
                  {listing.landType && (
                    <div className={`rounded-xl p-4 ${
                      isLight
                        ? 'bg-gray-50 border-2 border-gray-200'
                        : 'bg-neutral-900/30 border border-neutral-700/20'
                    }`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Land Type</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.landType}</div>
                    </div>
                  )}
                  {listing.yearBuilt && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Year Built</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.yearBuilt}</div>
                    </div>
                  )}
                  {listing.propertyType && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Property Type</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{getPropertyTypeLabel(listing.propertyType)}</div>
                    </div>
                  )}
                  {listing.propertySubType && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Property Subtype</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.propertySubType}</div>
                    </div>
                  )}
                  {listing.stories !== undefined && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Stories</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.stories}</div>
                    </div>
                  )}
                  {listing.parkingTotal !== undefined && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Parking Spaces</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.parkingTotal}</div>
                    </div>
                  )}
                  {listing.garageSpaces !== undefined && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Garage Spaces</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.garageSpaces}</div>
                    </div>
                  )}
                  {listing.heating && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Heating</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.heating}</div>
                    </div>
                  )}
                  {listing.cooling && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Cooling</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.cooling}</div>
                    </div>
                  )}
                  {listing.view && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>View</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.view}</div>
                    </div>
                  )}
                  {listing.flooring && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Flooring</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.flooring}</div>
                    </div>
                  )}
                  {listing.roof && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Roof</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.roof}</div>
                    </div>
                  )}
                  {listing.city && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>City</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.city}</div>
                    </div>
                  )}
                  {listing.postalCode && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Zip Code</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.postalCode}</div>
                    </div>
                  )}
                  {listing.countyOrParish && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-gray-50 border-2 border-gray-200' : 'bg-neutral-900/30 border border-neutral-700/20'}`}>
                      <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>County</div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{listing.countyOrParish}</div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Attribution Panel */}
              <motion.div
                variants={itemVariants}
                className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl ${
                  isLight
                    ? 'bg-white/80 border-2 border-gray-300'
                    : 'bg-black/40 border border-neutral-800/50'
                }`}
                style={isLight ? {
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                } : undefined}
              >
                <ListingAttribution
                  listing={listing}
                  className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}
                />
              </motion.div>
            </div>

            {/* Right Column - Mortgage Calculator */}
            <div className="space-y-6">
              <motion.div
                variants={itemVariants}
                className={`backdrop-blur-xl rounded-2xl p-6 shadow-2xl sticky top-6 ${
                  isLight
                    ? 'bg-white/80 border-2 border-gray-300'
                    : 'bg-black/40 border border-neutral-800/50'
                }`}
                style={isLight ? {
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                } : undefined}
              >
                <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  <div className={`w-1 h-6 rounded-full ${
                    isLight
                      ? 'bg-gradient-to-b from-green-500 to-emerald-500'
                      : 'bg-gradient-to-b from-green-400 to-emerald-400'
                  }`} />
                  Mortgage Calculator
                </h2>
                <MortgageCalculator
                  price={listing.listPrice || 500000}
                  downPayment={listing.listPrice ? Math.round(listing.listPrice * 0.20) : 100000}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </SpaticalBackground>
  );
}
